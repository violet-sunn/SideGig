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
import { DatePicker } from "@/components/ui/date-picker";
import { NumberInput } from "@/components/ui/number-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Mail, 
  MapPin, 
  Calendar, 
  Star, 
  Settings, 
  Briefcase, 
  Award, 
  TrendingUp, 
  DollarSign, 
  Eye, 
  Edit3, 
  Plus, 
  X, 
  ExternalLink, 
  Download, 
  Share2, 
  CheckCircle,
  Users,
  Clock,
  Trophy,
  Target,
  Globe
} from "lucide-react";

export default function Profile() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();

  // Get impersonation for queryKey consistency
  const urlParams = new URLSearchParams(window.location.search);
  const impersonateId = urlParams.get('impersonate');
  const isDevelopment = import.meta.env.DEV;
  const shouldImpersonate = isDevelopment && impersonateId;
  const queryParams = shouldImpersonate ? { impersonate: impersonateId } : undefined;

  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    bio: "",
    skills: "",
    location: "",
    hourlyRate: "",
    title: "",
    website: "",
    linkedin: "",
    github: "",
    languages: "",
    experience: "",
    education: "",
    certifications: ""
  });
  const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
  const [newPortfolioItem, setNewPortfolioItem] = useState({
    title: "",
    description: "",
    technologies: "",
    projectUrl: "",
    imageUrl: "",
    completedAt: null as Date | null
  });
  const [showAddPortfolio, setShowAddPortfolio] = useState(false);

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
    queryKey: queryParams ? ["/api/profile", queryParams] : ["/api/profile"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: portfolio, isLoading: portfolioLoading } = useQuery<any[]>({
    queryKey: queryParams ? ["/api/profile/portfolio", queryParams] : ["/api/profile/portfolio"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery<any[]>({
    queryKey: queryParams ? ["/api/profile/reviews", queryParams] : ["/api/profile/reviews"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<{
    rating: string;
    completedTasks: string;
    totalEarned?: string;
    totalSpent?: string;
    activeProjects?: string;
    responseTime?: string;
    completionRate?: string;
  }>({
    queryKey: queryParams ? ["/api/users/stats", queryParams] : ["/api/users/stats"],
    enabled: isAuthenticated,
    retry: false,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("/api/profile", "PATCH", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешно!",
        description: "Профиль обновлен",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: queryParams ? ["/api/profile", queryParams] : ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: shouldImpersonate ? ["/api/auth/user", { impersonate: impersonateId }] : ["/api/auth/user"] });
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
        title: profile.title || "",
        website: profile.website || "",
        linkedin: profile.linkedin || "",
        github: profile.github || "",
        languages: profile.languages || "",
        experience: profile.experience || "",
        education: profile.education || "",
        certifications: profile.certifications || ""
      });
    }
    if (portfolio) {
      setPortfolioItems(portfolio);
    }
  }, [profile, portfolio, user]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate hourly rate if provided
    if (userRole === "freelancer" && profileData.hourlyRate) {
      const rate = parseFloat(profileData.hourlyRate);
      if (isNaN(rate) || rate < 0) {
        toast({
          title: "Ошибка",
          description: "Укажите корректную стоимость в час",
          variant: "destructive"
        });
        return;
      }
    }
    
    updateProfileMutation.mutate(profileData);
  };

  const addPortfolioItemMutation = useMutation({
    mutationFn: async (portfolioData: any) => {
      const response = await apiRequest("/api/profile/portfolio", "POST", portfolioData);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Успешно!", description: "Проект добавлен в портфолио" });
      setShowAddPortfolio(false);
      setNewPortfolioItem({ title: "", description: "", technologies: "", projectUrl: "", imageUrl: "", completedAt: null });
      queryClient.invalidateQueries({ queryKey: queryParams ? ["/api/profile/portfolio", queryParams] : ["/api/profile/portfolio"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Unauthorized", description: "You are logged out. Logging in again...", variant: "destructive" });
        setTimeout(() => window.location.href = "/api/login", 500);
        return;
      }
      toast({ title: "Ошибка", description: "Не удалось добавить проект", variant: "destructive" });
    },
  });

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
        title: profile.title || "",
        website: profile.website || "",
        linkedin: profile.linkedin || "",
        github: profile.github || "",
        languages: profile.languages || "",
        experience: profile.experience || "",
        education: profile.education || "",
        certifications: profile.certifications || ""
      });
    }
  };

  const handleAddPortfolio = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortfolioItem.title || !newPortfolioItem.description) {
      toast({ title: "Ошибка", description: "Заполните обязательные поля", variant: "destructive" });
      return;
    }

    // Validate completion date is not in the future
    if (newPortfolioItem.completedAt) {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (newPortfolioItem.completedAt > today) {
        toast({
          title: "Ошибка",
          description: "Дата завершения не может быть в будущем",
          variant: "destructive"
        });
        return;
      }
    }

    const portfolioData = {
      ...newPortfolioItem,
      completedAt: newPortfolioItem.completedAt ? newPortfolioItem.completedAt.toISOString() : null
    };
    
    addPortfolioItemMutation.mutate(portfolioData);
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return (first + last).toUpperCase() || "U";
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center">
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
          {/* Enhanced Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Мой профиль</h1>
                <p className="text-gray-600">Профессиональное портфолио и настройки аккаунта</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Поделиться профилем
                </Button>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Предварительный просмотр
                </Button>
              </div>
            </div>
          </div>

          {/* Enhanced Tabbed Interface */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b mb-6">
              <TabsList className={`grid w-full ${userRole === 'freelancer' ? 'grid-cols-5' : 'grid-cols-3'}`}>
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Обзор
                </TabsTrigger>
                {userRole === 'freelancer' && (
                  <>
                    <TabsTrigger value="portfolio" className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Портфолио
                    </TabsTrigger>
                    <TabsTrigger value="reviews" className="flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Отзывы
                    </TabsTrigger>
                  </>
                )}
                <TabsTrigger value="stats" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Статистика
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Настройки
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content Tabs */}
              <div className="lg:col-span-2">
                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="flex items-center">
                        <User className="h-5 w-5 mr-2" />
                        Основная информация
                      </CardTitle>
                      {!isEditing ? (
                        <Button onClick={() => setIsEditing(true)} size="sm">
                          <Edit3 className="h-4 w-4 mr-2" />
                          Редактировать
                        </Button>
                      ) : (
                        <div className="space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleCancel}
                            disabled={updateProfileMutation.isPending}
                          >
                            Отмена
                          </Button>
                          <Button 
                            size="sm"
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

                      <div>
                        <Label htmlFor="title">
                          {userRole === "client" ? "Должность" : "Специализация"}
                        </Label>
                        <Input
                          id="title"
                          value={profileData.title}
                          onChange={(e) => setProfileData({ ...profileData, title: e.target.value })}
                          disabled={!isEditing}
                          placeholder={
                            userRole === "client" 
                              ? "Например: СТО, Менеджер проектов"
                              : "Например: Full-stack разработчик"
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor="location">Местоположение</Label>
                        <Input
                          id="location"
                          value={profileData.location}
                          onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                          disabled={!isEditing}
                          placeholder="Город, страна"
                        />
                      </div>

                      {userRole === "freelancer" && (
                        <>
                          <div>
                            <Label htmlFor="hourlyRate">Стоимость в час (₽)</Label>
                            <NumberInput
                              id="hourlyRate"
                              value={profileData.hourlyRate}
                              onChange={(value) => setProfileData({ ...profileData, hourlyRate: value })}
                              disabled={!isEditing}
                              placeholder="1500"
                              min={0}
                              max={50000}
                              currency={true}
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
                </TabsContent>

                {/* Portfolio Tab */}
                {userRole === 'freelancer' && (
                  <TabsContent value="portfolio" className="space-y-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-semibold">Портфолио</h3>
                      <Dialog open={showAddPortfolio} onOpenChange={setShowAddPortfolio}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Добавить проект
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Добавить проект в портфолио</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleAddPortfolio} className="space-y-4">
                            <div>
                              <Label htmlFor="portfolio-title">Название проекта *</Label>
                              <Input
                                id="portfolio-title"
                                value={newPortfolioItem.title}
                                onChange={(e) => setNewPortfolioItem({...newPortfolioItem, title: e.target.value})}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="portfolio-description">Описание проекта *</Label>
                              <Textarea
                                id="portfolio-description"
                                value={newPortfolioItem.description}
                                onChange={(e) => setNewPortfolioItem({...newPortfolioItem, description: e.target.value})}
                                rows={4}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="portfolio-technologies">Технологии</Label>
                              <Input
                                id="portfolio-technologies"
                                value={newPortfolioItem.technologies}
                                onChange={(e) => setNewPortfolioItem({...newPortfolioItem, technologies: e.target.value})}
                                placeholder="React, Node.js, PostgreSQL"
                              />
                            </div>
                            <div>
                              <Label htmlFor="portfolio-url">Ссылка на проект</Label>
                              <Input
                                id="portfolio-url"
                                type="url"
                                value={newPortfolioItem.projectUrl}
                                onChange={(e) => setNewPortfolioItem({...newPortfolioItem, projectUrl: e.target.value})}
                              />
                            </div>
                            <div>
                              <Label htmlFor="portfolio-image">Изображение проекта (URL)</Label>
                              <Input
                                id="portfolio-image"
                                type="url"
                                value={newPortfolioItem.imageUrl}
                                onChange={(e) => setNewPortfolioItem({...newPortfolioItem, imageUrl: e.target.value})}
                              />
                            </div>
                            <div>
                              <Label htmlFor="portfolio-date">Дата завершения</Label>
                              <DatePicker
                                id="portfolio-date"
                                value={newPortfolioItem.completedAt || undefined}
                                onChange={(date) => setNewPortfolioItem({...newPortfolioItem, completedAt: date || null})}
                                placeholder="Выберите дату завершения"
                                maxDate={new Date()}
                              />
                            </div>
                            <div className="flex justify-end space-x-2 pt-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setShowAddPortfolio(false);
                                  setNewPortfolioItem({ title: "", description: "", technologies: "", projectUrl: "", imageUrl: "", completedAt: null });
                                }}
                              >
                                Отмена
                              </Button>
                              <Button
                                type="submit"
                                disabled={addPortfolioItemMutation.isPending}
                              >
                                {addPortfolioItemMutation.isPending ? "Добавление..." : "Добавить"}
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {portfolioLoading ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                          <Card key={i} className="animate-pulse">
                            <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                            <CardContent className="p-4">
                              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : portfolioItems && portfolioItems.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {portfolioItems.map((item: any) => (
                          <Card key={item.id} className="group hover:shadow-lg transition-shadow">
                            {item.imageUrl && (
                              <div className="h-48 bg-gray-100 rounded-t-lg overflow-hidden">
                                <img
                                  src={item.imageUrl}
                                  alt={item.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                              </div>
                            )}
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-semibold text-lg">{item.title}</h4>
                                {item.projectUrl && (
                                  <a
                                    href={item.projectUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                {item.description}
                              </p>
                              {item.technologies && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {item.technologies.split(',').map((tech: string, i: number) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {tech.trim()}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {item.completedAt && (
                                <div className="flex items-center text-gray-500 text-xs">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {new Date(item.completedAt).toLocaleDateString()}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card className="text-center py-12">
                        <CardContent>
                          <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Портфолио пусто</h3>
                          <p className="text-gray-600 mb-4">Добавьте свои проекты, чтобы показать свою экспертизу клиентам</p>
                          <Button onClick={() => setShowAddPortfolio(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Добавить первый проект
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                )}

                {/* Reviews Tab */}
                {userRole === 'freelancer' && (
                  <TabsContent value="reviews" className="space-y-6">
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">Отзывы клиентов</h3>
                      <p className="text-gray-600">Отзывы помогают другим клиентам принять решение о сотрудничестве</p>
                    </div>

                    {reviewsLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <Card key={i} className="animate-pulse">
                            <CardContent className="p-4">
                              <div className="flex items-center mb-3">
                                <div className="w-10 h-10 bg-gray-200 rounded-full mr-3"></div>
                                <div className="flex-1">
                                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-1"></div>
                                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="h-3 bg-gray-200 rounded"></div>
                                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : reviews && reviews.length > 0 ? (
                      <div className="space-y-4">
                        {reviews.map((review: any) => (
                          <Card key={review.id}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center">
                                  <Avatar className="h-10 w-10 mr-3">
                                    <AvatarImage src={review.reviewer?.profileImageUrl} />
                                    <AvatarFallback>
                                      {getInitials(review.reviewer?.firstName, review.reviewer?.lastName)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">
                                      {review.reviewer?.firstName} {review.reviewer?.lastName}
                                    </p>
                                    <div className="flex items-center">
                                      {[...Array(5)].map((_, i) => (
                                        <Star
                                          key={i}
                                          className={`h-4 w-4 ${
                                            i < review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                                          }`}
                                        />
                                      ))}
                                      <span className="ml-2 text-sm text-gray-600">
                                        {new Date(review.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {review.comment && (
                                <p className="text-gray-700 leading-relaxed">{review.comment}</p>
                              )}
                              {review.task && (
                                <div className="mt-3 p-3 bg-gray-50 rounded">
                                  <p className="text-sm font-medium text-gray-800">Проект: {review.task.title}</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <Card className="text-center py-12">
                        <CardContent>
                          <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Отзывов пока нет</h3>
                          <p className="text-gray-600">Завершите свои первые проекты, чтобы получить отзывы от клиентов</p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                )}

                {/* Statistics Tab */}
                <TabsContent value="stats" className="space-y-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2">Детальная статистика</h3>
                    <p className="text-gray-600">Полная информация о вашей активности на платформе</p>
                  </div>

                  {statsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Card key={i} className="animate-pulse">
                          <CardContent className="p-6">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Общий рейтинг</p>
                              <p className="text-3xl font-bold text-gray-900">{stats?.rating || "Н/Д"}</p>
                            </div>
                            <Trophy className="h-8 w-8 text-yellow-500" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Завершено проектов</p>
                              <p className="text-3xl font-bold text-gray-900">{stats?.completedTasks || "0"}</p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-500" />
                          </div>
                        </CardContent>
                      </Card>

                      {userRole === "freelancer" && (
                        <>
                          <Card>
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-600">Заработано всего</p>
                                  <p className="text-3xl font-bold text-gray-900">
                                    ₽{stats?.totalEarned ? Number(stats.totalEarned).toLocaleString() : "0"}
                                  </p>
                                </div>
                                <DollarSign className="h-8 w-8 text-green-500" />
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-600">Активных проектов</p>
                                  <p className="text-3xl font-bold text-gray-900">{stats?.activeProjects || "0"}</p>
                                </div>
                                <Clock className="h-8 w-8 text-blue-500" />
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-600">Время отклика</p>
                                  <p className="text-3xl font-bold text-gray-900">{stats?.responseTime || "Н/Д"}</p>
                                </div>
                                <Target className="h-8 w-8 text-purple-500" />
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-600">% завершения</p>
                                  <p className="text-3xl font-bold text-gray-900">{stats?.completionRate || "Н/Д"}</p>
                                </div>
                                <TrendingUp className="h-8 w-8 text-indigo-500" />
                              </div>
                            </CardContent>
                          </Card>
                        </>
                      )}

                      {userRole === "client" && stats?.totalSpent && (
                        <Card>
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-600">Потрачено всего</p>
                                <p className="text-3xl font-bold text-gray-900">
                                  ₽{Number(stats.totalSpent).toLocaleString()}
                                </p>
                              </div>
                              <DollarSign className="h-8 w-8 text-red-500" />
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Settings className="h-5 w-5 mr-2" />
                        Дополнительные настройки
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {userRole === "freelancer" && (
                        <>
                          <div>
                            <Label htmlFor="title">Профессиональное звание</Label>
                            <Input
                              id="title"
                              value={profileData.title}
                              onChange={(e) => setProfileData({ ...profileData, title: e.target.value })}
                              disabled={!isEditing}
                              placeholder="Senior Frontend Developer"
                            />
                          </div>
                          
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
                        </>
                      )}
                      
                      <div>
                        <Label htmlFor="website">Веб-сайт</Label>
                        <Input
                          id="website"
                          type="url"
                          value={profileData.website}
                          onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                          disabled={!isEditing}
                          placeholder="https://yourwebsite.com"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="linkedin">LinkedIn</Label>
                          <Input
                            id="linkedin"
                            value={profileData.linkedin}
                            onChange={(e) => setProfileData({ ...profileData, linkedin: e.target.value })}
                            disabled={!isEditing}
                            placeholder="https://linkedin.com/in/yourname"
                          />
                        </div>
                        <div>
                          <Label htmlFor="github">GitHub</Label>
                          <Input
                            id="github"
                            value={profileData.github}
                            onChange={(e) => setProfileData({ ...profileData, github: e.target.value })}
                            disabled={!isEditing}
                            placeholder="https://github.com/yourname"
                          />
                        </div>
                      </div>
                      
                      {userRole === "freelancer" && (
                        <>
                          <div>
                            <Label htmlFor="languages">Языки</Label>
                            <Input
                              id="languages"
                              value={profileData.languages}
                              onChange={(e) => setProfileData({ ...profileData, languages: e.target.value })}
                              disabled={!isEditing}
                              placeholder="Русский (родной), Английский (B2)"
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="experience">Опыт работы</Label>
                            <Textarea
                              id="experience"
                              value={profileData.experience}
                              onChange={(e) => setProfileData({ ...profileData, experience: e.target.value })}
                              disabled={!isEditing}
                              placeholder="Опишите ваш профессиональный опыт..."
                              rows={3}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="education">Образование</Label>
                            <Textarea
                              id="education"
                              value={profileData.education}
                              onChange={(e) => setProfileData({ ...profileData, education: e.target.value })}
                              disabled={!isEditing}
                              placeholder="Укажите ваше образование..."
                              rows={2}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="certifications">Сертификаты</Label>
                            <Textarea
                              id="certifications"
                              value={profileData.certifications}
                              onChange={(e) => setProfileData({ ...profileData, certifications: e.target.value })}
                              disabled={!isEditing}
                              placeholder="Перечислите ваши сертификаты..."
                              rows={2}
                            />
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>

              {/* Profile Summary Sidebar */}
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
          </Tabs>
        </div>
      </main>
    </div>
  );
}