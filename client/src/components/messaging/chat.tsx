import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Paperclip, Phone, Video, MoreVertical } from "lucide-react";

interface ChatProps {
  taskId: string;
  otherUser: any;
  taskTitle?: string;
  taskBudget?: number;
}

export default function Chat({ taskId, otherUser, taskTitle, taskBudget }: ChatProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading: messagesLoading } = useQuery<any[]>({
    queryKey: ["/api/messages/task", taskId],
    enabled: !!taskId,
    retry: false,
    refetchInterval: 5000, // Poll for new messages every 5 seconds
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const response = await apiRequest("/api/messages", "POST", messageData);
      return response.json();
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages/task", taskId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
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
        description: "Не удалось отправить сообщение",
        variant: "destructive",
      });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/messages/read/${taskId}`, "PATCH", {});
      return response.json();
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim() || !taskId || !otherUser?.id) return;

    sendMessageMutation.mutate({
      taskId,
      receiverId: otherUser.id,
      content: messageText.trim(),
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark messages as read when component loads
  useEffect(() => {
    if (taskId && messages && messages.length > 0) {
      markAsReadMutation.mutate();
    }
  }, [taskId, messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-white border-b p-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={otherUser?.profileImageUrl} />
              <AvatarFallback>
                {otherUser?.firstName?.[0]}{otherUser?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-gray-900">
                {otherUser?.firstName && otherUser?.lastName
                  ? `${otherUser.firstName} ${otherUser.lastName}`
                  : "Пользователь"
                }
              </h3>
              <p className="text-sm text-gray-600">
                {taskTitle && taskBudget 
                  ? `${taskTitle} • ₽${taskBudget.toLocaleString()}`
                  : "Проект"
                }
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon">
              <Phone className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Video className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {messagesLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <Card className="max-w-lg">
                    <CardContent className="p-4">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        ) : messages && messages.length > 0 ? (
          <>
            {messages.map((message: any) => (
              <div key={message.id} className={`flex items-start space-x-3 ${
                message.senderId === user?.id ? "justify-end" : ""
              }`}>
                {message.senderId !== user?.id && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={otherUser?.profileImageUrl} />
                    <AvatarFallback className="text-xs">
                      {otherUser?.firstName?.[0]}{otherUser?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="max-w-lg">
                  <Card className={`${
                    message.senderId === user?.id 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-white"
                  }`}>
                    <CardContent className="p-3">
                      <p className="text-sm">{message.content}</p>
                    </CardContent>
                  </Card>
                  <p className={`text-xs text-gray-500 mt-1 ${
                    message.senderId === user?.id ? "text-right" : ""
                  }`}>
                    {new Date(message.createdAt).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
                {message.senderId === user?.id && user && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.profileImageUrl || ""} />
                    <AvatarFallback className="text-xs">
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-gray-600">Начните диалог с вашим сообщением</p>
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="bg-white border-t p-6 flex-shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-4">
          <div className="flex-1">
            <Textarea
              placeholder="Введите сообщение..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="resize-none min-h-[60px] max-h-[120px]"
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e as any);
                }
              }}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Button type="button" variant="ghost" size="icon">
              <Paperclip className="h-5 w-5" />
            </Button>
            <Button 
              type="submit" 
              disabled={!messageText.trim() || sendMessageMutation.isPending}
              size="icon"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
