import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useParams } from "wouter";
import { useNavigate } from "@/hooks/useNavigate";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  DollarSign, 
  User, 
  Clock, 
  ArrowLeft,
  MessageSquare,
  Send,
  CheckSquare,
  Users,
  Eye,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Settings
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ru } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";

interface Task {
  id: string;
  title: string;
  description: string;
  budget: number;
  deadline: string;
  status: string;
  category: string;
  skills: string[];
  clientId: string;
  assignedFreelancerId?: string;
  createdAt: string;
  client?: {
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
}

interface Bid {
  id: string;
  taskId: string;
  freelancerId: string;
  amount: number;
  deadline: string;
  proposal: string;
  status: string;
  createdAt: string;
  freelancer?: {
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
}

export default function TaskDetail() {
  const { user } = useAuth();
  const params = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [bidAmount, setBidAmount] = useState("");
  const [bidDeadline, setBidDeadline] = useState<Date | null>(null);
  const [bidProposal, setBidProposal] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [newMessage, setNewMessage] = useState("");
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const taskId = params.id;

  const { data: task, isLoading: taskLoading } = useQuery<Task>({
    queryKey: [`/api/tasks/${taskId}`],
    enabled: !!taskId,
  });

  const { data: bids = [], isLoading: bidsLoading } = useQuery<Bid[]>({
    queryKey: ["/api/bids/task", taskId],
    enabled: !!taskId,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<any[]>({
    queryKey: [`/api/messages/task/${taskId}`],
    enabled: !!taskId,
  });

  const createBidMutation = useMutation({
    mutationFn: async (bidData: any) => {
      return await apiRequest("/api/bids", "POST", bidData);
    },
    onSuccess: () => {
      toast({ title: "Заявка отправлена!", description: "Ваша заявка успешно отправлена заказчику" });
      queryClient.invalidateQueries({ queryKey: ["/api/bids/task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["/api/bids/my"] });
      setBidAmount("");
      setBidDeadline(null);
      setBidProposal("");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Ошибка авторизации", description: "Войдите в систему для отправки заявки", variant: "destructive" });
        setTimeout(() => window.location.href = "/api/login", 500);
        return;
      }
      toast({ title: "Ошибка", description: "Не удалось отправить заявку", variant: "destructive" });
    },
  });

  const acceptBidMutation = useMutation({
    mutationFn: async (bidId: string) => {
      return await apiRequest(`/api/bids/${bidId}/accept`, "PATCH");
    },
    onSuccess: () => {
      toast({ title: "Заявка принята!", description: "Исполнитель назначен на проект" });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/bids/task", taskId] });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: "Не удалось принять заявку", variant: "destructive" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("/api/messages", "POST", {
        taskId,
        content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/messages/task/${taskId}`] });
      setNewMessage("");
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: "Не удалось отправить сообщение", variant: "destructive" });
    },
  });

  const submitWorkMutation = useMutation({
    mutationFn: async (data: { deliveryMessage: string }) => {
      return await apiRequest(`/api/tasks/${taskId}/submit`, "PATCH", data);
    },
    onSuccess: () => {
      toast({ title: "Работа отправлена!", description: "Работа отправлена заказчику на проверку" });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
      setDeliveryMessage("");
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: "Не удалось отправить работу", variant: "destructive" });
    },
  });

  const approveWorkMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/tasks/${taskId}/approve`, "PATCH");
    },
    onSuccess: () => {
      toast({ title: "Работа принята!", description: "Проект успешно завершен" });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: "Не удалось принять работу", variant: "destructive" });
    },
  });

  const rejectWorkMutation = useMutation({
    mutationFn: async (data: { rejectionReason: string }) => {
      return await apiRequest(`/api/tasks/${taskId}/reject`, "PATCH", data);
    },
    onSuccess: () => {
      toast({ title: "Работа отклонена", description: "Фрилансер уведомлен об изменениях" });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
      setRejectionReason("");
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: "Не удалось отклонить работу", variant: "destructive" });
    },
  });

