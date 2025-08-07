import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  UserCog, 
  Search, 
  Shield, 
  ShieldCheck,
  User,
  Crown,
  AlertTriangle
} from "lucide-react";

export default function AdminRoles() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newRole, setNewRole] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/admin/users", { search, role: "all" }],
    retry: false,
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return await apiRequest(`/api/admin/users/${userId}/role`, "PATCH", { role });
    },
    onSuccess: () => {
      toast({
        title: "Успешно",
        description: "Роль пользователя изменена",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось изменить роль пользователя",
        variant: "destructive",
      });
    },
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4 text-yellow-600" />;
      case "moderator":
        return <Shield className="h-4 w-4 text-purple-600" />;
      case "client":
        return <User className="h-4 w-4 text-blue-600" />;
      case "freelancer":
        return <UserCog className="h-4 w-4 text-green-600" />;
      default:
        return <User className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "moderator":
        return "destructive";
      case "client":
        return "default";
      case "freelancer":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "admin":
        return "Администратор";
      case "moderator":
        return "Модератор";
      case "client":
        return "Клиент";
      case "freelancer":
        return "Исполнитель";
      default:
        return role;
    }
  };

  const handleRoleChange = () => {
    if (!selectedUser || !newRole) return;
    
    if (newRole === "admin") {
      // Дополнительное подтверждение для назначения админа
      const confirmed = window.confirm(
        `Вы уверены, что хотите назначить ${selectedUser.firstName} ${selectedUser.lastName} администратором? Это даст пользователю полный доступ к админской панели.`
      );
      if (!confirmed) return;
    }

    changeRoleMutation.mutate({ userId: selectedUser.id, role: newRole });
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Управление ролями</h1>
        <p className="text-gray-600 mt-2">Назначение и изменение ролей пользователей</p>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Поиск пользователей..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning about admin role */}
      <Card className="mb-6 border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-orange-800 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Важно
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-orange-700">
            Роль администратора дает полный доступ к админской панели и всем функциям управления платформой. 
            Назначайте эту роль только проверенным пользователям.
          </p>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Пользователи</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users && Array.isArray(users) && users.length > 0 ? (
              users.map((user: any) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      {user.profileImageUrl ? (
                        <img 
                          src={user.profileImageUrl} 
                          alt={user.firstName} 
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getRoleIcon(user.role)}
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {getRoleDisplayName(user.role)}
                      </Badge>
                    </div>
                    
                    <Dialog open={isDialogOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                      if (!open) {
                        setIsDialogOpen(false);
                        setSelectedUser(null);
                        setNewRole("");
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setNewRole(user.role);
                            setIsDialogOpen(true);
                          }}
                        >
                          <UserCog className="h-4 w-4 mr-2" />
                          Изменить роль
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Изменить роль пользователя</DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          <div>
                            <p className="font-medium">{user.firstName} {user.lastName}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                          
                          <div>
                            <Label htmlFor="role">Новая роль</Label>
                            <Select value={newRole} onValueChange={setNewRole}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="client">
                                  <div className="flex items-center space-x-2">
                                    <User className="h-4 w-4 text-blue-600" />
                                    <span>Клиент</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="freelancer">
                                  <div className="flex items-center space-x-2">
                                    <UserCog className="h-4 w-4 text-green-600" />
                                    <span>Исполнитель</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="moderator">
                                  <div className="flex items-center space-x-2">
                                    <Shield className="h-4 w-4 text-purple-600" />
                                    <span>Модератор</span>
                                  </div>
                                </SelectItem>
                                <SelectItem value="admin">
                                  <div className="flex items-center space-x-2">
                                    <Crown className="h-4 w-4 text-yellow-600" />
                                    <span>Администратор</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {(newRole === "admin" || newRole === "moderator") && (
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <div className="flex">
                                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                                <div className="ml-3">
                                  <h3 className="text-sm font-medium text-yellow-800">
                                    Внимание!
                                  </h3>
                                  <div className="mt-2 text-sm text-yellow-700">
                                    {newRole === "admin" 
                                      ? "Пользователь получит полный доступ к админской панели и сможет управлять всеми функциями платформы."
                                      : "Пользователь сможет просматривать админскую информацию и разрешать споры, но не сможет управлять пользователями или назначать роли."
                                    }
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex space-x-2">
                            <Button 
                              onClick={handleRoleChange}
                              disabled={changeRoleMutation.isPending || newRole === user.role}
                            >
                              {changeRoleMutation.isPending ? "Сохранение..." : "Сохранить"}
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setIsDialogOpen(false);
                                setSelectedUser(null);
                              }}
                            >
                              Отмена
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                Пользователи не найдены
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}