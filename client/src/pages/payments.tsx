import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Lock, 
  Clock, 
  CheckCircle, 
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle
} from "lucide-react";

export default function Payments() {
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

  const { data: payments, isLoading: paymentsLoading } = useQuery<any[]>({
    queryKey: queryParams ? ["/api/payments", queryParams] : ["/api/payments"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<{
    role: string;
  }>({
    queryKey: queryParams ? ["/api/users/stats", queryParams] : ["/api/users/stats"],
    enabled: isAuthenticated,
    retry: false,
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async ({ paymentId, status }: { paymentId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/payments/${paymentId}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешно!",
        description: "Статус платежа обновлен",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/stats"] });
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
        description: "Не удалось обновить статус платежа",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "escrowed": return <Lock className="h-5 w-5 text-orange-600" />;
      case "pending": return <Clock className="h-5 w-5 text-blue-600" />;
      case "released": return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "refunded": return <ArrowUpRight className="h-5 w-5 text-red-600" />;
      default: return <CreditCard className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "escrowed": return "bg-orange-100 text-orange-800";
      case "pending": return "bg-blue-100 text-blue-800";
      case "released": return "bg-green-100 text-green-800";
      case "refunded": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "escrowed": return "В эскроу";
      case "pending": return "Ожидает подтверждения";
      case "released": return "Выплачено";
      case "refunded": return "Возвращено";
      default: return status;
    }
  };

  // Calculate totals for different statuses
  const escrowedTotal = payments?.filter((p: any) => p.status === "escrowed")
    .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0) || 0;
  
  const pendingTotal = payments?.filter((p: any) => p.status === "pending")
    .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0) || 0;
  
  const releasedTotal = payments?.filter((p: any) => p.status === "released")
    .reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0) || 0;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole={user?.role || "client"} />
      
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Эскроу платежи</h1>
            <p className="text-gray-600">Безопасные сделки с защитой средств</p>
          </div>

          {/* Escrow Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">В эскроу</p>
                    <p className="text-3xl font-bold text-orange-600">
                      ₽{escrowedTotal.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <Lock className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Ожидает подтверждения</p>
                    <p className="text-3xl font-bold text-blue-600">
                      ₽{pendingTotal.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Выплачено</p>
                    <p className="text-3xl font-bold text-green-600">
                      ₽{releasedTotal.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Escrow Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Транзакции</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center space-x-4 p-4 border rounded-lg">
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="w-20 h-6 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : payments && payments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Проект
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {user?.role === "client" ? "Исполнитель" : "Заказчик"}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Сумма
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Статус
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Действия
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payments.map((payment: any) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {payment.task?.title || "Неизвестный проект"}
                              </h4>
                              <p className="text-sm text-gray-500">
                                Создан {new Date(payment.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage 
                                  src={user?.role === "client" 
                                    ? payment.freelancer?.profileImageUrl 
                                    : payment.client?.profileImageUrl
                                  } 
                                />
                                <AvatarFallback className="text-xs">
                                  {user?.role === "client" 
                                    ? `${payment.freelancer?.firstName?.[0] || ""}${payment.freelancer?.lastName?.[0] || ""}`
                                    : `${payment.client?.firstName?.[0] || ""}${payment.client?.lastName?.[0] || ""}`
                                  }
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {user?.role === "client" 
                                    ? (payment.freelancer?.firstName && payment.freelancer?.lastName
                                        ? `${payment.freelancer.firstName} ${payment.freelancer.lastName}`
                                        : "Фрилансер")
                                    : (payment.client?.firstName && payment.client?.lastName
                                        ? `${payment.client.firstName} ${payment.client.lastName}`
                                        : payment.client?.email?.split("@")[0] || "Клиент")
                                  }
                                </p>
                                <p className="text-xs text-gray-500">
                                  {user?.role === "client" ? "Исполнитель" : "Заказчик"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {user?.role === "client" ? (
                                <ArrowUpRight className="h-4 w-4 text-red-500 mr-1" />
                              ) : (
                                <ArrowDownLeft className="h-4 w-4 text-green-500 mr-1" />
                              )}
                              <span className="font-semibold text-gray-900">
                                ₽{Number(payment.amount).toLocaleString()}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={getStatusColor(payment.status)}>
                              <div className="flex items-center">
                                {getStatusIcon(payment.status)}
                                <span className="ml-1">{getStatusText(payment.status)}</span>
                              </div>
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {payment.status === "escrowed" && user?.role === "freelancer" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updatePaymentMutation.mutate({ 
                                  paymentId: payment.id, 
                                  status: "pending" 
                                })}
                                disabled={updatePaymentMutation.isPending}
                              >
                                Запросить выплату
                              </Button>
                            )}
                            {payment.status === "pending" && user?.role === "client" && (
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  onClick={() => updatePaymentMutation.mutate({ 
                                    paymentId: payment.id, 
                                    status: "released" 
                                  })}
                                  disabled={updatePaymentMutation.isPending}
                                >
                                  Подтвердить
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updatePaymentMutation.mutate({ 
                                    paymentId: payment.id, 
                                    status: "refunded" 
                                  })}
                                  disabled={updatePaymentMutation.isPending}
                                >
                                  Отклонить
                                </Button>
                              </div>
                            )}
                            {payment.status === "pending" && user?.role === "freelancer" && (
                              <span className="text-gray-500">Ожидание клиента</span>
                            )}
                            {(payment.status === "released" || payment.status === "refunded") && (
                              <span className="text-gray-500">Завершено</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Нет транзакций</h3>
                  <p className="text-gray-600">
                    {user?.role === "client" 
                      ? "Создайте задачу и выберите исполнителя для начала работы"
                      : "Подайте заявку на проект для начала работы"
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Help Section */}
          <Card className="mt-8">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Как работает эскроу-система?</h3>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p>• Средства блокируются на эскроу-счете после выбора исполнителя</p>
                    <p>• Исполнитель может запросить выплату после завершения работы</p>
                    <p>• Заказчик подтверждает работу и освобождает средства</p>
                    <p>• В случае спора модератор принимает решение о распределении средств</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
