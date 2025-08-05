import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import RatingStars from "@/components/reviews/rating-stars";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, MessageSquare, Award, TrendingUp } from "lucide-react";

export default function Reviews() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();

  const [newReview, setNewReview] = useState({
    taskId: "",
    revieweeId: "",
    rating: 5,
    qualityRating: 5,
    timelinessRating: 5,
    communicationRating: 5,
    comment: "",
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

  const { data: reviews, isLoading: reviewsLoading } = useQuery<any[]>({
    queryKey: ["/api/reviews"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: completedTasks, isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: ["/api/tasks/completed"],
    enabled: isAuthenticated,
    retry: false,
  });

  const submitReviewMutation = useMutation({
    mutationFn: async (reviewData: any) => {
      const response = await apiRequest("POST", "/api/reviews", reviewData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешно!",
        description: "Отзыв опубликован",
      });
      setNewReview({
        taskId: "",
        revieweeId: "",
        rating: 5,
        qualityRating: 5,
        timelinessRating: 5,
        communicationRating: 5,
        comment: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/stats"] });
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
        description: "Не удалось опубликовать отзыв",
        variant: "destructive",
      });
    },
  });

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newReview.taskId || !newReview.revieweeId || !newReview.comment) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }

    submitReviewMutation.mutate(newReview);
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate average ratings from received reviews
  const receivedReviews = reviews?.filter((review: any) => review.revieweeId === user?.id) || [];
  const givenReviews = reviews?.filter((review: any) => review.reviewerId === user?.id) || [];
  
  const averageRating = receivedReviews.length > 0 
    ? receivedReviews.reduce((sum: number, review: any) => sum + review.rating, 0) / receivedReviews.length
    : 0;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole={user?.role || "client"} />
      
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Отзывы и рейтинги</h1>
            <p className="text-gray-600">Управление отзывами и оценка работы</p>
          </div>

          {/* Rating Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  {averageRating.toFixed(1)}
                </div>
                <div className="flex justify-center mb-2">
                  <RatingStars rating={averageRating} size="lg" />
                </div>
                <p className="text-sm text-gray-600">Средний рейтинг</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Получено отзывов</p>
                    <p className="text-3xl font-bold text-gray-900">{receivedReviews.length}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Star className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Дано отзывов</p>
                    <p className="text-3xl font-bold text-gray-900">{givenReviews.length}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <MessageSquare className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Уровень</p>
                    <p className="text-lg font-bold text-gray-900">
                      {averageRating >= 4.5 ? "Эксперт" : 
                       averageRating >= 4.0 ? "Профи" : 
                       averageRating >= 3.5 ? "Опытный" : "Новичок"}
                    </p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Award className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Write Review Section */}
            <Card>
              <CardHeader>
                <CardTitle>Оставить отзыв</CardTitle>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                  </div>
                ) : completedTasks && completedTasks.length > 0 ? (
                  <form onSubmit={handleSubmitReview} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Выберите завершенный проект
                      </label>
                      <select
                        value={newReview.taskId}
                        onChange={(e) => {
                          const task = completedTasks.find((t: any) => t.id === e.target.value);
                          setNewReview(prev => ({
                            ...prev,
                            taskId: e.target.value,
                            revieweeId: user?.role === "client" 
                              ? task?.assignedFreelancerId || ""
                              : task?.clientId || ""
                          }));
                        }}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="">Выберите проект</option>
                        {completedTasks.map((task: any) => (
                          <option key={task.id} value={task.id}>
                            {task.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Overall Rating */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Общая оценка
                      </label>
                      <div className="flex items-center space-x-4">
                        <RatingStars 
                          rating={newReview.rating}
                          onChange={(rating) => setNewReview(prev => ({ ...prev, rating }))}
                          interactive
                          size="lg"
                        />
                        <span className="text-lg font-medium text-gray-700">
                          {newReview.rating} из 5
                        </span>
                      </div>
                    </div>

                    {/* Category Ratings */}
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Качество работы
                        </label>
                        <RatingStars 
                          rating={newReview.qualityRating}
                          onChange={(rating) => setNewReview(prev => ({ ...prev, qualityRating: rating }))}
                          interactive
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Соблюдение сроков
                        </label>
                        <RatingStars 
                          rating={newReview.timelinessRating}
                          onChange={(rating) => setNewReview(prev => ({ ...prev, timelinessRating: rating }))}
                          interactive
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Коммуникация
                        </label>
                        <RatingStars 
                          rating={newReview.communicationRating}
                          onChange={(rating) => setNewReview(prev => ({ ...prev, communicationRating: rating }))}
                          interactive
                        />
                      </div>
                    </div>

                    {/* Written Review */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Письменный отзыв *
                      </label>
                      <Textarea
                        value={newReview.comment}
                        onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                        placeholder="Поделитесь опытом работы..."
                        className="min-h-[100px]"
                        required
                      />
                    </div>

                    <div className="flex justify-end space-x-4">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setNewReview({
                          taskId: "",
                          revieweeId: "",
                          rating: 5,
                          qualityRating: 5,
                          timelinessRating: 5,
                          communicationRating: 5,
                          comment: "",
                        })}
                      >
                        Отмена
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={submitReviewMutation.isPending}
                      >
                        {submitReviewMutation.isPending ? "Публикация..." : "Опубликовать отзыв"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Нет завершенных проектов для оценки</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Reviews */}
            <Card>
              <CardHeader>
                <CardTitle>Последние отзывы</CardTitle>
              </CardHeader>
              <CardContent>
                {reviewsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="flex items-start space-x-3 p-4 border rounded-lg">
                          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : receivedReviews.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {receivedReviews.map((review: any) => (
                      <div key={review.id} className="border rounded-lg p-4">
                        <div className="flex items-start space-x-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={review.reviewer?.profileImageUrl} />
                            <AvatarFallback>
                              {review.reviewer?.firstName?.[0]}{review.reviewer?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-900">
                                {review.reviewer?.firstName && review.reviewer?.lastName
                                  ? `${review.reviewer.firstName} ${review.reviewer.lastName}`
                                  : "Пользователь"
                                }
                              </h4>
                              <span className="text-sm text-gray-500">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {review.task?.title || "Проект"}
                            </p>
                            <div className="flex items-center space-x-2 mb-3">
                              <RatingStars rating={review.rating} />
                              <span className="text-sm text-gray-600">{review.rating.toFixed(1)}</span>
                            </div>
                            <p className="text-gray-700">{review.comment}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">У вас пока нет отзывов</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
