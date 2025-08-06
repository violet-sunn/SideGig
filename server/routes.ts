import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
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
  // In development, allow impersonation via query parameter
  const impersonateId = req.query.impersonate as string;
  if (process.env.NODE_ENV === 'development' && impersonateId) {
    return impersonateId;
  }
  return req.user.claims.sub;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Development mode: allow impersonation for testing
      const impersonateUserId = req.query.impersonate as string;
      if (process.env.NODE_ENV === "development" && impersonateUserId) {
        const impersonatedUser = await storage.getUser(impersonateUserId);
        if (impersonatedUser) {
          return res.json(impersonatedUser);
        }
      }
      
      const user = await storage.getUser(userId);
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
  app.post("/api/users/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { role, skills, bio } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await storage.upsertUser({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        role,
      });

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

  // Task routes
  app.post("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const user = await storage.getUser(userId);
      
      let tasks;
      if (user?.role === "client") {
        tasks = await storage.getTasksByClient(userId);
      } else {
        tasks = await storage.getTasksByFreelancer(userId);
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

  // Bid routes
  app.post("/api/bids", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bidData = insertBidSchema.parse({
        ...req.body,
        freelancerId: userId,
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
      const userId = req.user.claims.sub;
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
      const messages = await storage.getMessagesByTask(taskId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.get("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.patch("/api/messages/read/:taskId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const disputes = await storage.getDisputesByUser(userId);
      res.json(disputes);
    } catch (error) {
      console.error("Error fetching disputes:", error);
      res.status(500).json({ message: "Failed to fetch disputes" });
    }
  });

  // Active projects route for freelancers
  app.get("/api/tasks/active", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getEffectiveUserId(req);
      const tasks = await storage.getTasksByFreelancer(userId);
      // Filter only active tasks (in_progress, in_review)
      const activeTasks = tasks.filter(task => 
        task.status === "in_progress" || task.status === "in_review"
      );
      res.json(activeTasks);
    } catch (error) {
      console.error("Error fetching active projects:", error);
      res.status(500).json({ message: "Failed to fetch active projects" });
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

  const httpServer = createServer(app);
  return httpServer;
}
