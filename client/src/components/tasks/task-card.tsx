import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Calendar, 
  DollarSign, 
  Clock, 
  Tag,
  MessageSquare,
  HandHelping,
  AlertCircle
} from "lucide-react";

interface TaskCardProps {
  task: any;
  showBidButton?: boolean;
  showClientInfo?: boolean;
  autoOpenBid?: boolean;
}

export default function TaskCard({ task, showBidButton = false, showClientInfo = true, autoOpenBid = false }: TaskCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(autoOpenBid);
  const [responseType, setResponseType] = useState<"accept" | "propose">("accept");
  const [bidData, setBidData] = useState({
    amount: "",
    deadline: "",
    proposal: "",
  });

  const submitBidMutation = useMutation({
    mutationFn: async (bidInfo: any) => {
      const response = await apiRequest("POST", "/api/bids", bidInfo);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешно!",
        description: "Заявка отправлена",
      });
      setIsDialogOpen(false);
      setBidData({ amount: "", deadline: "", proposal: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/bids/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/available"] });
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
        description: "Не удалось отправить заявку",
        variant: "destructive",
      });
    },
  });

  const handleSubmitBid = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (responseType === "accept") {
      // Простой отклик на условия задачи
      submitBidMutation.mutate({
        taskId: task.id,
        amount: task.budget,
        deadline: new Date(task.deadline).toISOString(),
        proposal: bidData.proposal || "Готов выполнить задачу на указанных условиях.",
      });
    } else {
      // Предложение своих условий
      if (!bidData.amount || !bidData.deadline || !bidData.proposal) {
        toast({
          title: "Ошибка",
          description: "Заполните все поля для собственного предложения",
          variant: "destructive",
        });
        return;
      }

      submitBidMutation.mutate({
        taskId: task.id,
        amount: parseFloat(bidData.amount),
        deadline: new Date(bidData.deadline).toISOString(),
        proposal: bidData.proposal,
      });
    }
  };

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "normal": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case "urgent": return "Срочно";
      case "high": return "Высокий";
      case "normal": return "Обычный";
      default: return priority;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{task.title}</h3>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center">
                <Tag className="h-4 w-4 mr-1" />
                {task.category}
              </div>
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 mr-1" />
                ₽{Number(task.budget).toLocaleString()}
              </div>
              {task.deadline && (
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {new Date(task.deadline).toLocaleDateString()}
                </div>
              )}
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {new Date(task.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <Badge className={getStatusColor(task.status)}>
              {getStatusText(task.status)}
            </Badge>
            {task.priority !== "normal" && (
              <Badge className={getPriorityColor(task.priority)}>
                {getPriorityText(task.priority)}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <p className="text-gray-700 mb-4 line-clamp-3">{task.description}</p>

        {task.skills && task.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {task.skills.map((skill: string) => (
              <Badge key={skill} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        )}

        {showClientInfo && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {task.client?.firstName?.[0]}{task.client?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {task.client?.firstName && task.client?.lastName 
                    ? `${task.client.firstName} ${task.client.lastName}`
                    : "Клиент"
                  }
                </p>
                <p className="text-xs text-gray-500">
                  ⭐ {Number(task.client?.rating || 0).toFixed(1)} ({task.client?.totalReviews || 0} отзывов)
                </p>
              </div>
            </div>

            {showBidButton && task.status === "open" && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <HandHelping className="h-4 w-4 mr-2" />
                    Подать заявку
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Подать заявку на "{task.title}"</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmitBid} className="space-y-4">
                    {/* Переключатель типа отклика */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Тип отклика</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant={responseType === "accept" ? "default" : "outline"}
                          onClick={() => setResponseType("accept")}
                          className="h-auto p-4 flex flex-col items-start"
                        >
                          <HandHelping className="h-5 w-5 mb-2" />
                          <div className="text-left">
                            <div className="font-medium">Откликнуться</div>
                            <div className="text-xs text-muted-foreground">
                              На условиях заказчика
                            </div>
                          </div>
                        </Button>
                        <Button
                          type="button"
                          variant={responseType === "propose" ? "default" : "outline"}
                          onClick={() => setResponseType("propose")}
                          className="h-auto p-4 flex flex-col items-start"
                        >
                          <MessageSquare className="h-5 w-5 mb-2" />
                          <div className="text-left">
                            <div className="font-medium">Предложить</div>
                            <div className="text-xs text-muted-foreground">
                              Свои условия
                            </div>
                          </div>
                        </Button>
                      </div>
                    </div>

                    {/* Условия заказчика */}
                    {responseType === "accept" && (
                      <div className="bg-blue-50 p-4 rounded-lg border">
                        <h4 className="font-medium text-blue-900 mb-3">Условия заказчика:</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 text-blue-600 mr-2" />
                            <span className="text-blue-800">
                              Бюджет: {task.budget?.toLocaleString()} ₽
                            </span>
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-blue-600 mr-2" />
                            <span className="text-blue-800">
                              Срок: {new Date(task.deadline).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Поля для собственных условий */}
                    {responseType === "propose" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="amount">Ваша цена (₽) *</Label>
                          <Input
                            id="amount"
                            type="number"
                            value={bidData.amount}
                            onChange={(e) => setBidData(prev => ({ ...prev, amount: e.target.value }))}
                            placeholder="Введите сумму"
                            min="0"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="deadline">Срок выполнения *</Label>
                          <Input
                            id="deadline"
                            type="date"
                            value={bidData.deadline}
                            onChange={(e) => setBidData(prev => ({ ...prev, deadline: e.target.value }))}
                            min={new Date().toISOString().split("T")[0]}
                            required
                          />
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <Label htmlFor="proposal">
                        {responseType === "accept" ? "Сообщение (необязательно)" : "Предложение *"}
                      </Label>
                      <Textarea
                        id="proposal"
                        value={bidData.proposal}
                        onChange={(e) => setBidData(prev => ({ ...prev, proposal: e.target.value }))}
                        placeholder={
                          responseType === "accept" 
                            ? "Добавьте сообщение о вашем опыте или подходе к решению задачи..."
                            : "Опишите ваш подход к решению задачи, опыт и почему именно вас стоит выбрать..."
                        }
                        className="min-h-[120px]"
                        required={responseType === "propose"}
                      />
                    </div>

                    {/* Рекомендации */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium mb-1">
                            {responseType === "accept" ? "Совет:" : "Рекомендации:"}
                          </p>
                          {responseType === "accept" ? (
                            <p className="text-xs">
                              Простой отклик быстрее привлекает внимание заказчика. 
                              Добавьте краткое сообщение о своем опыте, чтобы выделиться среди других.
                            </p>
                          ) : (
                            <ul className="space-y-1 text-xs">
                              <li>• Подробно опишите ваш опыт работы с подобными проектами</li>
                              <li>• Укажите примеры выполненных работ</li>
                              <li>• Объясните ваш подход к решению задачи</li>
                              <li>• Будьте честны в оценке сроков</li>
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Отмена
                      </Button>
                      <Button type="submit" disabled={submitBidMutation.isPending}>
                        {submitBidMutation.isPending 
                          ? "Отправка..." 
                          : responseType === "accept" 
                            ? "Откликнуться" 
                            : "Отправить заявку"
                        }
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
