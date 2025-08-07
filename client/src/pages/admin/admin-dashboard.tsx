import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  ShoppingBag, 
  Scale, 
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
    retry: false,
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Админ панель</h1>
        <p className="text-gray-600 mt-2">Управление платформой FreelanceHub</p>
      </div>

      {/* Stats Grid */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <>
          {/* User Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Всего пользователей</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.users.totalUsers}</div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                  <span>Клиенты: {stats.users.totalClients}</span>
                  <span>•</span>
                  <span>Исполнители: {stats.users.totalFreelancers}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Активные проекты</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.tasks.inProgressTasks}</div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span>Всего: {stats.tasks.totalTasks}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Споры</CardTitle>
                <Scale className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.disputes.openDisputes}</div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                  <AlertTriangle className="h-3 w-3 text-yellow-500" />
                  <span>Требуют рассмотрения</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Объем платежей</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₽{Number(stats.payments.totalVolume).toLocaleString()}</div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                  <span>В эскроу: ₽{Number(stats.payments.escrowedAmount).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Статистика проектов</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">Открытые</span>
                    </div>
                    <span className="font-medium">{stats.tasks.openTasks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">В работе</span>
                    </div>
                    <span className="font-medium">{stats.tasks.inProgressTasks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Завершенные</span>
                    </div>
                    <span className="font-medium">{stats.tasks.completedTasks}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dispute Status */}
            <Card>
              <CardHeader>
                <CardTitle>Статистика споров</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-sm">Открытые споры</span>
                    </div>
                    <span className="font-medium">{stats.disputes.openDisputes}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Решенные споры</span>
                    </div>
                    <span className="font-medium">{stats.disputes.resolvedDisputes}</span>
                  </div>
                  {stats.disputes.totalDisputes > 0 && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-600">
                        Процент решенных споров: {Math.round((stats.disputes.resolvedDisputes / stats.disputes.totalDisputes) * 100)}%
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Blocked Users Warning */}
          {stats.users.blockedUsers > 0 && (
            <Card className="mt-6 border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-yellow-800 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Заблокированные пользователи
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-yellow-700">
                  {stats.users.blockedUsers} пользователей заблокированы. 
                  Проверьте раздел "Пользователи" для управления.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">Не удалось загрузить статистику</p>
        </div>
      )}
    </div>
  );
}