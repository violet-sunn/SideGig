import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart3, 
  TrendingUp,
  Users,
  ShoppingBag,
  DollarSign,
  Calendar,
  Activity,
  PieChart
} from "lucide-react";

export default function AdminAnalytics() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
    retry: false,
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <BarChart3 className="h-8 w-8 mr-3" />
          Аналитика платформы
        </h1>
        <p className="text-gray-600 mt-2">Детальная статистика и метрики платформы</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Общий оборот</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₽{Number(stats.payments.totalVolume).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Всего платежей: {stats.payments.totalPayments}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Активность пользователей</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.users.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.users.blockedUsers > 0 ? `${stats.users.blockedUsers} заблокировано` : 'Все активны'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Успешность проектов</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.tasks.totalTasks > 0 
                    ? Math.round((stats.tasks.completedTasks / stats.tasks.totalTasks) * 100) 
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.tasks.completedTasks} из {stats.tasks.totalTasks} завершены
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Качество сервиса</CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.disputes.totalDisputes > 0 
                    ? Math.round((stats.disputes.resolvedDisputes / stats.disputes.totalDisputes) * 100) 
                    : 100}%
                </div>
                <p className="text-xs text-muted-foreground">Споров решено успешно</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Распределение пользователей
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Клиенты</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-2 bg-blue-500 rounded-full" 
                          style={{ 
                            width: `${stats.users.totalUsers > 0 ? (stats.users.totalClients / stats.users.totalUsers) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{stats.users.totalClients}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Исполнители</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-2 bg-green-500 rounded-full" 
                          style={{ 
                            width: `${stats.users.totalUsers > 0 ? (stats.users.totalFreelancers / stats.users.totalUsers) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{stats.users.totalFreelancers}</span>
                    </div>
                  </div>
                  {stats.users.blockedUsers > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-red-600">Заблокированные</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full">
                          <div 
                            className="h-2 bg-red-500 rounded-full" 
                            style={{ 
                              width: `${stats.users.totalUsers > 0 ? (stats.users.blockedUsers / stats.users.totalUsers) * 100 : 0}%` 
                            }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-red-600">{stats.users.blockedUsers}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Project Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShoppingBag className="h-5 w-5 mr-2" />
                  Статус проектов
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Открытые</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-2 bg-blue-500 rounded-full" 
                          style={{ 
                            width: `${stats.tasks.totalTasks > 0 ? (stats.tasks.openTasks / stats.tasks.totalTasks) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{stats.tasks.openTasks}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">В работе</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-2 bg-yellow-500 rounded-full" 
                          style={{ 
                            width: `${stats.tasks.totalTasks > 0 ? (stats.tasks.inProgressTasks / stats.tasks.totalTasks) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{stats.tasks.inProgressTasks}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Завершенные</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-2 bg-green-500 rounded-full" 
                          style={{ 
                            width: `${stats.tasks.totalTasks > 0 ? (stats.tasks.completedTasks / stats.tasks.totalTasks) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{stats.tasks.completedTasks}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Financial Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Финансовая сводка
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Всего платежей:</span>
                    <span className="font-medium">₽{Number(stats.payments.totalVolume).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">В эскроу:</span>
                    <span className="font-medium text-yellow-600">₽{Number(stats.payments.escrowedAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Количество транзакций:</span>
                    <span className="font-medium">{stats.payments.totalPayments}</span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Средний чек:</span>
                      <span className="font-bold">
                        ₽{stats.payments.totalPayments > 0 
                          ? Math.round(stats.payments.totalVolume / stats.payments.totalPayments).toLocaleString()
                          : 0}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Platform Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Здоровье платформы
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Процент успешных проектов:</span>
                    <span className="font-medium text-green-600">
                      {stats.tasks.totalTasks > 0 
                        ? Math.round((stats.tasks.completedTasks / stats.tasks.totalTasks) * 100) 
                        : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Споров решено:</span>
                    <span className="font-medium">
                      {stats.disputes.resolvedDisputes} из {stats.disputes.totalDisputes}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Заблокированных пользователей:</span>
                    <span className={`font-medium ${stats.users.blockedUsers > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {stats.users.blockedUsers}
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Общая оценка:</span>
                      <span className="font-bold text-green-600">
                        {stats.users.blockedUsers === 0 && stats.disputes.openDisputes < 5 ? 'Отличное' : 
                         stats.users.blockedUsers < 5 && stats.disputes.openDisputes < 10 ? 'Хорошее' : 'Требует внимания'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Не удалось загрузить аналитику</p>
        </div>
      )}
    </div>
  );
}