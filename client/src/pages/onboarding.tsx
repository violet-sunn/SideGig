import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Handshake, User, Briefcase, X } from "lucide-react";

export default function Onboarding() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    role: "",
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    bio: "",
    skills: [] as string[],
  });

  const [currentSkill, setCurrentSkill] = useState("");

  const completeOnboardingMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/profile/onboarding", "POST", data);
    },
    onSuccess: () => {
      toast({ 
        title: "Добро пожаловать!", 
        description: "Регистрация завершена успешно" 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // Перенаправление произойдет автоматически когда user обновится
    },
    onError: (error) => {
      console.error("Onboarding error:", error);
      toast({ 
        title: "Ошибка", 
        description: "Не удалось завершить регистрацию", 
        variant: "destructive" 
      });
    },
  });

  const handleAddSkill = () => {
    if (currentSkill.trim() && !formData.skills.includes(currentSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, currentSkill.trim()]
      }));
      setCurrentSkill("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.role || !formData.firstName || !formData.lastName) {
      toast({
        title: "Заполните обязательные поля",
        description: "Роль, имя и фамилия обязательны для заполнения",
        variant: "destructive"
      });
      return;
    }

    completeOnboardingMutation.mutate({
      ...formData,
      onboardingCompleted: true
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
            <Handshake className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Добро пожаловать в Gigly!
          </h1>
          <p className="text-gray-600">
            Давайте настроим ваш профиль для лучшего опыта работы
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Завершите регистрацию</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Role Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Выберите вашу роль *</Label>
                <RadioGroup 
                  value={formData.role} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="client" id="client" />
                      <Label htmlFor="client" className="flex items-center cursor-pointer">
                        <User className="w-5 h-5 mr-2 text-blue-600" />
                        <div>
                          <div className="font-medium">Заказчик</div>
                          <div className="text-sm text-gray-500">Размещаю задачи и нанимаю исполнителей</div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="freelancer" id="freelancer" />
                      <Label htmlFor="freelancer" className="flex items-center cursor-pointer">
                        <Briefcase className="w-5 h-5 mr-2 text-green-600" />
                        <div>
                          <div className="font-medium">Исполнитель</div>
                          <div className="text-sm text-gray-500">Выполняю задачи и предлагаю услуги</div>
                        </div>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Имя *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Введите ваше имя"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Фамилия *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Введите вашу фамилию"
                    required
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <Label htmlFor="bio">О себе</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder={
                    formData.role === "freelancer" 
                      ? "Расскажите о своем опыте, навыках и достижениях..."
                      : "Расскажите о своей компании или проектах..."
                  }
                  rows={4}
                />
              </div>

              {/* Skills (for freelancers) */}
              {formData.role === "freelancer" && (
                <div>
                  <Label>Навыки и технологии</Label>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        value={currentSkill}
                        onChange={(e) => setCurrentSkill(e.target.value)}
                        placeholder="Добавить навык (например, JavaScript)"
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSkill();
                          }
                        }}
                      />
                      <Button type="button" onClick={handleAddSkill}>
                        Добавить
                      </Button>
                    </div>
                    
                    {formData.skills.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.skills.map((skill, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {skill}
                            <X 
                              className="h-3 w-3 cursor-pointer hover:text-red-500" 
                              onClick={() => handleRemoveSkill(skill)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Submit */}
              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={completeOnboardingMutation.isPending}
              >
                {completeOnboardingMutation.isPending ? "Сохранение..." : "Завершить регистрацию"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}