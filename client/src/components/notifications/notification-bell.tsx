import { useState } from 'react';
import { Bell, X, Check, CheckCheck, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { buildUrl } from '@/lib/navigation';
import type { Notification } from '@shared/schema';

function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onDelete 
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
    
    // Navigate to action URL if provided, preserving impersonation
    if (notification.actionUrl) {
      // Extract path from URL and use buildUrl to preserve impersonation
      const url = new URL(notification.actionUrl, window.location.origin);
      const cleanPath = url.pathname;
      window.location.href = buildUrl(cleanPath);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_bid':
        return '💼';
      case 'bid_accepted':
        return '✅';
      case 'bid_rejected':
        return '❌';
      case 'new_message':
        return '💬';
      case 'task_completed':
        return '🎉';
      case 'task_assigned':
        return '📋';
      case 'payment_received':
        return '💰';
      case 'review_received':
        return '⭐';
      case 'dispute_created':
        return '⚠️';
      case 'dispute_resolved':
        return '✅';
      case 'counter_offer':
        return '🔄';
      default:
        return '🔔';
    }
  };

  return (
    <div
      className={`p-3 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
        !notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <span className="text-lg flex-shrink-0 mt-0.5">
            {getNotificationIcon(notification.type)}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className={`text-sm font-medium truncate ${
                !notification.isRead ? 'text-gray-900' : 'text-gray-700'
              }`}>
                {notification.title}
              </p>
              <div className="flex items-center space-x-1 ml-2">
                {notification.actionUrl && (
                  <ExternalLink className="h-3 w-3 text-gray-400" />
                )}
                {!notification.isRead && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
              {notification.message}
            </p>
            <p className="text-xs text-gray-500">
              {notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt), {
                locale: ru
              }) + ' назад' : 'Недавно'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-1 ml-2">
          {!notification.isRead && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification.id);
              }}
              className="h-6 w-6 p-0 hover:bg-blue-100"
            >
              <Check className="h-3 w-3 text-blue-600" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
            className="h-6 w-6 p-0 hover:bg-red-100"
          >
            <X className="h-3 w-3 text-red-600" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    isLoading,
    isConnected,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    isMarkingAllAsRead,
  } = useNotifications();
  
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between px-4 py-2">
          <DropdownMenuLabel className="p-0 font-semibold">
            Уведомления
            {isConnected && (
              <span className="ml-2 text-xs text-green-600 font-normal">
                • В реальном времени
              </span>
            )}
          </DropdownMenuLabel>
          
          {notifications.length > 0 && (
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllNotificationsAsRead}
                disabled={isMarkingAllAsRead || unreadCount === 0}
                className="h-7 px-2 text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Прочитать все
              </Button>
            </div>
          )}
        </div>
        
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-96">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full mx-auto mb-2"></div>
              Загрузка уведомлений...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium mb-1">Нет уведомлений</p>
              <p className="text-xs">Вы будете получать уведомления о новых заявках, сообщениях и обновлениях проектов</p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markNotificationAsRead}
                  onDelete={deleteNotification}
                />
              ))}
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs text-gray-600"
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = '/notifications';
                }}
              >
                Посмотреть все уведомления
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}