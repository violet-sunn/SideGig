import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { storage } from './storage';
import type { InsertNotification, Notification } from '@shared/schema';

// Store active WebSocket connections by user ID
const userConnections = new Map<string, Set<WebSocket>>();

export function setupWebSocketServer(httpServer: Server) {
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws'
  });

  wss.on('connection', (ws: WebSocket, request) => {
    console.log('New WebSocket connection');
    
    // Extract user ID from query parameters or headers
    const url = new URL(request.url!, `http://${request.headers.host}`);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      console.log('WebSocket connection rejected: No user ID provided');
      ws.close(1008, 'User ID required');
      return;
    }

    // Add connection to user's connection set
    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }
    userConnections.get(userId)!.add(ws);
    console.log(`WebSocket connection established for user: ${userId}`);

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: 'connection_established',
      message: 'Real-time notifications enabled'
    }));

    // Handle WebSocket close
    ws.on('close', () => {
      console.log(`WebSocket connection closed for user: ${userId}`);
      const userWs = userConnections.get(userId);
      if (userWs) {
        userWs.delete(ws);
        if (userWs.size === 0) {
          userConnections.delete(userId);
        }
      }
    });

    // Handle WebSocket messages (for marking notifications as read)
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'mark_notification_read' && message.notificationId) {
          await storage.markNotificationAsRead(message.notificationId);
          
          // Broadcast read status to all user's connections
          broadcastToUser(userId, {
            type: 'notification_read',
            notificationId: message.notificationId
          });
        }
        
        if (message.type === 'mark_all_read') {
          await storage.markAllNotificationsAsRead(userId);
          
          // Broadcast to all user's connections
          broadcastToUser(userId, {
            type: 'all_notifications_read'
          });
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
  });

  return wss;
}

// Broadcast message to all connections of a specific user
export function broadcastToUser(userId: string, message: any) {
  const userWs = userConnections.get(userId);
  if (!userWs) return;

  const messageStr = JSON.stringify(message);
  
  userWs.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });
}

// Broadcast to multiple users
export function broadcastToUsers(userIds: string[], message: any) {
  userIds.forEach(userId => broadcastToUser(userId, message));
}

// Create and broadcast notification
export async function createAndBroadcastNotification(notificationData: InsertNotification) {
  try {
    // Create notification in database
    const notification = await storage.createNotification(notificationData);
    
    // Broadcast real-time notification
    broadcastToUser(notificationData.userId, {
      type: 'new_notification',
      notification
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

// Notification helper functions for different types of events
export class NotificationService {
  
  // New bid notification
  static async notifyNewBid(taskId: string, clientId: string, freelancerName: string, amount: string) {
    return await createAndBroadcastNotification({
      userId: clientId,
      type: 'new_bid',
      title: 'Новая заявка на задачу',
      message: `${freelancerName} подал заявку на сумму ₽${amount}`,
      relatedEntityId: taskId,
      relatedEntityType: 'task',
      actionUrl: `/task/${taskId}`,
      metadata: { freelancerName, amount }
    });
  }

  // Bid accepted notification
  static async notifyBidAccepted(taskId: string, freelancerId: string, clientName: string, taskTitle: string) {
    return await createAndBroadcastNotification({
      userId: freelancerId,
      type: 'bid_accepted',
      title: 'Заявка принята!',
      message: `${clientName} принял вашу заявку на задачу "${taskTitle}"`,
      relatedEntityId: taskId,
      relatedEntityType: 'task',
      actionUrl: `/task/${taskId}`,
      metadata: { clientName, taskTitle }
    });
  }

  // Bid rejected notification
  static async notifyBidRejected(taskId: string, freelancerId: string, clientName: string, taskTitle: string) {
    return await createAndBroadcastNotification({
      userId: freelancerId,
      type: 'bid_rejected',
      title: 'Заявка отклонена',
      message: `${clientName} отклонил вашу заявку на задачу "${taskTitle}"`,
      relatedEntityId: taskId,
      relatedEntityType: 'task',
      actionUrl: `/task/${taskId}`,
      metadata: { clientName, taskTitle }
    });
  }

  // New message notification
  static async notifyNewMessage(taskId: string, receiverId: string, senderName: string, taskTitle: string) {
    return await createAndBroadcastNotification({
      userId: receiverId,
      type: 'new_message',
      title: 'Новое сообщение',
      message: `${senderName} отправил сообщение по задаче "${taskTitle}"`,
      relatedEntityId: taskId,
      relatedEntityType: 'message',
      actionUrl: `/task/${taskId}?tab=communication`,
      metadata: { senderName, taskTitle }
    });
  }

  // Task completed notification
  static async notifyTaskCompleted(taskId: string, clientId: string, freelancerName: string, taskTitle: string) {
    return await createAndBroadcastNotification({
      userId: clientId,
      type: 'task_completed',
      title: 'Задача завершена',
      message: `${freelancerName} завершил задачу "${taskTitle}"`,
      relatedEntityId: taskId,
      relatedEntityType: 'task',
      actionUrl: `/task/${taskId}`,
      metadata: { freelancerName, taskTitle }
    });
  }

  // Task assigned notification  
  static async notifyTaskAssigned(taskId: string, freelancerId: string, clientName: string, taskTitle: string) {
    return await createAndBroadcastNotification({
      userId: freelancerId,
      type: 'task_assigned',
      title: 'Задача назначена',
      message: `Вам назначена задача "${taskTitle}" от ${clientName}`,
      relatedEntityId: taskId,
      relatedEntityType: 'task',
      actionUrl: `/task/${taskId}`,
      metadata: { clientName, taskTitle }
    });
  }

  // Counter offer notification
  static async notifyCounterOffer(bidId: string, freelancerId: string, clientName: string, amount: string) {
    return await createAndBroadcastNotification({
      userId: freelancerId,
      type: 'counter_offer',
      title: 'Контрпредложение',
      message: `${clientName} предложил новую сумму: ₽${amount}`,
      relatedEntityId: bidId,
      relatedEntityType: 'bid',
      actionUrl: `/bids`,
      metadata: { clientName, amount }
    });
  }

  // Review received notification
  static async notifyReviewReceived(taskId: string, revieweeId: string, reviewerName: string, rating: number, taskTitle: string) {
    return await createAndBroadcastNotification({
      userId: revieweeId,
      type: 'review_received',
      title: 'Новый отзыв',
      message: `${reviewerName} оставил отзыв (${rating}/5) за задачу "${taskTitle}"`,
      relatedEntityId: taskId,
      relatedEntityType: 'review',
      actionUrl: `/profile?tab=reviews`,
      metadata: { reviewerName, rating, taskTitle }
    });
  }

  // Dispute created notification
  static async notifyDisputeCreated(disputeId: string, defendantId: string, initiatorName: string, taskTitle: string) {
    return await createAndBroadcastNotification({
      userId: defendantId,
      type: 'dispute_created',
      title: 'Создан спор',
      message: `${initiatorName} создал спор по задаче "${taskTitle}"`,
      relatedEntityId: disputeId,
      relatedEntityType: 'dispute',
      actionUrl: `/disputes/${disputeId}`,
      metadata: { initiatorName, taskTitle }
    });
  }
}