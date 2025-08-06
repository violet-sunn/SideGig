import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import TaskCard from "@/components/tasks/task-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Plus, ListTodo } from "lucide-react";
import { Link } from "wouter";

export default function Tasks() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");

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

  const { data: tasks, isLoading: tasksLoading, error } = useQuery<any[]>({
    queryKey: ["/api/tasks/my"],
    enabled: isAuthenticated,
    retry: false,
  });

  if (error && isUnauthorizedError(error)) {
    // This will be handled by the useEffect above
    return null;
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const userRole = user?.role === "client" ? "client" : "freelancer";

  // Filter and sort tasks
  const filteredTasks = tasks?.filter((task: any) => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortBy) {
      case "budget":
        return Number(b.budget) - Number(a.budget);
      case "created_at":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "deadline":
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      default:
        return 0;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-gray-100 text-gray-800";
      case "open": return "bg-blue-100 text-blue-800";
      case "in_progress": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "draft": return "Черновик";
      case "open": return "Открыта";
      case "in_progress": return "В работе";
      case "completed": return "Завершена";
      case "cancelled": return "Отменена";
      default: return status;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole={userRole} />
      
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {userRole === "client" ? "Мои задачи" : "Мои проекты"}
                </h1>
                <p className="text-gray-600">
                  {userRole === "client" 
                    ? "Управление вашими опубликованными задачами" 
                    : "Проекты, над которыми вы работаете"
                  }
                </p>
              </div>
              {userRole === "client" && (
                <Link href="/create-task">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Создать задачу
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Поиск по названию или описанию..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    <SelectItem value="draft">Черновик</SelectItem>
                    <SelectItem value="open">Открыта</SelectItem>
                    <SelectItem value="in_progress">В работе</SelectItem>
                    <SelectItem value="completed">Завершена</SelectItem>
                    <SelectItem value="cancelled">Отменена</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Сортировка" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">По дате создания</SelectItem>
                    <SelectItem value="budget">По бюджету</SelectItem>
                    <SelectItem value="deadline">По сроку</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tasks List */}
          <div className="space-y-6">
            {tasksLoading ? (
              <div className="grid gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : sortedTasks.length > 0 ? (
              <div className="grid gap-6">
                {sortedTasks.map((task: any) => (
                  <Card key={task.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {task.title}
                          </h3>
                          <p className="text-gray-600 mb-4 line-clamp-2">
                            {task.description}
                          </p>
                        </div>
                        <Badge className={getStatusColor(task.status)}>
                          {getStatusText(task.status)}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6 text-sm text-gray-500">
                          <span>
                            Бюджет: <span className="font-semibold text-gray-900">
                              ₽{Number(task.budget).toLocaleString()}
                            </span>
                          </span>
                          <span>
                            Создано: {new Date(task.createdAt).toLocaleDateString()}
                          </span>
                          {task.deadline && (
                            <span>
                              Срок: {new Date(task.deadline).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {task.category && (
                            <Badge variant="outline">{task.category}</Badge>
                          )}
                          <Button variant="outline" size="sm">
                            Подробнее
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-16">
                  <ListTodo className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {userRole === "client" ? "У вас пока нет задач" : "У вас пока нет проектов"}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {userRole === "client" 
                      ? "Создайте первую задачу, чтобы найти исполнителя"
                      : "Найдите интересные задачи для работы"
                    }
                  </p>
                  {userRole === "client" ? (
                    <Link href="/create-task">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Создать задачу
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/browse-tasks">
                      <Button>
                        <Search className="h-4 w-4 mr-2" />
                        Найти задачи
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}