import {
  users,
  tasks,
  bids,
  messages,
  conversations,
  payments,
  reviews,
  disputes,
  notifications,
  type User,
  type UpsertUser,
  type Task,
  type InsertTask,
  type Bid,
  type InsertBid,
  type Message,
  type InsertMessage,
  type Conversation,
  type InsertConversation,
  type Payment,
  type InsertPayment,
  type Review,
  type InsertReview,
  type Dispute,
  type InsertDispute,
  type Notification,
  type InsertNotification,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, count } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(userId: string, profileData: any): Promise<User>;
  
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
  getPendingBidsForClient(clientId: string): Promise<Bid[]>;
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
  
  // Admin operations
  getAllUsers(page: number, limit: number, search?: string, role?: string): Promise<any[]>;
  updateUserBlockStatus(userId: string, isBlocked: boolean): Promise<void>;
  getAllDisputes(): Promise<any[]>;
  resolveDispute(disputeId: string, resolution: string, winner: string, moderatorId: string): Promise<void>;
  getPlatformStats(): Promise<any>;
  getAllTasks(page: number, limit: number, status?: string): Promise<any[]>;
  
  // Statistics
  getUserStats(userId: string): Promise<any>;
  
  // Bid operations - advanced
  acceptBid(bidId: string): Promise<void>;
  
  // Development helpers
  getTestUsers(): Promise<User[]>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(userId: string, limit?: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  markNotificationAsRead(notificationId: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  deleteNotification(notificationId: string): Promise<void>;
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

  async updateUserProfile(userId: string, profileData: any): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...profileData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
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

  async getTasksByFreelancer(freelancerId: string): Promise<any[]> {
    const result = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        budget: tasks.budget,
        deadline: tasks.deadline,
        status: tasks.status,
        clientId: tasks.clientId,
        assignedFreelancerId: tasks.assignedFreelancerId,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        client: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email
        }
      })
      .from(tasks)
      .innerJoin(users, eq(tasks.clientId, users.id))
      .where(eq(tasks.assignedFreelancerId, freelancerId))
      .orderBy(desc(tasks.createdAt));

    return result;
  }

  async getAvailableTasks(freelancerId?: string): Promise<Task[]> {
    if (freelancerId) {
      // Exclude tasks where freelancer already bid
      const userBids = await db
        .select({ taskId: bids.taskId })
        .from(bids)
        .where(eq(bids.freelancerId, freelancerId));
      
      const bidTaskIds = userBids.map(bid => bid.taskId);
      
      if (bidTaskIds.length > 0) {
        return await db
          .select()
          .from(tasks)
          .where(sql`${tasks.status} = 'open' AND ${tasks.id} NOT IN (${sql.join(bidTaskIds.map(id => sql`${id}`), sql`, `)})`)
          .orderBy(desc(tasks.createdAt));
      }
    }

    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.status, "open"))
      .orderBy(desc(tasks.createdAt));
  }

  async getTask(id: string): Promise<any | undefined> {
    const [result] = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        budget: tasks.budget,
        deadline: tasks.deadline,
        status: tasks.status,
        category: tasks.category,
        skills: tasks.skills,
        clientId: tasks.clientId,
        assignedFreelancerId: tasks.assignedFreelancerId,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        client: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          profileImageUrl: users.profileImageUrl
        }
      })
      .from(tasks)
      .innerJoin(users, eq(tasks.clientId, users.id))
      .where(eq(tasks.id, id));
    
    return result;
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

  async getPendingBidsForClient(clientId: string): Promise<Bid[]> {
    return await db
      .select({
        id: bids.id,
        taskId: bids.taskId,
        freelancerId: bids.freelancerId,
        amount: bids.amount,
        deadline: bids.deadline,
        proposal: bids.proposal,
        status: bids.status,
        createdAt: bids.createdAt,
        updatedAt: bids.updatedAt,
        task: {
          id: tasks.id,
          title: tasks.title,
          description: tasks.description,
          budget: tasks.budget,
          deadline: tasks.deadline,
          clientId: tasks.clientId
        },
        freelancer: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email
        }
      })
      .from(bids)
      .innerJoin(tasks, eq(bids.taskId, tasks.id))
      .innerJoin(users, eq(bids.freelancerId, users.id))
      .where(and(eq(tasks.clientId, clientId), eq(bids.status, "pending")))
      .orderBy(desc(bids.createdAt));
  }

  async updateBidStatus(id: string, status: "pending" | "accepted" | "rejected" | "counter_offer"): Promise<void> {
    await db.update(bids).set({ status, updatedAt: new Date() }).where(eq(bids.id, id));
  }

  async acceptBid(bidId: string): Promise<void> {
    // Get bid data
    const [bid] = await db.select().from(bids).where(eq(bids.id, bidId));
    if (!bid) throw new Error("Bid not found");

    // Update bid status to accepted
    await db.update(bids).set({ status: "accepted", updatedAt: new Date() }).where(eq(bids.id, bidId));

    // Assign freelancer to task and change task status
    await db.update(tasks).set({
      assignedFreelancerId: bid.freelancerId,
      status: "in_progress",
      updatedAt: new Date()
    }).where(eq(tasks.id, bid.taskId));

    // Reject all other pending bids for this task
    await db.update(bids).set({
      status: "rejected",
      updatedAt: new Date()
    }).where(
      and(
        eq(bids.taskId, bid.taskId),
        eq(bids.status, "pending"),
        sql`${bids.id} != ${bidId}`
      )
    );
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async getMessagesByTask(taskId: string): Promise<any[]> {
    const result = await db
      .select({
        id: messages.id,
        taskId: messages.taskId,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        content: messages.content,
        isRead: messages.isRead,
        createdAt: messages.createdAt,
        senderFirstName: users.firstName,
        senderLastName: users.lastName,
        senderProfileImageUrl: users.profileImageUrl
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.taskId, taskId))
      .orderBy(messages.createdAt);

    return result.map(row => ({
      id: row.id,
      taskId: row.taskId,
      senderId: row.senderId,
      receiverId: row.receiverId,
      content: row.content,
      isRead: row.isRead,
      createdAt: row.createdAt,
      sender: {
        id: row.senderId,
        firstName: row.senderFirstName,
        lastName: row.senderLastName,
        profileImageUrl: row.senderProfileImageUrl
      }
    }));
  }

  async getConversations(userId: string): Promise<any[]> {
    // Get unique task IDs where user has messages
    const userMessages = await db
      .select({
        taskId: messages.taskId,
      })
      .from(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)))
      .groupBy(messages.taskId);

    // Get conversation details for each task
    const conversationsWithDetails = await Promise.all(
      userMessages.map(async ({ taskId }) => {
        // Get last message for this task
        const [lastMessage] = await db
          .select()
          .from(messages)
          .where(eq(messages.taskId, taskId))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        // Get unread count for this user
        const [unreadResult] = await db
          .select({ count: count() })
          .from(messages)
          .where(
            and(
              eq(messages.taskId, taskId),
              eq(messages.receiverId, userId),
              eq(messages.isRead, false)
            )
          );

        // Get task details
        const [task] = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, taskId));

        // Get other user details
        const otherUserId = lastMessage.senderId === userId ? lastMessage.receiverId : lastMessage.senderId;
        const [otherUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, otherUserId));

        return {
          taskId,
          taskTitle: task?.title,
          lastMessage: lastMessage.content,
          lastMessageTime: lastMessage.createdAt,
          unreadCount: unreadResult.count,
          task,
          otherUser,
        };
      })
    );

    return conversationsWithDetails.sort((a, b) => 
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );
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

  async getPaymentsByUser(userId: string): Promise<any[]> {
    // First get basic payment data
    const paymentsData = await db
      .select()
      .from(payments)
      .where(or(eq(payments.clientId, userId), eq(payments.freelancerId, userId)))
      .orderBy(desc(payments.createdAt));

    // Enrich with additional data
    const enrichedPayments = await Promise.all(
      paymentsData.map(async (payment) => {
        // Get task data
        let task = null;
        if (payment.taskId) {
          const [taskData] = await db
            .select()
            .from(tasks)
            .where(eq(tasks.id, payment.taskId));
          task = taskData;
        }

        // Get client data
        let client = null;
        if (payment.clientId) {
          const [clientData] = await db
            .select()
            .from(users)
            .where(eq(users.id, payment.clientId));
          client = clientData;
        }

        // Get freelancer data
        let freelancer = null;
        if (payment.freelancerId) {
          const [freelancerData] = await db
            .select()
            .from(users)
            .where(eq(users.id, payment.freelancerId));
          freelancer = freelancerData;
        }

        return {
          ...payment,
          task,
          client,
          freelancer
        };
      })
    );

    return enrichedPayments;
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

  // Admin operations
  async getAllUsers(page: number = 1, limit: number = 20, search?: string, role?: string): Promise<any[]> {
    const offset = (page - 1) * limit;
    let query = db.select().from(users);

    if (search) {
      query = query.where(
        or(
          sql`${users.firstName} ILIKE ${`%${search}%`}`,
          sql`${users.lastName} ILIKE ${`%${search}%`}`,
          sql`${users.email} ILIKE ${`%${search}%`}`
        )
      );
    }

    if (role && role !== 'all') {
      query = query.where(eq(users.role, role as any));
    }

    return await query.limit(limit).offset(offset).orderBy(desc(users.createdAt));
  }

  async updateUserBlockStatus(userId: string, isBlocked: boolean): Promise<void> {
    await db
      .update(users)
      .set({ isBlocked, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateUserRole(userId: string, role: string): Promise<void> {
    await db
      .update(users)
      .set({ role: role as any, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async getAllDisputes(): Promise<any[]> {
    const defendantAlias = alias(users, 'defendant');
    
    return await db
      .select({
        id: disputes.id,
        taskId: disputes.taskId,
        initiatorId: disputes.initiatorId,
        defendantId: disputes.defendantId,
        reason: disputes.reason,
        status: disputes.status,
        resolution: disputes.resolution,
        moderatorId: disputes.moderatorId,
        createdAt: disputes.createdAt,
        resolvedAt: disputes.resolvedAt,
        task: {
          id: tasks.id,
          title: tasks.title,
          budget: tasks.budget,
        },
        initiator: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
        defendant: {
          id: defendantAlias.id,
          firstName: defendantAlias.firstName,
          lastName: defendantAlias.lastName,
          email: defendantAlias.email,
        }
      })
      .from(disputes)
      .innerJoin(tasks, eq(disputes.taskId, tasks.id))
      .innerJoin(users, eq(disputes.initiatorId, users.id))
      .innerJoin(defendantAlias, eq(disputes.defendantId, defendantAlias.id))
      .orderBy(desc(disputes.createdAt));
  }

  async resolveDispute(disputeId: string, resolution: string, winner: string, moderatorId: string): Promise<void> {
    await db
      .update(disputes)
      .set({
        status: "resolved",
        resolution,
        moderatorId,
        resolvedAt: new Date(),
      })
      .where(eq(disputes.id, disputeId));
  }

  async getPlatformStats(): Promise<any> {
    const [userStats] = await db
      .select({
        totalUsers: count(users.id),
        totalClients: count(sql`CASE WHEN ${users.role} = 'client' THEN 1 END`),
        totalFreelancers: count(sql`CASE WHEN ${users.role} = 'freelancer' THEN 1 END`),
        blockedUsers: count(sql`CASE WHEN ${users.isBlocked} = true THEN 1 END`),
      })
      .from(users);

    const [taskStats] = await db
      .select({
        totalTasks: count(tasks.id),
        openTasks: count(sql`CASE WHEN ${tasks.status} = 'open' THEN 1 END`),
        inProgressTasks: count(sql`CASE WHEN ${tasks.status} = 'in_progress' THEN 1 END`),
        completedTasks: count(sql`CASE WHEN ${tasks.status} = 'completed' THEN 1 END`),
      })
      .from(tasks);

    const [disputeStats] = await db
      .select({
        totalDisputes: count(disputes.id),
        openDisputes: count(sql`CASE WHEN ${disputes.status} = 'open' THEN 1 END`),
        resolvedDisputes: count(sql`CASE WHEN ${disputes.status} = 'resolved' THEN 1 END`),
      })
      .from(disputes);

    const [paymentStats] = await db
      .select({
        totalPayments: count(payments.id),
        totalVolume: sql<number>`COALESCE(SUM(${payments.amount}), 0)`,
        escrowedAmount: sql<number>`COALESCE(SUM(CASE WHEN ${payments.status} = 'escrowed' THEN ${payments.amount} ELSE 0 END), 0)`,
      })
      .from(payments);

    return {
      users: userStats,
      tasks: taskStats,
      disputes: disputeStats,
      payments: paymentStats,
    };
  }

  async getAllTasks(page: number = 1, limit: number = 20, status?: string): Promise<any[]> {
    const offset = (page - 1) * limit;
    let query = db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        budget: tasks.budget,
        status: tasks.status,
        category: tasks.category,
        clientId: tasks.clientId,
        assignedFreelancerId: tasks.assignedFreelancerId,
        createdAt: tasks.createdAt,
        client: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        }
      })
      .from(tasks)
      .innerJoin(users, eq(tasks.clientId, users.id));

    if (status && status !== 'all') {
      query = query.where(eq(tasks.status, status as any));
    }

    return await query.limit(limit).offset(offset).orderBy(desc(tasks.createdAt));
  }

  // Development helpers
  async getTestUsers(): Promise<User[]> {
    const testUsers = await db
      .select()
      .from(users)
      .where(or(
        eq(users.email, "client@test.com"),
        eq(users.email, "freelancer@test.com")
      ));
    return testUsers;
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return created;
  }

  async getNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );
    return result[0]?.count || 0;
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.id, notificationId));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await db
      .delete(notifications)
      .where(eq(notifications.id, notificationId));
  }
}

export const storage = new DatabaseStorage();
