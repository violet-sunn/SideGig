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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  DollarSign, 
  User, 
  Clock, 
  ArrowLeft,
  MessageSquare,
  Send,
  CheckSquare,
  FileText,
  Settings,
  AlertTriangle,
  TrendingUp,
  Users,
  Eye,
  Edit,
  Share2,
  Download,
  Upload,
  Star,
  ThumbsUp,
  ThumbsDown,
  MoreHorizontal,
  Flag,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ru } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

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
  const [bidDeadline, setBidDeadline] = useState("");
  const [bidProposal, setBidProposal] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [taskComment, setTaskComment] = useState("");
  const [milestones, setMilestones] = useState<any[]>([]);
  const [progress, setProgress] = useState(0);
  const [isEditingTask, setIsEditingTask] = useState(false);

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

  const { data: taskComments = [], isLoading: commentsLoading } = useQuery<any[]>({
    queryKey: [`/api/tasks/${taskId}/comments`],
    enabled: !!taskId,
  });

  const { data: taskFiles = [], isLoading: filesLoading } = useQuery<any[]>({
    queryKey: [`/api/tasks/${taskId}/files`],
    enabled: !!taskId,
  });

  const { data: taskActivity = [], isLoading: activityLoading } = useQuery<any[]>({
    queryKey: [`/api/tasks/${taskId}/activity`],
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
      setBidDeadline("");
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

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      return await apiRequest(`/api/tasks/${taskId}/status`, "PATCH", { status });
    },
    onSuccess: () => {
      toast({ title: "Статус обновлен!", description: "Статус проекта успешно изменен" });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}`] });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: "Не удалось обновить статус", variant: "destructive" });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (comment: string) => {
      return await apiRequest(`/api/tasks/${taskId}/comments`, "POST", { content: comment });
    },
    onSuccess: () => {
      toast({ title: "Комментарий добавлен", description: "Ваш комментарий успешно добавлен" });
      setTaskComment("");
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/${taskId}/comments`] });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: "Не удалось добавить комментарий", variant: "destructive" });
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
      case "completed": return "bg-gray-100 text-gray-800";
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

            {/* Enhanced Tabbed Interface */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="border-b mb-6">
                <TabsList className="grid w-full grid-cols-6">
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
                  <TabsTrigger value="files" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Файлы
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Активность
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Управление
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Tabs */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Описание задачи
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 whitespace-pre-wrap mb-6">
                          {task.description}
                        </p>
                        
                        {task.skills && task.skills.length > 0 && (
                          <div className="border-t pt-4">
                            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                              <Star className="h-4 w-4" />
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

                        {task.status === "in_progress" && (
                          <div className="border-t pt-4 mt-4">
                            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Прогресс выполнения
                            </h4>
                            <div className="space-y-3">
                              <Progress value={progress} className="w-full" />
                              <div className="flex justify-between text-sm text-gray-600">
                                <span>Выполнено: {progress}%</span>
                                <span>{milestones.filter(m => m.completed).length} из {milestones.length} этапов</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Quick Bid Form for Freelancers */}
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
                  </TabsContent>

                  {/* Bids Management Tab */}
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
                                      {acceptBidMutation.isPending ? "Принимаю..." : "Принять"}
                                    </Button>
                                  </div>
                                )}

                                {bid.status === 'accepted' && (
                                  <div className="border-t pt-3 mt-3">
                                    <div className="flex items-center gap-2 text-green-700">
                                      <CheckCircle2 className="h-4 w-4" />
                                      <span className="font-medium">Исполнитель выбран</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              Пока нет заявок
                            </h3>
                            <p className="text-gray-600">
                              {task.status === "open" 
                                ? "Заявки от исполнителей будут появляться здесь"
                                : "Проект больше не принимает заявки"
                              }
                            </p>
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
                          Общение по проекту
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          {/* Messages Section */}
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              Сообщения ({messages.length})
                            </h4>
                            {messagesLoading ? (
                              <div className="space-y-2">
                                {[1, 2].map((i) => (
                                  <div key={i} className="animate-pulse h-16 bg-gray-100 rounded"></div>
                                ))}
                              </div>
                            ) : messages.length > 0 ? (
                              <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-3">
                                {messages.map((message: any) => (
                                  <div key={message.id} className="flex gap-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={message.sender?.profileImageUrl} />
                                      <AvatarFallback className="text-xs">
                                        {message.sender?.firstName?.[0]}{message.sender?.lastName?.[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-medium">
                                          {message.sender?.firstName} {message.sender?.lastName}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {format(new Date(message.createdAt), 'HH:mm dd.MM')}
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-700">{message.content}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">Пока нет сообщений по проекту</p>
                            )}
                          </div>

                          <Separator />

                          {/* Comments Section */}
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              Комментарии ({taskComments.length})
                            </h4>
                            
                            {/* Add Comment Form */}
                            <div className="mb-4">
                              <Textarea
                                value={taskComment}
                                onChange={(e) => setTaskComment(e.target.value)}
                                placeholder="Добавить комментарий к проекту..."
                                rows={3}
                              />
                              <Button 
                                onClick={() => taskComment.trim() && addCommentMutation.mutate(taskComment)}
                                disabled={!taskComment.trim() || addCommentMutation.isPending}
                                size="sm"
                                className="mt-2"
                              >
                                <Send className="h-4 w-4 mr-1" />
                                {addCommentMutation.isPending ? "Добавляю..." : "Добавить комментарий"}
                              </Button>
                            </div>

                            {/* Comments List */}
                            {commentsLoading ? (
                              <div className="space-y-2">
                                {[1, 2].map((i) => (
                                  <div key={i} className="animate-pulse h-12 bg-gray-100 rounded"></div>
                                ))}
                              </div>
                            ) : taskComments.length > 0 ? (
                              <div className="space-y-3">
                                {taskComments.map((comment: any) => (
                                  <div key={comment.id} className="border-l-2 border-blue-200 pl-3">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-medium">
                                        {comment.author?.firstName} {comment.author?.lastName}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {format(new Date(comment.createdAt), 'HH:mm dd.MM.yyyy')}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-700">{comment.content}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">Пока нет комментариев</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Files Tab */}
                  <TabsContent value="files" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Файлы проекта
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {/* Upload Zone */}
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-6">
                          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <div>
                            <Button variant="outline" className="mb-2">
                              <Upload className="h-4 w-4 mr-2" />
                              Загрузить файлы
                            </Button>
                            <p className="text-sm text-gray-500">
                              Или перетащите файлы сюда • Максимум 10 МБ на файл
                            </p>
                          </div>
                        </div>

                        {/* Files List */}
                        {filesLoading ? (
                          <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="animate-pulse h-12 bg-gray-100 rounded"></div>
                            ))}
                          </div>
                        ) : taskFiles.length > 0 ? (
                          <div className="space-y-3">
                            {taskFiles.map((file: any) => (
                              <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  <FileText className="h-5 w-5 text-blue-600" />
                                  <div>
                                    <p className="font-medium text-sm">{file.name}</p>
                                    <p className="text-xs text-gray-500">
                                      {file.size} • {format(new Date(file.createdAt), 'dd.MM.yyyy HH:mm')}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              Пока нет файлов
                            </h3>
                            <p className="text-gray-600">
                              Загрузите файлы, связанные с проектом
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Activity Tab */}
                  <TabsContent value="activity" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          История активности
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {activityLoading ? (
                          <div className="space-y-4">
                            {[1, 2, 3, 4].map((i) => (
                              <div key={i} className="animate-pulse">
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                              </div>
                            ))}
                          </div>
                        ) : taskActivity.length > 0 ? (
                          <div className="space-y-4">
                            {taskActivity.map((activity: any) => (
                              <div key={activity.id} className="flex items-start gap-3">
                                <div className="flex-shrink-0">
                                  {activity.type === 'bid_created' && <Users className="h-5 w-5 text-blue-600" />}
                                  {activity.type === 'status_updated' && <Settings className="h-5 w-5 text-green-600" />}
                                  {activity.type === 'comment_added' && <MessageSquare className="h-5 w-5 text-purple-600" />}
                                  {activity.type === 'file_uploaded' && <Upload className="h-5 w-5 text-orange-600" />}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm text-gray-900">{activity.description}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {format(new Date(activity.createdAt), 'dd.MM.yyyy HH:mm')}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                              Пока нет активности
                            </h3>
                            <p className="text-gray-600">
                              История действий по проекту появится здесь
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Settings Tab */}
                  <TabsContent value="settings" className="space-y-6">
                    {(user.role === "client" && user.id === task.clientId) && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Управление проектом
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* Status Management */}
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3">Статус проекта</h4>
                            <div className="flex items-center gap-4">
                              <Badge className={`${getStatusColor(task.status)} px-3 py-1`}>
                                {getStatusText(task.status)}
                              </Badge>
                              {task.status === "open" && (
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => updateTaskStatusMutation.mutate({ status: "in_progress" })}
                                    disabled={updateTaskStatusMutation.isPending}
                                  >
                                    <Play className="h-4 w-4 mr-1" />
                                    В работу
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => updateTaskStatusMutation.mutate({ status: "cancelled" })}
                                    disabled={updateTaskStatusMutation.isPending}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Отменить
                                  </Button>
                                </div>
                              )}
                              {task.status === "in_progress" && (
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => updateTaskStatusMutation.mutate({ status: "completed" })}
                                    disabled={updateTaskStatusMutation.isPending}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Завершить
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => updateTaskStatusMutation.mutate({ status: "open" })}
                                    disabled={updateTaskStatusMutation.isPending}
                                  >
                                    <Pause className="h-4 w-4 mr-1" />
                                    Вернуть к найму
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>

                          <Separator />

                          {/* Task Actions */}
                          <div>
                            <h4 className="font-medium text-gray-900 mb-3">Действия</h4>
                            <div className="flex flex-wrap gap-2">
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4 mr-1" />
                                Редактировать
                              </Button>
                              <Button variant="outline" size="sm">
                                <Share2 className="h-4 w-4 mr-1" />
                                Поделиться
                              </Button>
                              <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-1" />
                                Экспорт
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                <Flag className="h-4 w-4 mr-1" />
                                Пожаловаться
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {user.role === "freelancer" && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Действия исполнителя
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm">
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Связаться с заказчиком
                            </Button>
                            <Button variant="outline" size="sm">
                              <Star className="h-4 w-4 mr-1" />
                              Добавить в избранное
                            </Button>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                              <Flag className="h-4 w-4 mr-1" />
                              Пожаловаться
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
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
                      <Clock className="h-4 w-4 text-purple-600 mr-2" />
                      <span className="text-gray-600">Заявок:</span>
                      <span className="font-medium ml-1">{bids.length}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Client Info */}
                {task.client && (
                  <Card>
                    <CardHeader>
                      <CardTitle>О заказчике</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar>
                          <AvatarImage src={task.client.profileImageUrl} />
                          <AvatarFallback>
                            {task.client.firstName?.[0]}{task.client.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {task.client.firstName} {task.client.lastName}
                          </p>
                        </div>
                      </div>
                      
                      <Button variant="outline" className="w-full">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Связаться
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}