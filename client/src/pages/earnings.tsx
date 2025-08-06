import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Download,
  Wallet,
  CreditCard 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface Earning {
  id: string;
  taskId: string;
  amount: number;
  status: string;
  type: "payment" | "bonus" | "penalty";
  createdAt: string;
  task?: {
    title: string;
    clientId: string;
  };
}

interface EarningsStats {
  totalEarnings: number;
  thisMonth: number;
  pending: number;
  completed: number;
}

export default function Earnings() {
  const { user } = useAuth();

  const { data: earnings = [], isLoading: earningsLoading } = useQuery<Earning[]>({
    queryKey: ["/api/earnings"],
    enabled: !!user && user.role === "freelancer",
  });

  const { data: stats, isLoading: statsLoading } = useQuery<EarningsStats>({
    queryKey: ["/api/earnings/stats"],
    enabled: !!user && user.role === "freelancer",
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "processing": return "bg-blue-100 text-blue-800";
      case "failed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed": return "Получено";
      case "pending": return "Ожидает";
      case "processing": return "Обработка";
      case "failed": return "Ошибка";
      default: return status;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "payment": return DollarSign;
      case "bonus": return TrendingUp;
      case "penalty": return CreditCard;
      default: return DollarSign;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case "payment": return "Оплата за проект";
      case "bonus": return "Бонус";
      case "penalty": return "Штраф";
      default: return type;
    }
  };

  if (!user) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole={user.role as "freelancer"} />
      
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Доходы</h1>
            <p className="text-gray-600">Отслеживайте ваши заработки и транзакции</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Wallet className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Всего заработано</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statsLoading ? "..." : `${stats?.totalEarnings?.toLocaleString() || 0} ₽`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">За этот месяц</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statsLoading ? "..." : `${stats?.thisMonth?.toLocaleString() || 0} ₽`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Ожидает выплаты</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statsLoading ? "..." : `${stats?.pending?.toLocaleString() || 0} ₽`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Завершено</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statsLoading ? "..." : `${stats?.completed?.toLocaleString() || 0} ₽`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">История транзакций</h2>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Скачать отчет
            </Button>
          </div>

          {/* Earnings List */}
          {earningsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : earnings.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Пока нет доходов
                </h3>
                <p className="text-gray-500 mb-6">
                  Завершите проекты чтобы начать зарабатывать
                </p>
                <Button>
                  Найти проекты
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {earnings.map((earning) => {
                const TypeIcon = getTypeIcon(earning.type);
                return (
                  <Card key={earning.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="p-2 bg-gray-100 rounded-lg mr-4">
                            <TypeIcon className="h-5 w-5 text-gray-600" />
                          </div>
                          
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {getTypeText(earning.type)}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {earning.task?.title || "Неизвестный проект"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(earning.createdAt), { 
                                addSuffix: true, 
                                locale: ru 
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="text-lg font-semibold text-gray-900">
                                {earning.type === "penalty" ? "-" : "+"}{earning.amount.toLocaleString()} ₽
                              </p>
                              <Badge className={getStatusColor(earning.status)}>
                                {getStatusText(earning.status)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          </div>
        </div>
      </main>
    </div>
  );
}