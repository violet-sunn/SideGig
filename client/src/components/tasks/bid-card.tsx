import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Calendar, 
  DollarSign, 
  Star, 
  MessageSquare,
  CheckCircle,
  X,
  Edit,
  Clock
} from "lucide-react";

interface BidCardProps {
  bid: any;
  isOwner?: boolean;
  canAccept?: boolean;
  canReject?: boolean;
}

export default function BidCard({ bid, isOwner = false, canAccept = false, canReject = false }: BidCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get impersonation parameter for API requests - only in development
  const urlParams = new URLSearchParams(window.location.search);
  const impersonateId = urlParams.get('impersonate');
  const isDevelopment = import.meta.env.DEV;
  const shouldImpersonate = isDevelopment && impersonateId;
  const queryParams = shouldImpersonate ? { impersonate: impersonateId } : undefined;
  
  const [isCounterOfferOpen, setIsCounterOfferOpen] = useState(false);
  const [counterOffer, setCounterOffer] = useState({
    amount: bid.amount || "",
    deadline: bid.deadline ? new Date(bid.deadline) : null as Date | null,
    message: "",
  });

  const updateBidMutation = useMutation({
    mutationFn: async ({ bidId, status }: { bidId: string; status: string }) => {
      let endpoint = `/api/bids/${bidId}/status`;
      let body: any = { status };
      
      if (status === "accepted") {
        endpoint = `/api/bids/${bidId}/accept`;
        body = {};
      }
      
      // Add impersonation to query params only in development
      const url = shouldImpersonate ? `${endpoint}?impersonate=${impersonateId}` : endpoint;
      const response = await apiRequest("PATCH", url, body);
      return response.json();
    },
    onSuccess: (_, { status }) => {
      toast({
        title: "Успешно!",
        description: status === "accepted" ? "Заявка принята" : "Заявка отклонена",
      });
      queryClient.invalidateQueries({ queryKey: queryParams ? ["/api/bids/task", queryParams] : ["/api/bids/task"] });
      queryClient.invalidateQueries({ queryKey: queryParams ? ["/api/tasks/my", queryParams] : ["/api/tasks/my"] });
      queryClient.invalidateQueries({ queryKey: queryParams ? ["/api/bids/pending", queryParams] : ["/api/bids/pending"] });
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
        description: "Не удалось обновить статус заявки",
        variant: "destructive",
      });
    },
  });

  const submitCounterOfferMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = shouldImpersonate ? `/api/bids/${bid.id}/counter-offer?impersonate=${impersonateId}` : `/api/bids/${bid.id}/counter-offer`;
      const response = await apiRequest("PATCH", url, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Успешно!",
        description: "Встречное предложение отправлено",
      });
      setIsCounterOfferOpen(false);
      queryClient.invalidateQueries({ queryKey: queryParams ? ["/api/bids/task", queryParams] : ["/api/bids/task"] });
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
        description: "Не удалось отправить встречное предложение",
        variant: "destructive",
      });
    },
  });

  const handleAccept = () => {
    updateBidMutation.mutate({ bidId: bid.id, status: "accepted" });
  };

  const handleReject = () => {
    updateBidMutation.mutate({ bidId: bid.id, status: "rejected" });
  };

  const handleCounterOffer = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!counterOffer.amount || !counterOffer.deadline) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }

    // Validate amount is positive
    if (parseFloat(counterOffer.amount) <= 0) {
      toast({
        title: "Ошибка",
        description: "Укажите корректную сумму",
        variant: "destructive",
      });
      return;
    }

    // Validate deadline is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (counterOffer.deadline <= today) {
      toast({
        title: "Ошибка",
        description: "Срок должен быть в будущем",
        variant: "destructive",
      });
      return;
    }

    submitCounterOfferMutation.mutate({
      counterOfferAmount: parseFloat(counterOffer.amount),
      counterOfferDeadline: counterOffer.deadline.toISOString(),
      counterOfferMessage: counterOffer.message,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-blue-100 text-blue-800";
      case "accepted": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      case "counter_offer": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending": return "Ожидает";
      case "accepted": return "Принята";
      case "rejected": return "Отклонена";
      case "counter_offer": return "Встречное предложение";
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4" />;
      case "accepted": return <CheckCircle className="h-4 w-4" />;
      case "rejected": return <X className="h-4 w-4" />;
      case "counter_offer": return <Edit className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          {/* Freelancer Avatar and Info */}
          <Avatar className="h-12 w-12">
            <AvatarImage src={bid.freelancer?.profileImageUrl} />
            <AvatarFallback>
              {bid.freelancer?.firstName?.[0]}{bid.freelancer?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-semibold text-gray-900">
                  {bid.freelancer?.firstName && bid.freelancer?.lastName
                    ? `${bid.freelancer.firstName} ${bid.freelancer.lastName}`
                    : "Фрилансер"
                  }
                </h4>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span>{bid.freelancer?.skills?.join(", ") || "Навыки не указаны"}</span>
                  <span>•</span>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-500 mr-1" />
                    <span>{Number(bid.freelancer?.rating || 0).toFixed(1)}</span>
                    <span className="ml-1">({bid.freelancer?.totalReviews || 0} отзывов)</span>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center space-x-2 mb-1">
                  <Badge className={getStatusColor(bid.status)}>
                    <div className="flex items-center">
                      {getStatusIcon(bid.status)}
                      <span className="ml-1">{getStatusText(bid.status)}</span>
                    </div>
                  </Badge>
                </div>
                <div className="flex items-center text-lg font-bold text-gray-900">
                  <DollarSign className="h-5 w-5 mr-1" />
                  ₽{Number(bid.amount).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Bid Details */}
            <div className="mb-4">
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <Calendar className="h-4 w-4 mr-1" />
                <span>Срок: {new Date(bid.deadline).toLocaleDateString()}</span>
              </div>
              <p className="text-gray-700">{bid.proposal}</p>
            </div>

            {/* Counter Offer Info */}
            {bid.status === "counter_offer" && bid.counterOfferAmount && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <h5 className="font-medium text-orange-900 mb-2">Встречное предложение</h5>
                <div className="flex items-center space-x-4 text-sm text-orange-800 mb-2">
                  <span>Цена: ₽{Number(bid.counterOfferAmount).toLocaleString()}</span>
                  <span>•</span>
                  <span>Срок: {new Date(bid.counterOfferDeadline).toLocaleDateString()}</span>
                </div>
                {bid.counterOfferMessage && (
                  <p className="text-orange-700">{bid.counterOfferMessage}</p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Подана {new Date(bid.createdAt).toLocaleDateString()}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Сообщение
                </Button>
                
                {canAccept && bid.status === "pending" && (
                  <>
                    <Dialog open={isCounterOfferOpen} onOpenChange={setIsCounterOfferOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Встречное предложение
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Встречное предложение</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCounterOffer} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="counter-amount">Ваша цена (₽)</Label>
                              <NumberInput
                                id="counter-amount"
                                value={counterOffer.amount}
                                onChange={(value) => setCounterOffer(prev => ({ ...prev, amount: value }))}
                                min={1}
                                max={10000000}
                                currency={true}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="counter-deadline">Срок выполнения</Label>
                              <DatePicker
                                id="counter-deadline"
                                value={counterOffer.deadline || undefined}
                                onChange={(date) => setCounterOffer(prev => ({ ...prev, deadline: date || null }))}
                                placeholder="Выберите срок"
                                minDate={new Date(Date.now() + 24 * 60 * 60 * 1000)}
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="counter-message">Комментарий</Label>
                            <Textarea
                              id="counter-message"
                              value={counterOffer.message}
                              onChange={(e) => setCounterOffer(prev => ({ ...prev, message: e.target.value }))}
                              placeholder="Объясните ваши условия..."
                            />
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={() => setIsCounterOfferOpen(false)}>
                              Отмена
                            </Button>
                            <Button type="submit" disabled={submitCounterOfferMutation.isPending}>
                              {submitCounterOfferMutation.isPending ? "Отправка..." : "Отправить"}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                    
                    <Button 
                      size="sm" 
                      onClick={handleAccept}
                      disabled={updateBidMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Принять
                    </Button>
                  </>
                )}
                
                {canReject && bid.status === "pending" && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleReject}
                    disabled={updateBidMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Отклонить
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
