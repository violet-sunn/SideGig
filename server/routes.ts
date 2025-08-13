import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin, isModerator } from "./replitAuth";
import { setupWebSocketServer, NotificationService } from "./notifications";
import { z } from "zod";
import {
  insertTaskSchema,
  insertDraftTaskSchema,
  insertBidSchema,
  insertMessageSchema,
  insertReviewSchema,
  insertDisputeSchema,
} from "@shared/schema";
import { ImpersonationSecurityGuard } from "./security/impersonation-guard";

// Development middleware for user impersonation
function getEffectiveUserId(req: any): string {
  // Use security guard to check impersonation
  const impersonateId = ImpersonationSecurityGuard.getImpersonationId(req);
  
  if (impersonateId) {
    ImpersonationSecurityGuard.auditImpersonation(impersonateId, req.user?.claims?.sub);
    console.log("Debug: USING IMPERSONATED USER ID:", impersonateId);
    return impersonateId;
  }
  
  console.log("Debug: Using real user ID:", req.user.claims.sub);
  return req.user.claims.sub;
}

// Development auth bypass middleware
// SECURITY: Only active in NODE_ENV=development
function devAuthBypass(req: any, res: any, next: any) {
  // Use security guard to check impersonation
  const impersonateId = ImpersonationSecurityGuard.getImpersonationId(req);
  
  if (impersonateId) {
    // Create fake user object for development testing only
    req.user = {
      claims: {
        sub: impersonateId
      }
    };
    return next();
  }
  
  // In production or when no impersonation, use real authentication
  return isAuthenticated(req, res, next);
}

