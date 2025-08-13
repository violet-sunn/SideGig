import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ListTodo, 
  CheckCircle, 
  RussianRuble, 
  Star,
  Plus,
  Users,
  MessageSquare,
  CreditCard,
  BarChart3,
  Clock,
  Eye
} from "lucide-react";
import { Link } from "wouter";

export default function ClientDashboard() {
  console.log('[ClientDashboard] Component loaded');
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();

  // Get impersonation parameter for query keys
  const urlParams = new URLSearchParams(window.location.search);
  const impersonateId = urlParams.get('impersonate');
  const isDevelopment = import.meta.env.DEV;
  const shouldImpersonate = isDevelopment && impersonateId;
  const queryParams = shouldImpersonate ? { impersonate: impersonateId } : undefined;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery<{
    activeTasks: string;
    completedTasks: string;
    totalSpent: string;
    averageRating: string;
  }>({
    queryKey: queryParams ? ["/api/users/stats", queryParams] : ["/api/users/stats"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: recentTasks, isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: queryParams ? ["/api/tasks/my", queryParams] : ["/api/tasks/my"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: pendingBids, isLoading: bidsLoading } = useQuery<any[]>({
    queryKey: queryParams ? ["/api/bids/pending", queryParams] : ["/api/bids/pending"],
    enabled: isAuthenticated,
    retry: false,
  });

  const updateBidMutation = useMutation({
    mutationFn: async ({ bidId, status }: { bidId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/bids/${bidId}/status`, { status });
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Успешно!",
        description: variables.status === "accepted" ? "Заявка принята" : "Заявка отклонена",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bids/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/stats"] });
      if (queryParams) {
        queryClient.invalidateQueries({ queryKey: ["/api/bids/pending", queryParams] });
        queryClient.invalidateQueries({ queryKey: ["/api/tasks/my", queryParams] });
        queryClient.invalidateQueries({ queryKey: ["/api/users/stats", queryParams] });
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус заявки",
        variant: "destructive",
      });
    },
  });



  console.log('[ClientDashboard] Auth state:', { isLoading, isAuthenticated, user: !!user });

  if (isLoading) {
    console.log('[ClientDashboard] Showing loading...');
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    console.log('[ClientDashboard] Not authenticated or no user, returning null');
    return null;
  }

  console.log('[ClientDashboard] Rendering dashboard for user:', user.id);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-blue-100 text-blue-800";
      case "in_progress": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "open": return "Открыта";
      case "in_progress": return "В работе";
      case "completed": return "Завершена";
      case "cancelled": return "Отменена";
      default: return status;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole="client" />
      
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Дашборд заказчика</h1>
            <p className="text-gray-600">Обзор ваших задач и активности</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Активные задачи</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {statsLoading ? "..." : stats?.activeTasks || 0}
                    </p>
                  </div>
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <ListTodo className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Завершенные</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {statsLoading ? "..." : stats?.completedTasks || 0}
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Потрачено</p>
                    <p className="text-3xl font-bold text-gray-900">
                      ₽{statsLoading ? "..." : Number(stats?.totalSpent || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <RussianRuble className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Средний рейтинг</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {statsLoading ? "..." : Number(stats?.averageRating || 0).toFixed(1)}
                    </p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-lg">
                    <Star className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pending Bids */}
          {pendingBids && pendingBids.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-orange-600" />
                  Новые заявки ({pendingBids.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bidsLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingBids.map((bid: any) => (
                      <div key={bid.id} className="border rounded-lg p-4 bg-orange-50">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>
                                {bid.freelancer?.firstName?.[0]}{bid.freelancer?.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {bid.freelancer?.firstName} {bid.freelancer?.lastName}
                              </h4>
                              <p className="text-sm text-gray-600 mb-2">{bid.task?.title}</p>
                              <p className="text-sm text-gray-700 mb-3">{bid.proposal}</p>
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <span className="font-semibold text-primary">₽{Number(bid.amount).toLocaleString()}</span>
                                <span>Срок: {new Date(bid.deadline).toLocaleDateString()}</span>
                                <span>Подана {new Date(bid.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <Button
                              size="sm"
                              onClick={() => updateBidMutation.mutate({ bidId: bid.id, status: "accepted" })}
                              disabled={updateBidMutation.isPending}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              Принять
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateBidMutation.mutate({ bidId: bid.id, status: "rejected" })}
                              disabled={updateBidMutation.isPending}
                              className="border-red-300 text-red-700 hover:bg-red-50"
                            >
                              Отклонить
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent Tasks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Недавние задачи</CardTitle>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : recentTasks && recentTasks.length > 0 ? (
                  <div className="space-y-4">
                    {recentTasks.slice(0, 3).map((task: any) => (
                      <div key={task.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{task.title}</h4>
                          <p className="text-sm text-gray-500">
                            Создан {new Date(task.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge className={getStatusColor(task.status)}>
                            {getStatusText(task.status)}
                          </Badge>
                          <span className="font-semibold text-gray-900">
                            ₽{Number(task.budget).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ListTodo className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">У Вас пока нет задач</p>
                    <Link href="/create-task">
                      <span className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                        <Plus className="h-4 w-4 mr-2" />
                        Создать первую задачу
                      </span>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Быстрые действия</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link href="/create-task">
                  <span className="flex items-center p-4 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer">
                    <Plus className="h-6 w-6 text-primary mr-3" />
                    <div>
                      <h4 className="font-medium text-gray-900">Создать задачу</h4>
                      <p className="text-sm text-gray-600">Опубликуйте новую задачу для исполнителей</p>
                    </div>
                  </span>
                </Link>

                <Link href="/tasks">
                  <span className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                    <ListTodo className="h-6 w-6 text-green-600 mr-3" />
                    <div>
                      <h4 className="font-medium text-gray-900">Мои задачи</h4>
                      <p className="text-sm text-gray-600">Управление задачами и заявками</p>
                    </div>
                  </span>
                </Link>

                <Link href="/messages">
                  <span className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
                    <MessageSquare className="h-6 w-6 text-blue-600 mr-3" />
                    <div>
                      <h4 className="font-medium text-gray-900">Сообщения</h4>
                      <p className="text-sm text-gray-600">Общение с исполнителями</p>
                    </div>
                  </span>
                </Link>

                <Link href="/payments">
                  <span className="flex items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer">
                    <CreditCard className="h-6 w-6 text-orange-600 mr-3" />
                    <div>
                      <h4 className="font-medium text-gray-900">Платежи</h4>
                      <p className="text-sm text-gray-600">Управление эскроу-счетом</p>
                    </div>
                  </span>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
