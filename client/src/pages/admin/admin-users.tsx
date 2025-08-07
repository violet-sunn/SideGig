import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Users, 
  Search, 
  Shield, 
  ShieldOff,
  Mail,
  Calendar
} from "lucide-react";

export default function AdminUsers() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/admin/users", { page, search, role: roleFilter }],
    retry: false,
  });

  const blockMutation = useMutation({
    mutationFn: async ({ userId, isBlocked }: { userId: string; isBlocked: boolean }) => {
      await apiRequest(`/api/admin/users/${userId}/block`, {
        method: "PATCH",
        body: JSON.stringify({ isBlocked })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Успешно",
        description: "Статус пользователя обновлен",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус пользователя",
        variant: "destructive",
      });
    },
  });

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "client":
        return "Клиент";
      case "freelancer":
        return "Исполнитель";
      case "admin":
        return "Администратор";
      default:
        return role;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "client":
        return "default";
      case "freelancer":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Users className="h-8 w-8 mr-3" />
          Управление пользователями
        </h1>
        <p className="text-gray-600 mt-2">Просмотр, поиск и управление пользователями платформы</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Поиск пользователей
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Поиск по имени или email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Роль
              </label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все роли</SelectItem>
                  <SelectItem value="client">Клиенты</SelectItem>
                  <SelectItem value="freelancer">Исполнители</SelectItem>
                  <SelectItem value="admin">Администраторы</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Пользователи</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                        <div className="h-3 bg-gray-200 rounded w-48"></div>
                      </div>
                    </div>
                    <div className="h-8 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : users && users.length > 0 ? (
            <div className="space-y-4">
              {users.map((user: any) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </h3>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {getRoleLabel(user.role)}
                        </Badge>
                        {user.isBlocked && (
                          <Badge variant="destructive">Заблокирован</Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <div className="flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {user.email}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {user.role !== "admin" && (
                      <Button
                        variant={user.isBlocked ? "default" : "destructive"}
                        size="sm"
                        onClick={() => blockMutation.mutate({ 
                          userId: user.id, 
                          isBlocked: !user.isBlocked 
                        })}
                        disabled={blockMutation.isPending}
                      >
                        {user.isBlocked ? (
                          <>
                            <Shield className="h-4 w-4 mr-2" />
                            Разблокировать
                          </>
                        ) : (
                          <>
                            <ShieldOff className="h-4 w-4 mr-2" />
                            Заблокировать
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {search || roleFilter !== "all" ? "Пользователи не найдены" : "Пользователи отсутствуют"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}