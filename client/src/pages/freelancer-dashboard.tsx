import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Briefcase, 
  RussianRuble, 
  Star,
  CheckCircle,
  Search,
  MessageSquare,
  Wallet,
  TrendingUp
} from "lucide-react";
import { Link } from "wouter";
import TaskCard from "@/components/tasks/task-card";

// Quick Bid Button Component
function QuickBidButton({ task }: { task: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [responseType, setResponseType] = useState<"accept" | "propose">("accept");
  const [bidData, setBidData] = useState({
    amount: task.budget || "",
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
      setBidData({ amount: task.budget || "", deadline: "", proposal: "" });
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

  const handleSubmitBid = () => {
    const bidInfo = {
      taskId: task.id,
      amount: Number(bidData.amount),
      deadline: bidData.deadline,
      proposal: responseType === "propose" ? bidData.proposal : `Готов выполнить задачу "${task.title}" на предложенных условиях.`,
    };
    
    submitBidMutation.mutate(bidInfo);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="text-xs px-2 py-1">
          Подать заявку
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Подача заявки на задачу</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">{task.title}</h4>
            <p className="text-sm text-gray-600 mb-3">{task.description}</p>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>Бюджет: ₽{Number(task.budget).toLocaleString()}</span>
              {task.deadline && (
                <span>Срок: {new Date(task.deadline).toLocaleDateString()}</span>
              )}
            </div>
          </div>

          <div className="flex space-x-2 mb-4">
            <Button
              type="button"
              variant={responseType === "accept" ? "default" : "outline"}
              onClick={() => setResponseType("accept")}
              className="flex-1"
            >
              Откликнуться
            </Button>
            <Button
              type="button"
              variant={responseType === "propose" ? "default" : "outline"}
              onClick={() => setResponseType("propose")}
              className="flex-1"
            >
              Предложить свои условия
            </Button>
          </div>

          {responseType === "propose" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Ваша цена (₽)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={bidData.amount}
                    onChange={(e) => setBidData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="deadline">Срок выполнения</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={bidData.deadline}
                    onChange={(e) => setBidData(prev => ({ ...prev, deadline: e.target.value }))}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="proposal">Ваше предложение</Label>
                <Textarea
                  id="proposal"
                  value={bidData.proposal}
                  onChange={(e) => setBidData(prev => ({ ...prev, proposal: e.target.value }))}
                  placeholder="Опишите ваш подход к выполнению задачи..."
                  rows={3}
                />
              </div>
            </>
          )}

          <Button 
            onClick={handleSubmitBid}
            disabled={submitBidMutation.isPending}
            className="w-full"
          >
            {submitBidMutation.isPending ? "Отправка..." : "Отправить заявку"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function FreelancerDashboard() {
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
    activeProjects: string;
    totalEarned: string;
    rating: string;
    completedTasks: string;
  }>({
    queryKey: ["/api/users/stats"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: activeProjects, isLoading: projectsLoading } = useQuery<any[]>({
    queryKey: ["/api/tasks/my"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: availableTasks, isLoading: availableTasksLoading } = useQuery<any[]>({
    queryKey: ["/api/tasks/available"],
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

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole="freelancer" />
      
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Дашборд фрилансера</h1>
            <p className="text-gray-600">Обзор ваших проектов и заработка</p>
          </div>

          {/* Freelancer Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Активные проекты</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {statsLoading ? "..." : stats?.activeProjects || 0}
                    </p>
                  </div>
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Briefcase className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Заработано</p>
                    <p className="text-3xl font-bold text-gray-900">
                      ₽{statsLoading ? "..." : Number(stats?.totalEarned || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <RussianRuble className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Рейтинг</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {statsLoading ? "..." : Number(stats?.rating || 0).toFixed(1)}
                    </p>
                  </div>
                  <div className="bg-yellow-100 p-3 rounded-lg">
                    <Star className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Завершено задач</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {statsLoading ? "..." : stats?.completedTasks || 0}
                    </p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Projects and New Opportunities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Active Projects */}
            <Card>
              <CardHeader>
                <CardTitle>Активные проекты</CardTitle>
              </CardHeader>
              <CardContent>
                {projectsLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : activeProjects && activeProjects.length > 0 ? (
                  <div className="space-y-4">
                    {activeProjects.slice(0, 2).map((project: any) => (
                      <div key={project.id} className="py-4 border-b last:border-b-0">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">{project.title}</h4>
                          <span className="font-semibold text-gray-900">
                            ₽{Number(project.budget).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{project.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-500">
                            Срок: {project.deadline ? new Date(project.deadline).toLocaleDateString() : "Не указан"}
                          </div>
                          <div className="text-right">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div className="bg-primary h-2 rounded-full" style={{ width: "65%" }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">У вас пока нет активных проектов</p>
                    <Link href="/browse-tasks">
                      <span className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                        <Search className="h-4 w-4 mr-2" />
                        Найти задачи
                      </span>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* New Opportunities */}
            <Card>
              <CardHeader>
                <CardTitle>Новые возможности</CardTitle>
              </CardHeader>
              <CardContent>
                {availableTasksLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : availableTasks && availableTasks.length > 0 ? (
                  <div className="space-y-4">
                    {availableTasks.slice(0, 2).map((task: any) => (
                      <div key={task.id} className="py-4 border-b last:border-b-0">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">{task.title}</h4>
                          <span className="font-semibold text-green-600">
                            ₽{Number(task.budget).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          {task.description.substring(0, 100)}...
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {task.skills && task.skills.slice(0, 2).map((skill: string) => (
                              <Badge key={skill} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                          <QuickBidButton task={task} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Нет доступных задач</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
