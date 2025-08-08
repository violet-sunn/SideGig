import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export const userRoleEnum = pgEnum("user_role", ["client", "freelancer", "moderator", "admin"]);

// Task status enum
export const taskStatusEnum = pgEnum("task_status", [
  "open",
  "in_progress", 
  "completed",
  "cancelled",
]);

// Bid status enum
export const bidStatusEnum = pgEnum("bid_status", [
  "pending",
  "accepted",
  "rejected",
  "counter_offer",
]);

// Payment status enum
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "escrowed",
  "released",
  "refunded",
]);

// Dispute status enum
export const disputeStatusEnum = pgEnum("dispute_status", [
  "open",
  "in_review",
  "resolved",
]);

// Notification type enum
export const notificationTypeEnum = pgEnum("notification_type", [
  "new_bid",
  "bid_accepted", 
  "bid_rejected",
  "new_message",
  "task_completed",
  "task_cancelled",
  "payment_received",
  "review_received",
  "dispute_created",
  "dispute_resolved",
  "task_assigned",
  "counter_offer"
]);

// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").notNull().default("client"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  totalReviews: integer("total_reviews").default(0),
  totalEarned: decimal("total_earned", { precision: 10, scale: 2 }).default("0"),
  totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).default("0"),
  skills: text("skills").array(),
  bio: text("bio"),
  isBlocked: boolean("is_blocked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category").notNull(),
  budget: decimal("budget", { precision: 10, scale: 2 }).notNull(),
  deadline: timestamp("deadline"),
  priority: varchar("priority").default("normal"),
  skills: text("skills").array(),
  status: taskStatusEnum("status").default("open"),
  assignedFreelancerId: varchar("assigned_freelancer_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bids table
export const bids = pgTable("bids", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id),
  freelancerId: varchar("freelancer_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  deadline: timestamp("deadline").notNull(),
  proposal: text("proposal").notNull(),
  status: bidStatusEnum("status").default("pending"),
  counterOfferAmount: decimal("counter_offer_amount", { precision: 10, scale: 2 }),
  counterOfferDeadline: timestamp("counter_offer_deadline"),
  counterOfferMessage: text("counter_offer_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  receiverId: varchar("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Conversations table for tracking last message times
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id),
  participant1Id: varchar("participant1_id").notNull().references(() => users.id),
  participant2Id: varchar("participant2_id").notNull().references(() => users.id),
  lastMessageTime: timestamp("last_message_time").defaultNow(),
  lastMessageContent: text("last_message_content"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payments table
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id),
  clientId: varchar("client_id").notNull().references(() => users.id),
  freelancerId: varchar("freelancer_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: paymentStatusEnum("status").default("pending"),
  escrowedAt: timestamp("escrowed_at"),
  releasedAt: timestamp("released_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reviews table
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id),
  reviewerId: varchar("reviewer_id").notNull().references(() => users.id),
  revieweeId: varchar("reviewee_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(),
  qualityRating: integer("quality_rating"),
  timelinessRating: integer("timeliness_rating"),
  communicationRating: integer("communication_rating"),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Disputes table
export const disputes = pgTable("disputes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id),
  initiatorId: varchar("initiator_id").notNull().references(() => users.id),
  defendantId: varchar("defendant_id").notNull().references(() => users.id),
  moderatorId: varchar("moderator_id").references(() => users.id),
  reason: text("reason").notNull(),
  status: disputeStatusEnum("status").default("open"),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  relatedEntityId: varchar("related_entity_id"), // task_id, bid_id, message_id, etc.
  relatedEntityType: varchar("related_entity_type"), // "task", "bid", "message", etc.
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
  actionUrl: varchar("action_url"), // URL to navigate to when clicked
  metadata: jsonb("metadata"), // Additional data like user names, etc.
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  clientTasks: many(tasks, { relationName: "clientTasks" }),
  assignedTasks: many(tasks, { relationName: "assignedTasks" }),
  bids: many(bids),
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
  clientPayments: many(payments, { relationName: "clientPayments" }),
  freelancerPayments: many(payments, { relationName: "freelancerPayments" }),
  givenReviews: many(reviews, { relationName: "givenReviews" }),
  receivedReviews: many(reviews, { relationName: "receivedReviews" }),
  notifications: many(notifications),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  client: one(users, {
    fields: [tasks.clientId],
    references: [users.id],
    relationName: "clientTasks",
  }),
  assignedFreelancer: one(users, {
    fields: [tasks.assignedFreelancerId],
    references: [users.id],
    relationName: "assignedTasks",
  }),
  bids: many(bids),
  messages: many(messages),
  payments: many(payments),
  reviews: many(reviews),
  disputes: many(disputes),
}));

export const bidsRelations = relations(bids, ({ one }) => ({
  task: one(tasks, {
    fields: [bids.taskId],
    references: [tasks.id],
  }),
  freelancer: one(users, {
    fields: [bids.freelancerId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  task: one(tasks, {
    fields: [messages.taskId],
    references: [tasks.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sentMessages",
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receivedMessages",
  }),
}));

export const conversationsRelations = relations(conversations, ({ one }) => ({
  task: one(tasks, {
    fields: [conversations.taskId],
    references: [tasks.id],
  }),
  participant1: one(users, {
    fields: [conversations.participant1Id],
    references: [users.id],
  }),
  participant2: one(users, {
    fields: [conversations.participant2Id],
    references: [users.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  task: one(tasks, {
    fields: [payments.taskId],
    references: [tasks.id],
  }),
  client: one(users, {
    fields: [payments.clientId],
    references: [users.id],
    relationName: "clientPayments",
  }),
  freelancer: one(users, {
    fields: [payments.freelancerId],
    references: [users.id],
    relationName: "freelancerPayments",
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  task: one(tasks, {
    fields: [reviews.taskId],
    references: [tasks.id],
  }),
  reviewer: one(users, {
    fields: [reviews.reviewerId],
    references: [users.id],
    relationName: "givenReviews",
  }),
  reviewee: one(users, {
    fields: [reviews.revieweeId],
    references: [users.id],
    relationName: "receivedReviews",
  }),
}));

export const disputesRelations = relations(disputes, ({ one }) => ({
  task: one(tasks, {
    fields: [disputes.taskId],
    references: [tasks.id],
  }),
  initiator: one(users, {
    fields: [disputes.initiatorId],
    references: [users.id],
  }),
  defendant: one(users, {
    fields: [disputes.defendantId],
    references: [users.id],
  }),
  moderator: one(users, {
    fields: [disputes.moderatorId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
}).extend({
  role: z.enum(["client", "freelancer"]).optional(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  assignedFreelancerId: true,
}).extend({
  deadline: z.coerce.date().optional().refine((date) => {
    if (!date) return true; // deadline is optional
    return date > new Date(); // deadline must be in the future
  }, "Дедлайн должен быть установлен на будущую дату"),
});

export const insertBidSchema = createInsertSchema(bids).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
}).extend({
  deadline: z.coerce.date().refine((date) => {
    return date > new Date(); // deadline must be in the future
  }, "Дедлайн заявки должен быть установлен на будущую дату"),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  escrowedAt: true,
  releasedAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

export const insertDisputeSchema = createInsertSchema(disputes).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
  moderatorId: true,
  resolution: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Bid = typeof bids.$inferSelect;
export type InsertBid = z.infer<typeof insertBidSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Dispute = typeof disputes.$inferSelect;
export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
