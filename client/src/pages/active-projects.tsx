import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "@/hooks/useNavigate";

import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, DollarSign, MessageSquare, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface Project {
  id: string;
  title: string;
  description: string;
  budget: number;
  status: string;
  deadline: string;
  clientId: string;
  assignedFreelancerId: string;
  createdAt: string;
  client?: {
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
  progress?: number;
}

export default function ActiveProjects() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/tasks/active"],
    enabled: !!user && user.role === "freelancer",
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "in_review": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "in_progress": return "В работе";
      case "in_review": return "На проверке";
      case "completed": return "Завершен";
      default: return status;
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Активные проекты</h1>
            <p className="text-gray-600">Управляйте вашими текущими проектами</p>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  У вас нет активных проектов
                </h3>
                <p className="text-gray-500 mb-6">
                  Подавайте заявки на интересные проекты чтобы начать работу
                </p>
                <Button onClick={() => navigate("/browse-tasks")}>
                  Найти проекты
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {projects.map((project) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">
                          {project.title}
                        </CardTitle>
                        <p className="text-gray-600 text-sm line-clamp-2">
                          {project.description}
                        </p>
                      </div>
                      <Badge className={getStatusColor(project.status)}>
                        {getStatusText(project.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="flex items-center text-sm">
                        <DollarSign className="h-4 w-4 text-green-600 mr-2" />
                        <span className="text-gray-600">Бюджет:</span>
                        <span className="font-medium ml-1">{project.budget.toLocaleString()} ₽</span>
                      </div>
                      
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="text-gray-600">Дедлайн:</span>
                        <span className="font-medium ml-1">
                          {new Date(project.deadline).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-sm">
                        <User className="h-4 w-4 text-purple-600 mr-2" />
                        <span className="text-gray-600">Заказчик:</span>
                        <span className="font-medium ml-1">
                          {project.client?.firstName} {project.client?.lastName}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Прогресс проекта</span>
                        <span className="text-sm text-gray-500">{project.progress || 0}%</span>
                      </div>
                      <Progress value={project.progress || 0} className="h-2" />
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-500">
                        Начат {formatDistanceToNow(new Date(project.createdAt), { 
                          addSuffix: true, 
                          locale: ru 
                        })}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/messages?project=${project.id}`)}>
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Чат
                        </Button>
                        <Button size="sm" onClick={() => navigate(`/task/${project.id}`)}>
                          Подробности
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          </div>
        </div>
      </main>
    </div>
  );
}