import {
  users,
  tasks,
  bids,
  messages,
  payments,
  reviews,
  disputes,
  type User,
  type UpsertUser,
  type Task,
  type InsertTask,
  type Bid,
  type InsertBid,
  type Message,
  type InsertMessage,
  type Payment,
  type InsertPayment,
  type Review,
  type InsertReview,
  type Dispute,
  type InsertDispute,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, count } from "drizzle-orm";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Task operations
  createTask(task: InsertTask): Promise<Task>;
  getTasksByClient(clientId: string): Promise<Task[]>;
  getTasksByFreelancer(freelancerId: string): Promise<Task[]>;
  getAvailableTasks(freelancerId?: string): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  updateTaskStatus(id: string, status: string, freelancerId?: string): Promise<void>;
  
  // Bid operations
  createBid(bid: InsertBid): Promise<Bid>;
  getBidsByTask(taskId: string): Promise<Bid[]>;
  getBidsByFreelancer(freelancerId: string): Promise<Bid[]>;
  updateBidStatus(id: string, status: string): Promise<void>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByTask(taskId: string): Promise<Message[]>;
  getConversations(userId: string): Promise<any[]>;
  markMessagesAsRead(taskId: string, userId: string): Promise<void>;
  
  // Payment operations
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePaymentStatus(id: string, status: string): Promise<void>;
  getPaymentsByUser(userId: string): Promise<Payment[]>;
  
  // Review operations
  createReview(review: InsertReview): Promise<Review>;
  getReviewsByUser(userId: string): Promise<Review[]>;
  updateUserRating(userId: string): Promise<void>;
  
  // Dispute operations
  createDispute(dispute: InsertDispute): Promise<Dispute>;
  getDisputesByUser(userId: string): Promise<Dispute[]>;
  
  // Statistics
  getUserStats(userId: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations - mandatory for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Task operations
  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async getTasksByClient(clientId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.clientId, clientId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTasksByFreelancer(freelancerId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.assignedFreelancerId, freelancerId))
      .orderBy(desc(tasks.createdAt));
  }

  async getAvailableTasks(freelancerId?: string): Promise<Task[]> {
    let query = db
      .select()
      .from(tasks)
      .where(eq(tasks.status, "open"));

    if (freelancerId) {
      // Exclude tasks where freelancer already bid
      const userBids = await db
        .select({ taskId: bids.taskId })
        .from(bids)
        .where(eq(bids.freelancerId, freelancerId));
      
      const bidTaskIds = userBids.map(bid => bid.taskId);
      
      if (bidTaskIds.length > 0) {
        query = query.where(sql`${tasks.id} NOT IN (${sql.join(bidTaskIds.map(id => sql`${id}`), sql`, `)})`);
      }
    }

    return await query.orderBy(desc(tasks.createdAt));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async updateTaskStatus(id: string, status: string, freelancerId?: string): Promise<void> {
    const updateData: any = { status, updatedAt: new Date() };
    if (freelancerId) {
      updateData.assignedFreelancerId = freelancerId;
    }
    
    await db.update(tasks).set(updateData).where(eq(tasks.id, id));
  }

  // Bid operations
  async createBid(bid: InsertBid): Promise<Bid> {
    const [newBid] = await db.insert(bids).values(bid).returning();
    return newBid;
  }

  async getBidsByTask(taskId: string): Promise<Bid[]> {
    return await db
      .select()
      .from(bids)
      .where(eq(bids.taskId, taskId))
      .orderBy(desc(bids.createdAt));
  }

  async getBidsByFreelancer(freelancerId: string): Promise<Bid[]> {
    return await db
      .select()
      .from(bids)
      .where(eq(bids.freelancerId, freelancerId))
      .orderBy(desc(bids.createdAt));
  }

  async updateBidStatus(id: string, status: string): Promise<void> {
    await db.update(bids).set({ status, updatedAt: new Date() }).where(eq(bids.id, id));
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async getMessagesByTask(taskId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.taskId, taskId))
      .orderBy(messages.createdAt);
  }

  async getConversations(userId: string): Promise<any[]> {
    const conversations = await db
      .select({
        taskId: messages.taskId,
        lastMessage: sql<string>`(
          SELECT content FROM ${messages} 
          WHERE task_id = ${messages.taskId} 
          ORDER BY created_at DESC 
          LIMIT 1
        )`,
        lastMessageTime: sql<Date>`(
          SELECT created_at FROM ${messages} 
          WHERE task_id = ${messages.taskId} 
          ORDER BY created_at DESC 
          LIMIT 1
        )`,
        unreadCount: sql<number>`(
          SELECT COUNT(*) FROM ${messages} 
          WHERE task_id = ${messages.taskId} 
          AND receiver_id = ${userId} 
          AND is_read = false
        )`,
      })
      .from(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)))
      .groupBy(messages.taskId)
      .orderBy(sql`last_message_time DESC`);

    return conversations;
  }

  async markMessagesAsRead(taskId: string, userId: string): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(and(eq(messages.taskId, taskId), eq(messages.receiverId, userId)));
  }

  // Payment operations
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  async updatePaymentStatus(id: string, status: string): Promise<void> {
    const updateData: any = { status };
    if (status === "escrowed") {
      updateData.escrowedAt = new Date();
    } else if (status === "released") {
      updateData.releasedAt = new Date();
    }
    
    await db.update(payments).set(updateData).where(eq(payments.id, id));
  }

  async getPaymentsByUser(userId: string): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(or(eq(payments.clientId, userId), eq(payments.freelancerId, userId)))
      .orderBy(desc(payments.createdAt));
  }

  // Review operations
  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    
    // Update reviewee's rating
    await this.updateUserRating(review.revieweeId);
    
    return newReview;
  }

  async getReviewsByUser(userId: string): Promise<Review[]> {
    return await db
      .select()
      .from(reviews)
      .where(or(eq(reviews.reviewerId, userId), eq(reviews.revieweeId, userId)))
      .orderBy(desc(reviews.createdAt));
  }

  async updateUserRating(userId: string): Promise<void> {
    const [result] = await db
      .select({
        avgRating: sql<number>`AVG(${reviews.rating})`,
        totalReviews: count(reviews.id),
      })
      .from(reviews)
      .where(eq(reviews.revieweeId, userId));

    if (result.totalReviews > 0) {
      await db
        .update(users)
        .set({
          rating: result.avgRating.toFixed(2),
          totalReviews: result.totalReviews,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }
  }

  // Dispute operations
  async createDispute(dispute: InsertDispute): Promise<Dispute> {
    const [newDispute] = await db.insert(disputes).values(dispute).returning();
    return newDispute;
  }

  async getDisputesByUser(userId: string): Promise<Dispute[]> {
    return await db
      .select()
      .from(disputes)
      .where(or(eq(disputes.initiatorId, userId), eq(disputes.defendantId, userId)))
      .orderBy(desc(disputes.createdAt));
  }

  // Statistics
  async getUserStats(userId: string): Promise<any> {
    const user = await this.getUser(userId);
    if (!user) return null;

    if (user.role === "client") {
      const [stats] = await db
        .select({
          activeTasks: sql<number>`COUNT(CASE WHEN ${tasks.status} IN ('open', 'in_progress') THEN 1 END)`,
          completedTasks: sql<number>`COUNT(CASE WHEN ${tasks.status} = 'completed' THEN 1 END)`,
          totalSpent: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'released' THEN ${payments.amount} ELSE 0 END), 0)`,
        })
        .from(tasks)
        .leftJoin(payments, eq(tasks.id, payments.taskId))
        .where(eq(tasks.clientId, userId));

      return {
        activeTasks: stats.activeTasks || 0,
        completedTasks: stats.completedTasks || 0,
        totalSpent: stats.totalSpent || 0,
        averageRating: user.rating || "0",
      };
    } else {
      const [stats] = await db
        .select({
          activeProjects: sql<number>`COUNT(CASE WHEN ${tasks.status} = 'in_progress' THEN 1 END)`,
          completedTasks: sql<number>`COUNT(CASE WHEN ${tasks.status} = 'completed' THEN 1 END)`,
          totalEarned: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'released' THEN ${payments.amount} ELSE 0 END), 0)`,
        })
        .from(tasks)
        .leftJoin(payments, eq(tasks.id, payments.taskId))
        .where(eq(tasks.assignedFreelancerId, userId));

      return {
        activeProjects: stats.activeProjects || 0,
        completedTasks: stats.completedTasks || 0,
        totalEarned: stats.totalEarned || 0,
        rating: user.rating || "0",
      };
    }
  }
}

export const storage = new DatabaseStorage();
