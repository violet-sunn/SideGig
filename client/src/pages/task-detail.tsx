import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useParams } from "wouter";
import { useNavigate } from "@/hooks/useNavigate";
import { useState } from "react";

import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Calendar, 
  DollarSign, 
  User, 
  Clock, 
  ArrowLeft,
  MessageSquare,
  Send
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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
  
  const [bidAmount, setBidAmount] = useState("");
  const [bidDeadline, setBidDeadline] = useState("");
  const [bidProposal, setBidProposal] = useState("");

  const taskId = params.id;

  const { data: task, isLoading: taskLoading } = useQuery<Task>({
    queryKey: ["/api/tasks", taskId],
    enabled: !!taskId,
  });

  const { data: bids = [], isLoading: bidsLoading } = useQuery<Bid[]>({
    queryKey: ["/api/bids/task", taskId],
    enabled: !!taskId,
  });

  const createBidMutation = useMutation({
    mutationFn: async (bidData: any) => {
      return await apiRequest("/api/bids", "POST", bidData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bids/task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["/api/bids/my"] });
      setBidAmount("");
      setBidDeadline("");
      setBidProposal("");
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Task Description */}
                <Card>
                  <CardHeader>
                    <CardTitle>Описание задачи</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {task.description}
                    </p>
                    
                    {task.skills && task.skills.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-medium text-gray-900 mb-2">Требуемые навыки:</h4>
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
                      <CardTitle>Подать заявку</CardTitle>
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

                {/* Existing Bids */}
                {bids.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Заявки ({bids.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {bids.map((bid) => (
                          <div key={bid.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={bid.freelancer?.profileImageUrl} />
                                  <AvatarFallback>
                                    {bid.freelancer?.firstName?.[0]}{bid.freelancer?.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {bid.freelancer?.firstName} {bid.freelancer?.lastName}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {formatDistanceToNow(new Date(bid.createdAt), { 
                                      addSuffix: true, 
                                      locale: ru 
                                    })}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-lg">{bid.amount.toLocaleString()} ₽</p>
                                <p className="text-sm text-gray-500">
                                  до {new Date(bid.deadline).toLocaleDateString('ru-RU')}
                                </p>
                              </div>
                            </div>
                            
                            <p className="text-gray-700 text-sm">
                              {bid.proposal}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
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
          </div>
        </div>
      </main>
    </div>
  );
}