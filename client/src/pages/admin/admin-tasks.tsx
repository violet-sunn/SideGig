import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ShoppingBag, 
  User,
  Calendar,
  DollarSign,
  Eye
} from "lucide-react";
import { Link } from "wouter";

export default function AdminTasks() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["/api/admin/tasks", { page, status: statusFilter }],
    retry: false,
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "open":
        return "Открыт";
      case "in_progress":
        return "В работе";
      case "completed":
        return "Завершен";
      case "cancelled":
        return "Отменен";
      default:
        return status;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "open":
        return "default";
      case "in_progress":
        return "secondary";
      case "completed":
        return "default";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <ShoppingBag className="h-8 w-8 mr-3" />
          Управление проектами
        </h1>
        <p className="text-gray-600 mt-2">Надзор за всеми проектами на платформе</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Статус
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="open">Открытые</SelectItem>
                  <SelectItem value="in_progress">В работе</SelectItem>
                  <SelectItem value="completed">Завершенные</SelectItem>
                  <SelectItem value="cancelled">Отмененные</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <Card>
        <CardHeader>
          <CardTitle>Проекты</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="space-y-2">
                        <div className="h-5 bg-gray-200 rounded w-64"></div>
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                      </div>
                      <div className="h-6 bg-gray-200 rounded w-20"></div>
                    </div>
                    <div className="h-12 bg-gray-200 rounded w-full mb-3"></div>
                    <div className="flex items-center justify-between">
                      <div className="h-4 bg-gray-200 rounded w-48"></div>
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : tasks && tasks.length > 0 ? (
            <div className="space-y-4">
              {tasks.map((task: any) => (
                <div key={task.id} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {task.title}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {task.client?.firstName} {task.client?.lastName}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(task.createdAt).toLocaleDateString('ru-RU')}
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="h-3 w-3 mr-1" />
                          ₽{Number(task.budget).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <Badge variant={getStatusBadgeVariant(task.status)}>
                      {getStatusLabel(task.status)}
                    </Badge>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                    {task.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      Категория: {task.category}
                      {task.assignedFreelancerId && (
                        <span className="ml-4">Назначен исполнитель</span>
                      )}
                    </div>
                    <Link href={`/tasks/${task.id}`}>
                      <button className="flex items-center text-blue-600 hover:text-blue-800 text-sm">
                        <Eye className="h-3 w-3 mr-1" />
                        Просмотреть
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {statusFilter !== "all" ? "Проекты не найдены" : "Проекты отсутствуют"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}