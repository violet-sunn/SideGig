import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, DollarSign, FileText, Handshake } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface Bid {
  id: string;
  taskId: string;
  freelancerId: string;
  amount: number;
  deadline: string;
  proposal: string;
  status: "pending" | "accepted" | "rejected" | "counter_offer";
  createdAt: string;
  task?: {
    id: string;
    title: string;
    description: string;
    budget: number;
    status: string;
  };
}

export default function MyBids() {
  const { user } = useAuth();

  const { data: bids = [], isLoading } = useQuery<Bid[]>({
    queryKey: ["/api/bids/my"],
    enabled: !!user && user.role === "freelancer",
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "accepted": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      case "counter_offer": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending": return "Ожидает";
      case "accepted": return "Принята";
      case "rejected": return "Отклонена";
      case "counter_offer": return "Контрпредложение";
      default: return status;
    }
  };

  if (!user) {
    return <div>Загрузка...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar userRole={user.role as "freelancer"} />
      
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Мои заявки</h1>
            <p className="text-gray-600">Отслеживайте статус ваших предложений по проектам</p>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : bids.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Handshake className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  У вас пока нет заявок
                </h3>
                <p className="text-gray-500 mb-6">
                  Начните подавать заявки на интересные проекты
                </p>
                <Button>
                  Найти проекты
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {bids.map((bid) => (
                <Card key={bid.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">
                          {bid.task?.title || "Проект"}
                        </CardTitle>
                        <p className="text-gray-600 text-sm line-clamp-2">
                          {bid.task?.description}
                        </p>
                      </div>
                      <Badge className={getStatusColor(bid.status)}>
                        {getStatusText(bid.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center text-sm">
                        <DollarSign className="h-4 w-4 text-green-600 mr-2" />
                        <span className="text-gray-600">Предложение:</span>
                        <span className="font-medium ml-1">{bid.amount.toLocaleString()} ₽</span>
                      </div>
                      
                      <div className="flex items-center text-sm">
                        <Clock className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="text-gray-600">Срок:</span>
                        <span className="font-medium ml-1">
                          {new Date(bid.deadline).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-sm">
                        <FileText className="h-4 w-4 text-purple-600 mr-2" />
                        <span className="text-gray-600">Подана:</span>
                        <span className="font-medium ml-1">
                          {formatDistanceToNow(new Date(bid.createdAt), { 
                            addSuffix: true, 
                            locale: ru 
                          })}
                        </span>
                      </div>
                    </div>

                    {bid.proposal && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Ваше предложение:</h4>
                        <p className="text-gray-700 text-sm">{bid.proposal}</p>
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-4">
                      <div className="text-sm text-gray-500">
                        Бюджет проекта: {bid.task?.budget?.toLocaleString()} ₽
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Подробности
                        </Button>
                        {bid.status === "pending" && (
                          <Button variant="outline" size="sm">
                            Редактировать
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}