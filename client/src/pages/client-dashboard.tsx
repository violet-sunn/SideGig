import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ListTodo, 
  CheckCircle, 
  RussianRuble, 
  Star,
  Plus,
  Users,
  MessageSquare,
  CreditCard,
  BarChart3
} from "lucide-react";
import { Link } from "wouter";

export default function ClientDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

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
    queryKey: ["/api/users/stats"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: recentTasks, isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: ["/api/tasks/my"],
    enabled: isAuthenticated,
    retry: false,
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

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

          {/* Recent ListTodo */}
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
                    <p className="text-gray-500 mb-4">У вас пока нет задач</p>
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