// Hybrid auth middleware - works with both real auth and impersonation
function hybridAuth(req: any, res: any, next: any) {
  // Check for impersonation first
  const impersonateId = ImpersonationSecurityGuard.getImpersonationId(req);
  
  if (impersonateId) {
    // Use impersonation
    req.user = {
      claims: {
        sub: impersonateId
      }
    };
    return next();
  }
  
  // Fall back to real authentication
  return isAuthenticated(req, res, next);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", hybridAuth, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const user = await storage.getUser(userId);
      
      // Debug logging for role investigation
      console.log(`[API /auth/user] Returning user:`, {
        id: user?.id,
        email: user?.email,
        firstName: user?.firstName,
        lastName: user?.lastName,
        role: user?.role,
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent']?.substring(0, 100)
      });
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Development route to get test users
  app.get("/api/dev/test-users", async (req: any, res) => {
    if (process.env.NODE_ENV !== "development") {
      return res.status(404).json({ message: "Not found" });
    }
    
    try {
      const testUsers = await storage.getTestUsers();
      res.json(testUsers);
    } catch (error) {
      console.error("Error fetching test users:", error);
      res.status(500).json({ message: "Failed to fetch test users" });
    }
  });

  // User profile routes
  app.patch("/api/profile", devAuthBypass, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      console.log("Debug: Profile update request for user:", userId);
      console.log("Debug: Request body:", req.body);
      
      const { firstName, lastName, email, role, skills, bio } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Only include fields that exist in the database schema
      const profileData: any = {};
      if (firstName !== undefined) profileData.firstName = firstName;
      if (lastName !== undefined) profileData.lastName = lastName;
      if (email !== undefined) profileData.email = email;
      if (role !== undefined) profileData.role = role;
      if (skills !== undefined) profileData.skills = skills ? skills.split(',').map((s: string) => s.trim()) : [];
      if (bio !== undefined) profileData.bio = bio;

      console.log("Debug: Profile data to update:", profileData);
      const updatedUser = await storage.updateUserProfile(userId, profileData);
      console.log("Debug: Profile updated successfully");
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.get("/api/users/stats", devAuthBypass, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/profile", devAuthBypass, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // Onboarding completion endpoint
  app.post("/api/profile/onboarding", devAuthBypass, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const { role, firstName, lastName, bio, skills, onboardingCompleted } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const profileData: any = {
        onboardingCompleted: true
      };
      
      if (role !== undefined) profileData.role = role;
      if (firstName !== undefined) profileData.firstName = firstName;
      if (lastName !== undefined) profileData.lastName = lastName;
      if (bio !== undefined) profileData.bio = bio;
      if (skills !== undefined) profileData.skills = Array.isArray(skills) ? skills : [];

      const updatedUser = await storage.updateUserProfile(userId, profileData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error completing onboarding:", error);
      res.status(500).json({ message: "Failed to complete onboarding" });
    }
  });

  // Task routes  
  app.post("/api/tasks", devAuthBypass, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const taskData = insertTaskSchema.parse({
        ...req.body,
        clientId: userId,
      });

      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  // Save task as draft
  app.post("/api/tasks/draft", devAuthBypass, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      
      // For draft, only title is required
      if (!req.body.title) {
        return res.status(400).json({ message: "Title is required for saving draft" });
      }

      const taskData = insertDraftTaskSchema.parse({
        ...req.body,
        clientId: userId,
      });

      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      console.error("Error saving draft:", error);
      res.status(500).json({ message: "Failed to save draft" });
    }
  });

  app.get("/api/tasks/my", devAuthBypass, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      console.log("Debug: userId from getEffectiveUserId:", userId);
      const user = await storage.getUser(userId);
      console.log("Debug: found user:", user ? { id: user.id, role: user.role } : "null");
      
      let tasks;
      if (user?.role === "client") {
        console.log("Debug: fetching tasks for client:", userId);
        tasks = await storage.getTasksByClient(userId);
        console.log("Debug: client tasks found:", tasks.length);
      } else {
        console.log("Debug: fetching tasks for freelancer:", userId);
        tasks = await storage.getTasksByFreelancer(userId);
        console.log("Debug: freelancer tasks found:", tasks.length);
      }
      
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/available", devAuthBypass, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const tasks = await storage.getAvailableTasks(userId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching available tasks:", error);
      res.status(500).json({ message: "Failed to fetch available tasks" });
    }
  });

  // Active projects route for freelancers (must be before :id route)
  app.get("/api/tasks/active", devAuthBypass, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      console.log("Debug: Fetching active tasks for freelancer:", userId);
      const allTasks = await storage.getTasksByFreelancer(userId);
      console.log("Debug: All freelancer tasks:", allTasks.map(t => ({ id: t.id, status: t.status, title: t.title })));
      
      // Filter only active tasks (in_progress, in_review)
      const activeTasks = allTasks.filter(task => 
        task.status === "in_progress" || task.status === "in_review"
      );
      console.log("Debug: Active tasks found:", activeTasks.length);
      
      if (activeTasks.length === 0) {
        return res.json([]);
      }
      
      res.json(activeTasks);
    } catch (error) {
      console.error("Error fetching active projects:", error);
      res.status(500).json({ message: "Failed to fetch active projects" });
    }
  });

  app.get("/api/tasks/:id", devAuthBypass, async (req: any, res) => {
    try {
      const { id } = req.params;
      const task = await storage.getTask(id);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.patch("/api/tasks/:id/status", devAuthBypass, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, freelancerId } = req.body;
      
      // Get task details before updating
      const task = await storage.getTask(id);
      
      await storage.updateTaskStatus(id, status, freelancerId);
      
      // Send notifications based on status change
      if (task) {
        if (status === "completed" && task.assignedFreelancerId) {
          const freelancer = await storage.getUser(task.assignedFreelancerId);
          if (freelancer) {
            await NotificationService.notifyTaskCompleted(
              task.id,
              task.clientId,
              `${freelancer.firstName} ${freelancer.lastName}`,
              task.title
            );
          }
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating task status:", error);
      res.status(500).json({ message: "Failed to update task status" });
    }
  });

  // Submit work for review (freelancer)
  app.patch("/api/tasks/:id/submit", devAuthBypass, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { deliveryMessage, files } = req.body;
      const userId = getEffectiveUserId(req);
      
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      if (task.assignedFreelancerId !== userId) {
        return res.status(403).json({ message: "Not assigned to this task" });
      }
      
      // Update task status to in_review
      await storage.updateTaskStatus(id, "in_review");
      
      // Save delivery details
      await storage.saveTaskDelivery(id, {
        message: deliveryMessage,
        files: files || [],
        submittedAt: new Date()
      });
      
      // Notify client
      const client = await storage.getUser(task.clientId);
      if (client) {
        await NotificationService.notifyTaskCompleted(
          task.id,
          task.clientId,
          `${client.firstName} ${client.lastName}`,
          task.title
        );
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error submitting work:", error);
      res.status(500).json({ message: "Failed to submit work" });
    }
  });

  // Approve completed work (client)
  app.patch("/api/tasks/:id/approve", devAuthBypass, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = getEffectiveUserId(req);
      
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      if (task.clientId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      // Update task status to completed
      await storage.updateTaskStatus(id, "completed");
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error approving work:", error);
      res.status(500).json({ message: "Failed to approve work" });
    }
  });

  // Send work for revision (client) 
  app.patch("/api/tasks/:id/request-revision", devAuthBypass, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { reason, detailedFeedback } = req.body;
      const userId = getEffectiveUserId(req);
      
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      if (task.clientId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      // Update task status back to in_progress
      await storage.updateTaskStatus(id, "in_progress");
      
      // Save revision request
      await storage.saveTaskRevision(id, {
        reason,
        detailedFeedback,
        requestedAt: new Date()
      });
      
      // Notify freelancer
      const freelancer = await storage.getUser(task.assignedFreelancerId);
      if (freelancer) {
        await NotificationService.notifyTaskRevisionRequested(
          task.id,
          task.assignedFreelancerId,
          `${freelancer.firstName} ${freelancer.lastName}`,
          task.title,
          reason
        );
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error requesting revision:", error);
      res.status(500).json({ message: "Failed to request revision" });
    }
  });

  // Reject completed work (client) 
  app.patch("/api/tasks/:id/reject", devAuthBypass, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      const userId = getEffectiveUserId(req);
      
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      if (task.clientId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      // Update task status back to in_progress
      await storage.updateTaskStatus(id, "in_progress");
      
      // Save rejection reason
      await storage.saveTaskRejection(id, {
        reason: rejectionReason,
        rejectedAt: new Date()
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error rejecting work:", error);
      res.status(500).json({ message: "Failed to reject work" });
    }
  });

  // Task creation route
  app.post("/api/tasks", devAuthBypass, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const taskData = insertTaskSchema.parse({
        ...req.body,
        clientId: userId,
      });

      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => err.message).join(", ");
        return res.status(400).json({ message: errorMessages });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  // Bid routes
  app.post("/api/bids", devAuthBypass, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const bidData = insertBidSchema.parse({
        ...req.body,
        freelancerId: userId,
      });

      const bid = await storage.createBid(bidData);
      
      // Get task and freelancer details for notification
      const task = await storage.getTask(bid.taskId);
      const freelancer = await storage.getUser(userId);
      
      if (task && freelancer) {
        // Notify client about new bid
        await NotificationService.notifyNewBid(
          task.id,
          task.clientId,
          `${freelancer.firstName} ${freelancer.lastName}`,
          bid.amount.toString()
        );
      }
      
      res.json(bid);
    } catch (error) {
      console.error("Error creating bid:", error);
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => err.message).join(", ");
        return res.status(400).json({ message: errorMessages });
      }
      res.status(500).json({ message: "Failed to create bid" });
    }
  });

  app.get("/api/bids/task/:taskId", devAuthBypass, async (req: any, res) => {
    try {
      const { taskId } = req.params;
      const bids = await storage.getBidsByTask(taskId);
      res.json(bids);
    } catch (error) {
      console.error("Error fetching bids:", error);
      res.status(500).json({ message: "Failed to fetch bids" });
    }
  });

  app.get("/api/bids/my", devAuthBypass, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const bids = await storage.getBidsByFreelancer(userId);
      res.json(bids);
    } catch (error) {
      console.error("Error fetching bids:", error);
      res.status(500).json({ message: "Failed to fetch bids" });
    }
  });

  // Get pending bids for client review
  app.get("/api/bids/pending", devAuthBypass, async (req: any, res) => {
    try {
      const clientId = getEffectiveUserId(req);
      const pendingBids = await storage.getPendingBidsForClient(clientId);
      res.json(pendingBids);
    } catch (error) {
      console.error("Error fetching pending bids for client:", error);
      res.status(500).json({ message: "Failed to fetch pending bids" });
    }
  });

  app.patch("/api/bids/:id/status", devAuthBypass, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      // Get bid details before updating for notification
      const bid = await storage.getBid(id);
      const task = bid ? await storage.getTask(bid.taskId) : null;
      const client = bid ? await storage.getUser(getEffectiveUserId(req)) : null;
      
      if (status === "accepted") {
        // Use special acceptBid method that also assigns freelancer to task
        await storage.acceptBid(id);
        
        // Notify freelancer about bid acceptance
        if (bid && task && client) {
          await NotificationService.notifyBidAccepted(
            task.id,
            bid.freelancerId,
            `${client.firstName} ${client.lastName}`,
            task.title
          );
        }
      } else if (status === "rejected") {
        // For rejected status, update and notify
        await storage.updateBidStatus(id, status);
        
        // Notify freelancer about bid rejection
        if (bid && task && client) {
          await NotificationService.notifyBidRejected(
            task.id,
            bid.freelancerId,
            `${client.firstName} ${client.lastName}`,
            task.title
          );
        }
      } else {
        // For other statuses, just update bid status
        await storage.updateBidStatus(id, status);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating bid status:", error);
      res.status(500).json({ message: "Failed to update bid status" });
    }
  });

  // Accept bid endpoint (alternative route for UI compatibility)
  app.patch("/api/bids/:id/accept", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Get bid details before updating for notification
      const bid = await storage.getBid(id);
      const task = bid ? await storage.getTask(bid.taskId) : null;
      const client = bid ? await storage.getUser(req.user.claims.sub) : null;
      
      // Use special acceptBid method that also assigns freelancer to task
      await storage.acceptBid(id);
      
      // Notify freelancer about bid acceptance
      if (bid && task && client) {
        await NotificationService.notifyBidAccepted(
          task.id,
          bid.freelancerId,
          `${client.firstName} ${client.lastName}`,
          task.title
        );
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error accepting bid:", error);
      res.status(500).json({ message: "Failed to accept bid" });
    }
  });

  // Message routes
  app.post("/api/messages", devAuthBypass, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      
      // Get task to determine receiver
      const task = await storage.getTask(req.body.taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Determine receiver - if sender is client, receiver is freelancer, and vice versa
      let receiverId: string | null = null;
      if (task.clientId === userId && task.assignedFreelancerId) {
        receiverId = task.assignedFreelancerId;
      } else if (task.assignedFreelancerId === userId) {
        receiverId = task.clientId;
      }
      
      if (!receiverId) {
        return res.status(400).json({ message: "Cannot determine message receiver" });
      }

      console.log("Debug: Creating message with data:", { 
        ...req.body, 
        senderId: userId, 
        receiverId 
      });
      
      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: userId,
        receiverId: receiverId,
      });

      const message = await storage.createMessage(messageData);
      
      // Get sender details for notification
      const sender = await storage.getUser(userId);
      
      if (sender) {
        await NotificationService.notifyNewMessage(
          task.id,
          receiverId,
          `${sender.firstName} ${sender.lastName}`,
          task.title
        );
      }
      
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  app.get("/api/messages/task/:taskId", devAuthBypass, async (req: any, res) => {
    try {
      const { taskId } = req.params;
      console.log(`Debug: Fetching messages for task ${taskId}`);
      const messages = await storage.getMessagesByTask(taskId);
      console.log(`Debug: Found ${messages.length} messages for task ${taskId}:`, messages.map(m => ({ id: m.id, content: m.content.substring(0, 50) })));
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.get("/api/conversations", devAuthBypass, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.patch("/api/messages/read/:taskId", devAuthBypass, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const { taskId } = req.params;
      
      await storage.markMessagesAsRead(taskId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });

  // Payment routes
  app.get("/api/payments", devAuthBypass, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const payments = await storage.getPaymentsByUser(userId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.patch("/api/payments/:id/status", devAuthBypass, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      await storage.updatePaymentStatus(id, status);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating payment status:", error);
      res.status(500).json({ message: "Failed to update payment status" });
    }
  });

  // Review routes
  app.post("/api/reviews", devAuthBypass, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const reviewData = insertReviewSchema.parse({
        ...req.body,
        reviewerId: userId,
      });

      const review = await storage.createReview(reviewData);
      
      // Get task and reviewer details for notification
      const task = await storage.getTask(review.taskId);
      const reviewer = await storage.getUser(userId);
      
      if (task && reviewer) {
        await NotificationService.notifyReviewReceived(
          task.id,
          review.revieweeId,
          `${reviewer.firstName} ${reviewer.lastName}`,
          review.rating,
          task.title
        );
      }
      
      res.json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  app.get("/api/reviews", devAuthBypass, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const reviews = await storage.getReviewsByUser(userId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Dispute routes
  app.post("/api/disputes", devAuthBypass, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const disputeData = insertDisputeSchema.parse({
        ...req.body,
        initiatorId: userId,
      });

      const dispute = await storage.createDispute(disputeData);
      
      // Get task and initiator details for notification
      const task = await storage.getTask(dispute.taskId);
      const initiator = await storage.getUser(userId);
      
      if (task && initiator) {
        // Determine defendant - if initiator is client, notify freelancer, and vice versa
        const defendantId = task.clientId === userId ? task.assignedFreelancerId : task.clientId;
        
        if (defendantId) {
          await NotificationService.notifyDisputeCreated(
            dispute.id,
            defendantId,
            `${initiator.firstName} ${initiator.lastName}`,
            task.title
          );
        }
      }
      
      res.json(dispute);
    } catch (error) {
      console.error("Error creating dispute:", error);
      res.status(500).json({ message: "Failed to create dispute" });
    }
  });

  app.get("/api/disputes", devAuthBypass, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const disputes = await storage.getDisputesByUser(userId);
      res.json(disputes);
    } catch (error) {
      console.error("Error fetching disputes:", error);
      res.status(500).json({ message: "Failed to fetch disputes" });
    }
  });



  // Earnings routes for freelancers
  app.get("/api/earnings", devAuthBypass, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const payments = await storage.getPaymentsByUser(userId);
      // Transform payments to earnings format
      const earnings = payments.map(payment => ({
        id: payment.id,
        taskId: payment.taskId,
        amount: payment.amount,
        status: payment.status,
        type: "payment",
        createdAt: payment.createdAt,
      }));
      res.json(earnings);
    } catch (error) {
      console.error("Error fetching earnings:", error);
      res.status(500).json({ message: "Failed to fetch earnings" });
    }
  });

  app.get("/api/earnings/stats", devAuthBypass, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const payments = await storage.getPaymentsByUser(userId);
      
      const totalEarnings = payments
        .filter(p => p.status === "released")
        .reduce((sum, p) => sum + p.amount, 0);
      
      const thisMonth = payments
        .filter(p => {
          const paymentDate = new Date(p.createdAt);
          const now = new Date();
          return paymentDate.getMonth() === now.getMonth() && 
                 paymentDate.getFullYear() === now.getFullYear() &&
                 p.status === "released";
        })
        .reduce((sum, p) => sum + p.amount, 0);
      
      const pending = payments
        .filter(p => p.status === "escrowed")
        .reduce((sum, p) => sum + p.amount, 0);
      
      const completed = totalEarnings;
      
      res.json({
        totalEarnings,
        thisMonth,
        pending,
        completed
      });
    } catch (error) {
      console.error("Error fetching earnings stats:", error);
      res.status(500).json({ message: "Failed to fetch earnings stats" });
    }
  });

  // ==========================================================================
  // ADMIN ROUTES
  // ==========================================================================
  
  // Get all users (admin only)
  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const role = req.query.role as string;
      
      const users = await storage.getAllUsers(page, limit, search, role);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Block/Unblock user (admin only)
  app.patch("/api/admin/users/:id/block", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { isBlocked } = req.body;
      
      await storage.updateUserBlockStatus(id, isBlocked);
      res.json({ message: "User status updated successfully" });
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // Get all disputes for moderation (admin only)
  app.get("/api/admin/disputes", isAuthenticated, isModerator, async (req, res) => {
    try {
      const disputes = await storage.getAllDisputes();
      res.json(disputes);
    } catch (error) {
      console.error("Error fetching disputes:", error);
      res.status(500).json({ message: "Failed to fetch disputes" });
    }
  });

  // Resolve dispute (admin only)
  app.patch("/api/admin/disputes/:id/resolve", isAuthenticated, isModerator, async (req, res) => {
    try {
      const { id } = req.params;
      const { resolution, winner } = req.body;
      const moderatorId = getEffectiveUserId(req);
      
      await storage.resolveDispute(id, resolution, winner, moderatorId);
      res.json({ message: "Dispute resolved successfully" });
    } catch (error) {
      console.error("Error resolving dispute:", error);
      res.status(500).json({ message: "Failed to resolve dispute" });
    }
  });

  // Get platform statistics (admin only)
  app.get("/api/admin/stats", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const stats = await storage.getPlatformStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching platform stats:", error);
      res.status(500).json({ message: "Failed to fetch platform stats" });
    }
  });

  // Get all tasks for admin oversight (admin only)
  app.get("/api/admin/tasks", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string;
      
      const tasks = await storage.getAllTasks(page, limit, status);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Admin role management
  app.patch("/api/admin/users/:userId/role", isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      
      // Validate role
      if (!["client", "freelancer", "moderator", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      // Only full admins can assign admin roles
      const currentUserRole = (req as any).userRole;
      if (role === "admin" && currentUserRole !== "admin") {
        return res.status(403).json({ message: "Only administrators can assign admin roles" });
      }
      
      // Prevent admin from removing their own admin role
      const currentUserId = (req.user as any)?.claims?.sub;
      if (userId === currentUserId && role !== "admin") {
        return res.status(400).json({ message: "Cannot remove your own admin role" });
      }
      
      await storage.updateUserRole(userId, role);
      res.json({ message: "Role updated successfully" });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Notification endpoints
  app.get('/api/notifications', devAuthBypass, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await storage.getNotifications(userId, limit);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  app.get('/api/notifications/unread-count', devAuthBypass, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ message: 'Failed to fetch unread count' });
    }
  });

  app.patch('/api/notifications/:id/read', devAuthBypass, async (req: any, res) => {
    try {
      const notificationId = req.params.id;
      await storage.markNotificationAsRead(notificationId);
      res.json({ message: 'Notification marked as read' });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: 'Failed to mark notification as read' });
    }
  });

  app.patch('/api/notifications/read-all', devAuthBypass, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      await storage.markAllNotificationsAsRead(userId);
      res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ message: 'Failed to mark notifications as read' });
    }
  });

  app.delete('/api/notifications/:id', devAuthBypass, async (req: any, res) => {
    try {
      const notificationId = req.params.id;
      await storage.deleteNotification(notificationId);
      res.json({ message: 'Notification deleted' });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ message: 'Failed to delete notification' });
    }
  });

  const httpServer = createServer(app);
  
  // Setup WebSocket server
  setupWebSocketServer(httpServer);
  console.log('WebSocket server setup complete - notifications enabled');
  
  return httpServer;
}
