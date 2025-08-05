import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, CloudUpload } from "lucide-react";
import { useLocation } from "wouter";

const categories = [
  "Веб-разработка",
  "Мобильная разработка", 
  "Дизайн",
  "Маркетинг",
  "Копирайтинг",
  "Переводы",
  "SEO",
  "Консультации",
  "Другое",
];

const priorities = [
  { value: "normal", label: "Обычный" },
  { value: "high", label: "Высокий" },
  { value: "urgent", label: "Срочно" },
];

export default function CreateTask() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    budget: "",
    deadline: "",
    priority: "normal",
    skills: [] as string[],
  });

  const [currentSkill, setCurrentSkill] = useState("");

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

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const response = await apiRequest("POST", "/api/tasks", taskData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешно!",
        description: "Задача создана и опубликована",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/stats"] });
      setLocation("/tasks");
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
        description: "Не удалось создать задачу",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.category || !formData.budget) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }

    createTaskMutation.mutate({
      title: formData.title,
      description: formData.description,
      category: formData.category,
      budget: parseFloat(formData.budget),
      deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
      priority: formData.priority,
      skills: formData.skills,
    });
  };

  const addSkill = () => {
    if (currentSkill.trim() && !formData.skills.includes(currentSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, currentSkill.trim()]
      }));
      setCurrentSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole="client" />
      
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Создать новую задачу</h1>
            <p className="text-gray-600">Опишите задачу подробно, чтобы привлечь лучших исполнителей</p>
          </div>

          <div className="max-w-4xl">
            <Card>
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <Label htmlFor="title">Название задачи *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Например: Разработка веб-сайта для ресторана"
                        className="mt-2"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="category">Категория *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Выберите категорию" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="budget">Бюджет (₽) *</Label>
                      <Input
                        id="budget"
                        type="number"
                        value={formData.budget}
                        onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                        placeholder="50000"
                        className="mt-2"
                        min="0"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="deadline">Срок выполнения</Label>
                      <Input
                        id="deadline"
                        type="date"
                        value={formData.deadline}
                        onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                        className="mt-2"
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>

                    <div>
                      <Label htmlFor="priority">Приоритет</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {priorities.map((priority) => (
                            <SelectItem key={priority.value} value={priority.value}>
                              {priority.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="description">Описание задачи *</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Подробно опишите что нужно сделать, какие требования к результату, какие материалы предоставите..."
                        className="mt-2 min-h-[120px]"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="skills">Необходимые навыки</Label>
                      <div className="mt-2">
                        {formData.skills.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {formData.skills.map((skill) => (
                              <Badge key={skill} className="bg-primary text-white">
                                {skill}
                                <button
                                  type="button"
                                  onClick={() => removeSkill(skill)}
                                  className="ml-2 hover:text-red-200"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Input
                            value={currentSkill}
                            onChange={(e) => setCurrentSkill(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Добавить навык..."
                            className="flex-1"
                          />
                          <Button type="button" onClick={addSkill} variant="outline">
                            Добавить
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <Label>Прикрепить файлы</Label>
                      <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                        <CloudUpload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">
                          Перетащите файлы сюда или{" "}
                          <button type="button" className="text-primary font-medium">
                            выберите файлы
                          </button>
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          Максимум 10 файлов, до 25 МБ каждый
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-6 border-t">
                    <Button type="button" variant="outline">
                      Сохранить как черновик
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createTaskMutation.isPending}
                      className="min-w-[150px]"
                    >
                      {createTaskMutation.isPending ? "Создание..." : "Опубликовать задачу"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
