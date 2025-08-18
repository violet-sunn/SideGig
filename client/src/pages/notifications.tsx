import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { buildUrl } from "@/lib/navigation";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Bell, 
  Check, 
  Trash2, 
  ArrowLeft,
  Clock,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  User,
  FileText
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { useLocation } from "wouter";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

export default function Notifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Get impersonation parameter for query keys
  const urlParams = new URLSearchParams(window.location.search);
  const impersonateId = urlParams.get('impersonate');
  const isDevelopment = import.meta.env.DEV;
  const shouldImpersonate = isDevelopment && impersonateId;
  const queryParams = shouldImpersonate ? { impersonate: impersonateId } : undefined;

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: queryParams ? ["/api/notifications", queryParams] : ["/api/notifications"],
    enabled: !!user,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return await apiRequest(`/api/notifications/${notificationId}/read`, "PATCH");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryParams ? ['/api/notifications', queryParams] : ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: queryParams ? ['/api/notifications/unread-count', queryParams] : ['/api/notifications/unread-count'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/notifications/read-all', "PATCH");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryParams ? ['/api/notifications', queryParams] : ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: queryParams ? ['/api/notifications/unread-count', queryParams] : ['/api/notifications/unread-count'] });
      toast({
        title: "Успешно!",
        description: "Все уведомления отмечены как прочитанные",
      });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return await apiRequest(`/api/notifications/${notificationId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryParams ? ['/api/notifications', queryParams] : ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: queryParams ? ['/api/notifications/unread-count', queryParams] : ['/api/notifications/unread-count'] });
      toast({
        title: "Успешно!",
        description: "Уведомление удалено",
      });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "bid_accepted": return CheckCircle;
      case "bid_rejected": return AlertCircle;
      case "new_bid": return FileText;
      case "new_message": return MessageSquare;
      case "task_completed": return CheckCircle;
      case "payment_released": return CheckCircle;
      default: return Bell;
    }
  };

  const getNotificationColor = (type: string, isRead: boolean) => {
    const baseColor = isRead ? "bg-gray-50" : "bg-blue-50";
    switch (type) {
      case "bid_accepted": return isRead ? "bg-gray-50" : "bg-green-50";
      case "bid_rejected": return isRead ? "bg-gray-50" : "bg-red-50";
      case "new_bid": return isRead ? "bg-gray-50" : "bg-yellow-50";
      case "payment_released": return isRead ? "bg-gray-50" : "bg-green-50";
      default: return baseColor;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate based on notification type
    if (notification.data?.taskId) {
      setLocation(buildUrl(`/task/${notification.data.taskId}`));
    } else if (notification.type === "new_message" && notification.data?.conversationId) {
      setLocation(buildUrl("/messages"));
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole={user?.role as any} />
      
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setLocation(buildUrl("/"))}
                  className="mb-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Назад
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">Уведомления</h1>
                  <p className="text-gray-600">Все ваши уведомления и обновления</p>
                </div>
              </div>
              {notifications.some(n => !n.isRead) && (
                <Button 
                  variant="outline"
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={markAllAsReadMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  {markAllAsReadMutation.isPending ? "Отмечаю..." : "Прочитать все"}
                </Button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Уведомлений пока нет
                </h3>
                <p className="text-gray-500">
                  Здесь будут отображаться важные обновления и сообщения
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => {
                const IconComponent = getNotificationIcon(notification.type);
                return (
                  <Card 
                    key={notification.id} 
                    className={`cursor-pointer hover:shadow-md transition-shadow ${getNotificationColor(notification.type, notification.isRead)}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className={`p-2 rounded-lg ${
                            notification.type === "bid_accepted" ? "bg-green-100" :
                            notification.type === "bid_rejected" ? "bg-red-100" :
                            notification.type === "new_bid" ? "bg-yellow-100" :
                            notification.type === "payment_released" ? "bg-green-100" :
                            "bg-blue-100"
                          }`}>
                            <IconComponent className={`h-5 w-5 ${
                              notification.type === "bid_accepted" ? "text-green-600" :
                              notification.type === "bid_rejected" ? "text-red-600" :
                              notification.type === "new_bid" ? "text-yellow-600" :
                              notification.type === "payment_released" ? "text-green-600" :
                              "text-blue-600"
                            }`} />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-gray-900">
                                {notification.title}
                              </h3>
                              {!notification.isRead && (
                                <Badge className="bg-blue-100 text-blue-800 text-xs">
                                  Новое
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 mb-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatDistanceToNow(new Date(notification.createdAt), { 
                                addSuffix: true, 
                                locale: ru 
                              })}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          {!notification.isRead && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsReadMutation.mutate(notification.id);
                              }}
                              disabled={markAsReadMutation.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotificationMutation.mutate(notification.id);
                            }}
                            disabled={deleteNotificationMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}