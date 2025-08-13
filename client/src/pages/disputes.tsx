import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Scale, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  FileText,
  MessageSquare,
  Gavel,
  Paperclip,
  X,
  Upload
} from "lucide-react";

export default function Disputes() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDispute, setNewDispute] = useState({
    taskId: "",
    defendantId: "",
    reason: "",
  });
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

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

  const { data: disputes, isLoading: disputesLoading } = useQuery<any[]>({
    queryKey: ["/api/disputes"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: activeTasks, isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: ["/api/tasks/my"],
    enabled: isAuthenticated,
    retry: false,
  });

  const createDisputeMutation = useMutation({
    mutationFn: async (disputeData: any) => {
      const response = await apiRequest("/api/disputes", "POST", disputeData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешно!",
        description: "Спор создан и передан на рассмотрение",
      });
      setIsCreateDialogOpen(false);
      setNewDispute({ taskId: "", defendantId: "", reason: "" });
      setAttachedFiles([]);
      queryClient.invalidateQueries({ queryKey: ["/api/disputes"] });
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
        description: "Не удалось создать спор",
        variant: "destructive",
      });
    },
  });

  // File handling functions
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type);
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      
      if (!isValidType) {
        toast({
          title: "Неподдерживаемый тип файла",
          description: "Поддерживаются: JPG, PNG, PDF, TXT, DOC, DOCX",
          variant: "destructive",
        });
        return false;
      }
      
      if (!isValidSize) {
        toast({
          title: "Файл слишком большой",
          description: "Максимальный размер файла: 10MB",
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });
    
    setAttachedFiles(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
    
    if (e.target) {
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCreateDispute = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newDispute.taskId || !newDispute.defendantId || !newDispute.reason) {
      toast({
        title: "Ошибка",
        description: "Заполните все поля",
        variant: "destructive",
      });
      return;
    }

    createDisputeMutation.mutate(newDispute);
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-red-100 text-red-800";
      case "in_review": return "bg-yellow-100 text-yellow-800";
      case "resolved": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "open": return "Открыт";
      case "in_review": return "На рассмотрении";
      case "resolved": return "Решен";
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open": return <AlertTriangle className="h-4 w-4" />;
      case "in_review": return <Clock className="h-4 w-4" />;
      case "resolved": return <CheckCircle className="h-4 w-4" />;
      default: return <Scale className="h-4 w-4" />;
    }
  };

  // Filter tasks that can have disputes (in_progress or completed without existing disputes)
  const disputeableTasks = activeTasks?.filter((task: any) => 
    (task.status === "in_progress" || task.status === "completed") &&
    !disputes?.some((dispute: any) => dispute.taskId === task.id)
  ) || [];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole={user?.role || "client"} />
      
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Разрешение споров</h1>
                <p className="text-gray-600">Система справедливого разрешения конфликтов</p>
              </div>
              
              {disputeableTasks.length > 0 && (
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Открыть спор
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Создать спор</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateDispute} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Выберите проект *
                        </label>
                        <select
                          value={newDispute.taskId}
                          onChange={(e) => {
                            const task = disputeableTasks.find((t: any) => t.id === e.target.value);
                            setNewDispute(prev => ({
                              ...prev,
                              taskId: e.target.value,
                              defendantId: user?.role === "client" 
                                ? task?.assignedFreelancerId || ""
                                : task?.clientId || ""
                            }));
                          }}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          required
                        >
                          <option value="">Выберите проект</option>
                          {disputeableTasks.map((task: any) => (
                            <option key={task.id} value={task.id}>
                              {task.title} - ₽{Number(task.budget).toLocaleString()}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Причина спора *
                        </label>
                        <Textarea
                          value={newDispute.reason}
                          onChange={(e) => setNewDispute(prev => ({ ...prev, reason: e.target.value }))}
                          placeholder="Подробно опишите суть конфликта и ваши требования..."
                          className="min-h-[120px]"
                          required
                        />
                      </div>

                      {/* File Attachments */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Прикрепить файлы (необязательно)
                        </label>
                        
                        {/* File Upload Area */}
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                          <input
                            type="file"
                            multiple
                            accept=".jpg,.jpeg,.png,.pdf,.txt,.doc,.docx"
                            onChange={handleFileSelect}
                            className="hidden"
                            id="file-upload"
                          />
                          <label htmlFor="file-upload" className="cursor-pointer">
                            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 mb-1">
                              Нажмите для выбора файлов или перетащите их сюда
                            </p>
                            <p className="text-xs text-gray-500">
                              JPG, PNG, PDF, TXT, DOC, DOCX (до 10MB каждый, максимум 5 файлов)
                            </p>
                          </label>
                        </div>

                        {/* Attached Files List */}
                        {attachedFiles.length > 0 && (
                          <div className="mt-4 space-y-2">
                            {attachedFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <Paperclip className="h-4 w-4 text-gray-500" />
                                  <div>
                                    <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                                      {file.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {formatFileSize(file.size)}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFile(index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                          <div className="text-sm text-yellow-800">
                            <p className="font-medium mb-1">Важно знать:</p>
                            <ul className="space-y-1 text-xs">
                              <li>• Спор будет рассмотрен модератором в течение 3 рабочих дней</li>
                              <li>• Прикрепите все доказательства: скриншоты, документы, переписку</li>
                              <li>• Будьте максимально объективны в описании</li>
                              <li>• Решение модератора является окончательным</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-3">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsCreateDialogOpen(false)}
                        >
                          Отмена
                        </Button>
                        <Button type="submit" disabled={createDisputeMutation.isPending}>
                          {createDisputeMutation.isPending ? "Создание..." : "Создать спор"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {/* Disputes List */}
          <div className="space-y-6">
            {disputesLoading ? (
              <div className="space-y-4">
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
            ) : disputes && disputes.length > 0 ? (
              <>
                {disputes.map((dispute: any) => (
                  <Card key={dispute.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-xl font-semibold text-gray-900">
                              Спор #{dispute.id.slice(-6)}
                            </h3>
                            <Badge className={getStatusColor(dispute.status)}>
                              <div className="flex items-center">
                                {getStatusIcon(dispute.status)}
                                <span className="ml-1">{getStatusText(dispute.status)}</span>
                              </div>
                            </Badge>
                          </div>
                          <p className="font-medium text-gray-700 mb-1">
                            {dispute.task?.title || "Неизвестный проект"}
                          </p>
                          <p className="text-sm text-gray-500">
                            Создан {new Date(dispute.createdAt).toLocaleDateString()} • 
                            Сумма: ₽{Number(dispute.task?.budget || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-0">
                      {/* Participants */}
                      <div className="mb-6">
                        <h4 className="font-medium text-gray-900 mb-3">Участники спора</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={dispute.initiator?.profileImageUrl} />
                              <AvatarFallback>
                                {dispute.initiator?.firstName?.[0]}{dispute.initiator?.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-gray-900">
                                {dispute.initiator?.firstName && dispute.initiator?.lastName
                                  ? `${dispute.initiator.firstName} ${dispute.initiator.lastName}`
                                  : "Инициатор"
                                }
                              </p>
                              <p className="text-sm text-gray-600">Истец</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={dispute.defendant?.profileImageUrl} />
                              <AvatarFallback>
                                {dispute.defendant?.firstName?.[0]}{dispute.defendant?.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-gray-900">
                                {dispute.defendant?.firstName && dispute.defendant?.lastName
                                  ? `${dispute.defendant.firstName} ${dispute.defendant.lastName}`
                                  : "Ответчик"
                                }
                              </p>
                              <p className="text-sm text-gray-600">Ответчик</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Dispute Reason */}
                      <div className="mb-6">
                        <h4 className="font-medium text-gray-900 mb-2">Причина спора</h4>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-gray-700">{dispute.reason}</p>
                        </div>
                      </div>

                      {/* Resolution if available */}
                      {dispute.status === "resolved" && dispute.resolution && (
                        <div className="mb-6">
                          <h4 className="font-medium text-gray-900 mb-2">Решение модератора</h4>
                          <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                            <div className="flex items-start space-x-2">
                              <Gavel className="h-5 w-5 text-green-600 mt-0.5" />
                              <div>
                                <p className="text-green-800 font-medium mb-1">
                                  Решено {dispute.resolvedAt ? new Date(dispute.resolvedAt).toLocaleDateString() : ""}
                                </p>
                                <p className="text-green-700">{dispute.resolution}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Timeline */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Хронология</h4>
                        <div className="space-y-3">
                          <div className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">Спор открыт</p>
                              <p className="text-xs text-gray-500">
                                {new Date(dispute.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          {dispute.status === "in_review" && (
                            <div className="flex items-start space-x-3">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">На рассмотрении</p>
                                <p className="text-xs text-gray-500">Модератор изучает материалы</p>
                              </div>
                            </div>
                          )}
                          
                          {dispute.status === "resolved" && (
                            <div className="flex items-start space-x-3">
                              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">Спор решен</p>
                                <p className="text-xs text-gray-500">
                                  {dispute.resolvedAt ? new Date(dispute.resolvedAt).toLocaleDateString() : ""}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {dispute.status === "open" && (
                            <div className="flex items-start space-x-3">
                              <div className="w-2 h-2 bg-gray-300 rounded-full mt-2"></div>
                              <div>
                                <p className="text-sm font-medium text-gray-500">Ожидается рассмотрение</p>
                                <p className="text-xs text-gray-500">До 3 рабочих дней</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Moderator Contact */}
                      {dispute.moderator && (
                        <div className="mt-6 pt-6 border-t">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={dispute.moderator?.profileImageUrl} />
                                <AvatarFallback>
                                  {dispute.moderator?.firstName?.[0]}{dispute.moderator?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {dispute.moderator?.firstName && dispute.moderator?.lastName
                                    ? `${dispute.moderator.firstName} ${dispute.moderator.lastName}`
                                    : "Модератор"
                                  }
                                </p>
                                <p className="text-sm text-gray-600">Модератор спора</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Написать модератору
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Scale className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Нет активных споров
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {disputeableTasks.length > 0 
                      ? "У Вас нет открытых споров. Если возникли проблемы с проектом, Вы можете открыть спор."
                      : "У Вас нет проектов, по которым можно открыть спор."
                    }
                  </p>
                  {disputeableTasks.length > 0 && (
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Открыть спор
                    </Button>
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