  const handleSubmitBid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bidAmount || !bidDeadline || !bidProposal) return;

    createBidMutation.mutate({
      taskId,
      amount: parseFloat(bidAmount),
      deadline: bidDeadline,
      proposal: bidProposal,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-green-100 text-green-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "in_review": return "bg-orange-100 text-orange-800";
      case "completed": return "bg-gray-100 text-gray-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "open": return "Открыта";
      case "in_progress": return "В работе";
      case "in_review": return "На проверке";
      case "completed": return "Завершена";
      case "cancelled": return "Отменена";
      default: return status;
    }
  };

  if (!user) {
    return <div>Загрузка...</div>;
  }

  if (taskLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar userRole={user.role as any} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            <div className="max-w-4xl mx-auto">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
                <div className="h-32 bg-gray-200 rounded mb-4"></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar userRole={user.role as any} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-2xl font-bold mb-4">Задача не найдена</h1>
              <Button onClick={() => navigate("/browse-tasks")}>
                Вернуться к задачам
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const userHasBid = bids.some(bid => bid.freelancerId === user.id);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole={user.role as any} />
      
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <Button 
                variant="ghost" 
                onClick={() => navigate("/browse-tasks")}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад к задачам
              </Button>
              
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {task.title}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Категория: {task.category}</span>
                    <span>•</span>
                    <span>Опубликовано {formatDistanceToNow(new Date(task.createdAt), { 
                      addSuffix: true, 
                      locale: ru 
                    })}</span>
                  </div>
                </div>
                <Badge className={getStatusColor(task.status)}>
                  {getStatusText(task.status)}
                </Badge>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b mb-6">
                {user.role === "client" && user.id === task.clientId ? (
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview" className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Обзор
                    </TabsTrigger>
                    <TabsTrigger value="bids" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Заявки ({bids.length})
                    </TabsTrigger>
                    <TabsTrigger value="communication" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Общение
                    </TabsTrigger>
                  </TabsList>
                ) : (
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="overview" className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Обзор
                    </TabsTrigger>
                    <TabsTrigger value="communication" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Общение
                    </TabsTrigger>
                  </TabsList>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Описание задачи</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 whitespace-pre-wrap mb-6">
                          {task.description}
                        </p>
                        
                        {task.skills && task.skills.length > 0 && (
                          <div className="border-t pt-4">
                            <h4 className="font-medium text-gray-900 mb-3">
                              Требуемые навыки:
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {task.skills.map((skill, index) => (
                                <Badge key={index} variant="secondary">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Bid Form for Freelancers */}
                    {user.role === "freelancer" && task.status === "open" && !userHasBid && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Send className="h-5 w-5" />
                            Подать заявку
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <form onSubmit={handleSubmitBid} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="amount">Стоимость (₽)</Label>
                                <Input
                                  id="amount"
                                  type="number"
                                  value={bidAmount}
                                  onChange={(e) => setBidAmount(e.target.value)}
                                  placeholder="Введите стоимость"
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor="deadline">Срок выполнения</Label>
                                <Input
                                  id="deadline"
                                  type="date"
                                  value={bidDeadline}
                                  onChange={(e) => setBidDeadline(e.target.value)}
                                  min={new Date().toISOString().split("T")[0]}
                                  required
                                />
                              </div>
                            </div>
                            
                            <div>
                              <Label htmlFor="proposal">Предложение</Label>
                              <Textarea
                                id="proposal"
                                value={bidProposal}
                                onChange={(e) => setBidProposal(e.target.value)}
                                placeholder="Опишите как вы планируете выполнить эту задачу..."
                                rows={4}
                                required
                              />
                            </div>

                            <Button 
                              type="submit" 
                              disabled={createBidMutation.isPending}
                              className="w-full"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              {createBidMutation.isPending ? "Отправка..." : "Подать заявку"}
                            </Button>
                          </form>
                        </CardContent>
                      </Card>
                    )}

                    {/* Task Completion Workflow */}
                    {user.role === "freelancer" && task.assignedFreelancerId === user.id && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Управление проектом
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {task.status === "in_progress" && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-3">Сдать работу</h4>
                              <div className="space-y-3">
                                <Textarea
                                  value={deliveryMessage}
                                  onChange={(e) => setDeliveryMessage(e.target.value)}
                                  placeholder="Опишите выполненную работу и результаты..."
                                  rows={3}
                                />
                                <Button 
                                  onClick={() => submitWorkMutation.mutate({ deliveryMessage })}
                                  disabled={!deliveryMessage.trim() || submitWorkMutation.isPending}
                                  className="w-full"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  {submitWorkMutation.isPending ? "Отправка..." : "Отправить на проверку"}
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {task.status === "in_review" && (
                            <div className="bg-orange-50 p-4 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Clock className="h-5 w-5 text-orange-600" />
                                <span className="font-medium text-orange-900">Работа отправлена</span>
                              </div>
                              <p className="text-sm text-orange-700">Работа отправлена заказчику на проверку. Ожидайте ответа.</p>
                            </div>
                          )}
                          
                          {task.status === "completed" && (
                            <div className="bg-green-50 p-4 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                <span className="font-medium text-green-900">Проект завершен</span>
                              </div>
                              <p className="text-sm text-green-700">Поздравляем! Заказчик принял вашу работу.</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                    
                    {/* Client Work Review */}
                    {user.role === "client" && user.id === task.clientId && task.status === "in_review" && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <CheckSquare className="h-5 w-5" />
                            Проверка работы
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="bg-orange-50 p-4 rounded-lg mb-4">
                            <p className="text-sm text-orange-700">Фрилансер отправил работу на проверку. Проверьте результат и примите решение.</p>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => approveWorkMutation.mutate()}
                              disabled={approveWorkMutation.isPending}
                              className="flex-1"
                            >
                              <ThumbsUp className="h-4 w-4 mr-2" />
                              {approveWorkMutation.isPending ? "Принятие..." : "Принять работу"}
                            </Button>
                          </div>
                          
                          <div className="space-y-3">
                            <Textarea
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              placeholder="Укажите причину отклонения (опционально)..."
                              rows={2}
                            />
                            <Button 
                              variant="outline"
                              onClick={() => rejectWorkMutation.mutate({ rejectionReason })}
                              disabled={rejectWorkMutation.isPending}
                              className="w-full text-red-600 hover:text-red-700"
                            >
                              <ThumbsDown className="h-4 w-4 mr-2" />
                              {rejectWorkMutation.isPending ? "Отклонение..." : "Отклонить работу"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* Bids Tab */}
                  <TabsContent value="bids" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Заявки на проект ({bids.length})
                          </div>
                          {task.status === "open" && (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              Открыт для заявок
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {bidsLoading ? (
                          <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="animate-pulse border rounded-lg p-4">
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                              </div>
                            ))}
                          </div>
                        ) : bids.length > 0 ? (
                          <div className="space-y-4">
                            {bids.map((bid) => (
                              <div key={bid.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                      <AvatarImage src={bid.freelancer?.profileImageUrl} />
                                      <AvatarFallback>
                                        {bid.freelancer?.firstName?.[0]}{bid.freelancer?.lastName?.[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="font-medium text-lg">
                                        {bid.freelancer?.firstName} {bid.freelancer?.lastName}
                                      </p>
                                      <p className="text-sm text-gray-500 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatDistanceToNow(new Date(bid.createdAt), { 
                                          addSuffix: true, 
                                          locale: ru 
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-xl text-green-600">{bid.amount.toLocaleString()} ₽</p>
                                    <p className="text-sm text-gray-500 flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      до {new Date(bid.deadline).toLocaleDateString('ru-RU')}
                                    </p>
                                    <Badge 
                                      className={`mt-1 ${
                                        bid.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                        bid.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                        'bg-blue-100 text-blue-800'
                                      }`}
                                    >
                                      {bid.status === 'accepted' ? 'Принята' :
                                       bid.status === 'rejected' ? 'Отклонена' : 'На рассмотрении'}
                                    </Badge>
                                  </div>
                                </div>
                                
                                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                                  <h5 className="font-medium text-gray-900 mb-2">Предложение:</h5>
                                  <p className="text-gray-700 text-sm whitespace-pre-wrap">
                                    {bid.proposal}
                                  </p>
                                </div>

                                {user.role === "client" && user.id === task.clientId && bid.status === "pending" && (
                                  <div className="flex gap-2 justify-end">
                                    <Button 
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />
                                      Отклонить
                                    </Button>
                                    <Button 
                                      size="sm"
                                      onClick={() => acceptBidMutation.mutate(bid.id)}
                                      disabled={acceptBidMutation.isPending}
                                    >
                                      <CheckCircle2 className="h-4 w-4 mr-1" />
                                      {acceptBidMutation.isPending ? "Принятие..." : "Принять заявку"}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p>Заявок пока нет</p>
                            {task.status === "open" && (
                              <p className="text-sm mt-2">Заявки будут отображаться здесь после их подачи</p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Communication Tab */}
                  <TabsContent value="communication" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5" />
                          Сообщения по проекту
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                          {messagesLoading ? (
                            <div className="text-center py-4">
                              <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full mx-auto mb-2"></div>
                              <p className="text-gray-500">Загрузка сообщений...</p>
                            </div>
                          ) : messages.length > 0 ? (
                            messages.map((message) => (
                              <div key={message.id} className={`flex gap-3 ${
                                message.senderId === user.id ? 'justify-end' : 'justify-start'
                              }`}>
                                <div className={`flex items-start gap-3 max-w-xs ${
                                  message.senderId === user.id ? 'flex-row-reverse' : ''
                                }`}>
                                  <Avatar className="h-8 w-8 flex-shrink-0">
                                    <AvatarImage src={message.sender?.profileImageUrl} />
                                    <AvatarFallback className="text-xs">
                                      {message.sender?.firstName?.[0] || 'U'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className={`rounded-lg p-3 ${
                                    message.senderId === user.id 
                                      ? 'bg-primary text-primary-foreground' 
                                      : 'bg-gray-100'
                                  }`}>
                                    <p className="text-sm">{message.content}</p>
                                    <p className={`text-xs mt-1 ${
                                      message.senderId === user.id 
                                        ? 'text-primary-foreground/70' 
                                        : 'text-gray-500'
                                    }`}>
                                      {format(new Date(message.createdAt), 'HH:mm dd.MM')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                              <p>Сообщений пока нет</p>
                              <p className="text-sm mt-2">Начните общение, отправив первое сообщение</p>
                            </div>
                          )}
                        </div>

                        {/* Message Input */}
                        <div className="border-t pt-4">
                          <div className="flex gap-2">
                            <Textarea
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              placeholder="Напишите сообщение..."
                              rows={2}
                              className="flex-1"
                            />
                            <Button
                              onClick={() => sendMessageMutation.mutate(newMessage)}
                              disabled={!newMessage.trim() || sendMessageMutation.isPending}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Task Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Информация о задаче</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center text-sm">
                        <DollarSign className="h-4 w-4 text-green-600 mr-2" />
                        <span className="text-gray-600">Бюджет:</span>
                        <span className="font-medium ml-1">{task.budget.toLocaleString()} ₽</span>
                      </div>

                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="text-gray-600">Дедлайн:</span>
                        <span className="font-medium ml-1">
                          {new Date(task.deadline).toLocaleDateString('ru-RU')}
                        </span>
                      </div>

                      <div className="flex items-center text-sm">
                        <User className="h-4 w-4 text-purple-600 mr-2" />
                        <span className="text-gray-600">Заказчик:</span>
                        <span className="font-medium ml-1">
                          {task.client?.firstName} {task.client?.lastName}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}