import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import type { Notification } from '@shared/schema';

interface WebSocketMessage {
  type: 'connection_established' | 'new_notification' | 'notification_read' | 'all_notifications_read';
  notification?: Notification;
  notificationId?: string;
  message?: string;
}

export function useNotifications() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // Fetch notifications
  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute fallback
  });

  // Fetch unread count
  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    enabled: isAuthenticated,
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 30 * 1000, // 30 seconds
  });

  const unreadCount = unreadCountData?.count || 0;

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return await apiRequest('PATCH', `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('PATCH', '/api/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  // Delete notification
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return await apiRequest('DELETE', `/api/notifications/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  // WebSocket connection
  const connectWebSocket = () => {
    if (!isAuthenticated || !user?.id) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?userId=${user.id}`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected - Real-time notifications enabled');
        setIsConnected(true);
        setConnectionAttempts(0);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'connection_established':
              console.log('Notifications:', message.message);
              break;
              
            case 'new_notification':
              if (message.notification) {
                // Show toast notification
                toast({
                  title: message.notification.title,
                  description: message.notification.message,
                  duration: 5000,
                });
                
                // Update cache
                queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
                queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
              }
              break;
              
            case 'notification_read':
            case 'all_notifications_read':
              // Update cache when notifications are read
              queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
              queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code);
        setIsConnected(false);
        
        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && isAuthenticated && connectionAttempts < 5) {
          const delay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000); // Exponential backoff
          console.log(`Attempting to reconnect WebSocket in ${delay}ms...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setConnectionAttempts(prev => prev + 1);
            connectWebSocket();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  };

  // Send WebSocket message
  const sendWebSocketMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  // Mark notification as read with WebSocket
  const markNotificationAsRead = (notificationId: string) => {
    // Send WebSocket message for real-time update
    sendWebSocketMessage({
      type: 'mark_notification_read',
      notificationId
    });
    
    // Also call API mutation
    markAsReadMutation.mutate(notificationId);
  };

  // Mark all notifications as read with WebSocket
  const markAllNotificationsAsRead = () => {
    // Send WebSocket message for real-time update
    sendWebSocketMessage({
      type: 'mark_all_read'
    });
    
    // Also call API mutation
    markAllAsReadMutation.mutate();
  };

  // Setup WebSocket connection
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      connectWebSocket();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000); // Clean close
      }
    };
  }, [isAuthenticated, user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000);
      }
    };
  }, []);

  return {
    notifications: notifications || [],
    unreadCount,
    isLoading,
    isConnected,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification: deleteNotificationMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isDeletingNotification: deleteNotificationMutation.isPending,
  };
}