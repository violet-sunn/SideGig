import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin, isModerator } from "./replitAuth";
import {
  insertTaskSchema,
  insertBidSchema,
  insertMessageSchema,
  insertReviewSchema,
  insertDisputeSchema,
} from "@shared/schema";
import { z } from "zod";

// Development middleware for user impersonation
function getEffectiveUserId(req: any): string {
  // In development, allow impersonation via query parameter or headers
  const impersonateId = req.query.impersonate as string || req.headers['x-impersonate'] as string;
  if (process.env.NODE_ENV === 'development' && impersonateId) {
    console.log("Debug: Using impersonated user ID:", impersonateId);
    return impersonateId;
  }
  console.log("Debug: Using real user ID:", req.user.claims.sub);
  return req.user.claims.sub;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      console.log(`Debug: Getting user data for effective user ID: ${userId}`);
      
      const user = await storage.getUser(userId);
      if (user) {
        console.log(`Found user: ${user.firstName} ${user.lastName}, role: ${user.role}`);
      } else {
        console.log(`User ${userId} not found`);
      }
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
  app.patch("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const { firstName, lastName, email, role, skills, bio } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const profileData: any = {};
      if (firstName !== undefined) profileData.firstName = firstName;
      if (lastName !== undefined) profileData.lastName = lastName;
      if (email !== undefined) profileData.email = email;
      if (role !== undefined) profileData.role = role;
      if (skills !== undefined) profileData.skills = skills ? skills.split(',').map((s: string) => s.trim()) : [];
      if (bio !== undefined) profileData.bio = bio;

      const updatedUser = await storage.updateUserProfile(userId, profileData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.get("/api/users/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/profile", isAuthenticated, async (req: any, res) => {
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

  // Task routes  
  app.post("/api/tasks", isAuthenticated, async (req: any, res) => {
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

  app.get("/api/tasks/my", isAuthenticated, async (req: any, res) => {
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

  app.get("/api/tasks/available", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/tasks/active", isAuthenticated, async (req: any, res) => {
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

  app.get("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
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

  app.patch("/api/tasks/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, freelancerId } = req.body;
      
      await storage.updateTaskStatus(id, status, freelancerId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating task status:", error);
      res.status(500).json({ message: "Failed to update task status" });
    }
  });

  // Task creation route
  app.post("/api/tasks", isAuthenticated, async (req: any, res) => {
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

  // Bid routes
  app.post("/api/bids", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      // Convert deadline string to Date
      const bidData = insertBidSchema.parse({
        ...req.body,
        freelancerId: userId,
        deadline: new Date(req.body.deadline),
      });

      const bid = await storage.createBid(bidData);
      res.json(bid);
    } catch (error) {
      console.error("Error creating bid:", error);
      res.status(500).json({ message: "Failed to create bid" });
    }
  });

  app.get("/api/bids/task/:taskId", isAuthenticated, async (req: any, res) => {
    try {
      const { taskId } = req.params;
      const bids = await storage.getBidsByTask(taskId);
      res.json(bids);
    } catch (error) {
      console.error("Error fetching bids:", error);
      res.status(500).json({ message: "Failed to fetch bids" });
    }
  });

  app.get("/api/bids/my", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/bids/pending", isAuthenticated, async (req: any, res) => {
    try {
      const clientId = getEffectiveUserId(req);
      const pendingBids = await storage.getPendingBidsForClient(clientId);
      res.json(pendingBids);
    } catch (error) {
      console.error("Error fetching pending bids for client:", error);
      res.status(500).json({ message: "Failed to fetch pending bids" });
    }
  });

  app.patch("/api/bids/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      await storage.updateBidStatus(id, status);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating bid status:", error);
      res.status(500).json({ message: "Failed to update bid status" });
    }
  });

  // Message routes
  app.post("/api/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: userId,
      });

      const message = await storage.createMessage(messageData);
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  app.get("/api/messages/task/:taskId", isAuthenticated, async (req: any, res) => {
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

  app.get("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.patch("/api/messages/read/:taskId", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/payments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const payments = await storage.getPaymentsByUser(userId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.patch("/api/payments/:id/status", isAuthenticated, async (req: any, res) => {
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
  app.post("/api/reviews", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const reviewData = insertReviewSchema.parse({
        ...req.body,
        reviewerId: userId,
      });

      const review = await storage.createReview(reviewData);
      res.json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  app.get("/api/reviews", isAuthenticated, async (req: any, res) => {
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
  app.post("/api/disputes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const disputeData = insertDisputeSchema.parse({
        ...req.body,
        initiatorId: userId,
      });

      const dispute = await storage.createDispute(disputeData);
      res.json(dispute);
    } catch (error) {
      console.error("Error creating dispute:", error);
      res.status(500).json({ message: "Failed to create dispute" });
    }
  });

  app.get("/api/disputes", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/earnings", isAuthenticated, async (req: any, res) => {
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

  app.get("/api/earnings/stats", isAuthenticated, async (req: any, res) => {
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
      const currentUserId = req.user?.claims?.sub;
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

  const httpServer = createServer(app);
  return httpServer;
}
