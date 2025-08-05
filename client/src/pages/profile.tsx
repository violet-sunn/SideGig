import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Mail, MapPin, Calendar, Star, Settings } from "lucide-react";

export default function Profile() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    bio: "",
    skills: "",
    location: "",
    hourlyRate: "",
  });

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

  const { data: profile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ["/api/profile"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<{
    rating: string;
    completedTasks: string;
    totalEarned?: string;
    totalSpent?: string;
  }>({
    queryKey: ["/api/users/stats"],
    enabled: isAuthenticated,
    retry: false,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PATCH", "/api/profile", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешно!",
        description: "Профиль обновлен",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
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
        description: "Не удалось обновить профиль",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (profile) {
      setProfileData({
        firstName: profile.firstName || user?.firstName || "",
        lastName: profile.lastName || user?.lastName || "",
        email: profile.email || user?.email || "",
        bio: profile.bio || "",
        skills: profile.skills || "",
        location: profile.location || "",
        hourlyRate: profile.hourlyRate || "",
      });
    }
  }, [profile, user]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (profile) {
      setProfileData({
        firstName: profile.firstName || user?.firstName || "",
        lastName: profile.lastName || user?.lastName || "",
        email: profile.email || user?.email || "",
        bio: profile.bio || "",
        skills: profile.skills || "",
        location: profile.location || "",
        hourlyRate: profile.hourlyRate || "",
      });
    }
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return (first + last).toUpperCase() || "U";
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const userRole = user?.role === "client" ? "client" : "freelancer";

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole={userRole} />
      
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Профиль</h1>
            <p className="text-gray-600">Управление вашим профилем и настройками</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Info */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Информация профиля
                  </CardTitle>
                  {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)}>
                      Редактировать
                    </Button>
                  ) : (
                    <div className="space-x-2">
                      <Button 
                        variant="outline" 
                        onClick={handleCancel}
                        disabled={updateProfileMutation.isPending}
                      >
                        Отмена
                      </Button>
                      <Button 
                        onClick={handleSave}
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending ? "Сохранение..." : "Сохранить"}
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  {profileLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                          <div className="h-10 bg-gray-200 rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <form onSubmit={handleSave} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">Имя</Label>
                          <Input
                            id="firstName"
                            value={profileData.firstName}
                            onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                            disabled={!isEditing}
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Фамилия</Label>
                          <Input
                            id="lastName"
                            value={profileData.lastName}
                            onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                            disabled={!isEditing}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                          disabled={!isEditing}
                        />
                      </div>

                      

                      {userRole === "freelancer" && (
                        <>
                          <div>
                            <Label htmlFor="hourlyRate">Почасовая ставка (₽)</Label>
                            <Input
                              id="hourlyRate"
                              type="number"
                              value={profileData.hourlyRate}
                              onChange={(e) => setProfileData({ ...profileData, hourlyRate: e.target.value })}
                              disabled={!isEditing}
                              placeholder="1500"
                            />
                          </div>

                          <div>
                            <Label htmlFor="skills">Навыки</Label>
                            <Input
                              id="skills"
                              value={profileData.skills}
                              onChange={(e) => setProfileData({ ...profileData, skills: e.target.value })}
                              disabled={!isEditing}
                              placeholder="JavaScript, React, Node.js"
                            />
                          </div>
                        </>
                      )}

                      <div>
                        <Label htmlFor="bio">
                          {userRole === "client" ? "О компании" : "О себе"}
                        </Label>
                        <Textarea
                          id="bio"
                          value={profileData.bio}
                          onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                          disabled={!isEditing}
                          placeholder={
                            userRole === "client" 
                              ? "Расскажите о своей компании, сфере деятельности, используемых технологиях и задачах, которые вы обычно размещаете"
                              : "Расскажите о себе, своем опыте, специализации и технологиях, с которыми работаете"
                          }
                          rows={4}
                        />
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Profile Summary */}
            <div className="space-y-6">
              {/* Avatar & Basic Info */}
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Avatar className="h-24 w-24 mx-auto mb-4">
                      <AvatarImage src={user?.profileImageUrl || ""} />
                      <AvatarFallback className="text-2xl">
                        {getInitials(user?.firstName, user?.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {user?.firstName && user?.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : user?.email?.split("@")[0] || "Пользователь"
                      }
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {userRole === "client" ? "Заказчик" : "Исполнитель"}
                    </p>
                    
                    {profileData.location && (
                      <div className="flex items-center justify-center text-gray-500 mb-2">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span className="text-sm">{profileData.location}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-center text-gray-500">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span className="text-sm">
                        Регистрация: {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Статистика</CardTitle>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Рейтинг</span>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="font-semibold">{stats?.rating || "Нет"}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Завершено задач</span>
                        <span className="font-semibold">{stats?.completedTasks || "0"}</span>
                      </div>
                      
                      {userRole === "freelancer" && stats?.totalEarned && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Заработано</span>
                          <span className="font-semibold">₽{Number(stats.totalEarned).toLocaleString()}</span>
                        </div>
                      )}
                      
                      {userRole === "client" && stats?.totalSpent && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Потрачено</span>
                          <span className="font-semibold">₽{Number(stats.totalSpent).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Skills (for freelancers) */}
              {userRole === "freelancer" && profileData.skills && (
                <Card>
                  <CardHeader>
                    <CardTitle>Навыки</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {profileData.skills.split(",").map((skill, index) => (
                        <Badge key={index} variant="secondary">
                          {skill.trim()}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}