import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Send, Phone, Video, MoreVertical, Paperclip, Lock } from "lucide-react";
import Sidebar from "@/components/layout/sidebar";

export default function Messages() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Check URL params to auto-select task
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const taskIdFromUrl = urlParams.get('taskId');
    if (taskIdFromUrl && !selectedTaskId) {
      setSelectedTaskId(taskIdFromUrl);
    }
  }, [selectedTaskId]);

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

  const { data: conversations, isLoading: conversationsLoading } = useQuery<any[]>({
    queryKey: ["/api/conversations"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<any[]>({
    queryKey: [`/api/messages/task/${selectedTaskId}`],
    enabled: isAuthenticated && !!selectedTaskId,
    retry: false,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const response = await apiRequest("/api/messages", "POST", messageData);
      return response.json();
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: [`/api/messages/task/${selectedTaskId}`] });
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim() || !selectedTaskId) return;

    // Find the conversation to get the other user's ID
    const conversation = conversations?.find(c => c.taskId === selectedTaskId);
    if (!conversation?.otherUser?.id) {
      toast({
        title: "Ошибка",
        description: "Не удалось определить получателя сообщения",
        variant: "destructive",
      });
      return;
    }

    sendMessageMutation.mutate({
      taskId: selectedTaskId,
      content: messageText.trim(),
    });
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages && messages.length > 0) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        const messagesContainer = document.querySelector('.messages-container');
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }, 100);
    }
  }, [messages]);

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
      
      {/* Conversations Sidebar */}
      <aside className="w-80 bg-white shadow-sm border-r flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold mb-4">Сообщения</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Поиск сообщений..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-100 border-0 focus:bg-white"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversationsLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center space-x-3 p-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : conversations && conversations.length > 0 ? (
            <div>
              {conversations.map((conversation: any) => (
                <div
                  key={conversation.taskId}
                  className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedTaskId === conversation.taskId ? "bg-blue-50 border-r-4 border-r-primary" : ""
                  }`}
                  onClick={() => setSelectedTaskId(conversation.taskId)}
                >
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {conversation.otherUser?.firstName?.[0]}{conversation.otherUser?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900 truncate">
                          {conversation.otherUser?.firstName && conversation.otherUser?.lastName
                            ? `${conversation.otherUser.firstName} ${conversation.otherUser.lastName}`
                            : "Пользователь"
                          }
                        </h4>
                        <span className="text-xs text-gray-500">
                          {conversation.lastMessageTime 
                            ? new Date(conversation.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ""
                          }
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 break-words">
                        Проект: {conversation.taskTitle || "Неизвестный проект"}
                      </p>
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {conversation.lastMessage || "Нет сообщений"}
                      </p>
                    </div>
                    {conversation.unreadCount > 0 && (
                      <Badge className="bg-primary text-white text-xs">
                        {conversation.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Нет сообщений</h3>
              <p className="text-gray-600">Начните работу над проектом, чтобы общаться с клиентами</p>
            </div>
          )}
        </div>
      </aside>

      {/* Chat Area */}
      <main className="flex-1 flex flex-col">
        {selectedTaskId ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b p-6 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12">
                  {(() => {
                    const conversation = conversations?.find(c => c.taskId === selectedTaskId);
                    return (
                      <AvatarFallback>
                        {conversation?.otherUser?.firstName?.[0]}{conversation?.otherUser?.lastName?.[0]}
                      </AvatarFallback>
                    );
                  })()}
                </Avatar>
                <div>
                  {(() => {
                    const conversation = conversations?.find(c => c.taskId === selectedTaskId);
                    return (
                      <>
                        <h3 className="font-semibold text-gray-900">
                          {conversation?.otherUser?.firstName} {conversation?.otherUser?.lastName}
                        </h3>
                        <p className="text-sm text-gray-600 break-words">
                          {conversation?.taskTitle || "Неизвестный проект"}
                        </p>
                        {conversation?.task?.budget && (
                          <p className="text-sm text-gray-500">
                            Бюджет: ₽{conversation.task.budget.toLocaleString()}
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
              
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 messages-container">
              {messagesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="bg-gray-200 rounded-2xl p-4 max-w-lg">
                            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                          </div>
                        </div>
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
                          <AvatarFallback className="text-xs">
                            {message.sender?.firstName?.[0]}{message.sender?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="max-w-lg">
                        <div className={`${
                          message.senderId === user?.id 
                            ? "bg-primary text-white" 
                            : "bg-gray-100 text-gray-900"
                        } rounded-2xl px-4 py-2`}>
                          <p>{message.content}</p>
                        </div>
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
            <div className="bg-white border-t p-6">
              {(() => {
                const conversation = conversations?.find(c => c.taskId === selectedTaskId);
                const isTaskCompleted = conversation?.task?.status === 'completed';
                
                if (isTaskCompleted) {
                  return (
                    <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                      <Lock className="h-5 w-5 mx-auto mb-2" />
                      <p className="text-sm">Проект завершен. Отправка сообщений недоступна.</p>
                    </div>
                  );
                }
                
                return (
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
                );
              })()}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-400 mb-4">
                <svg className="h-24 w-24 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">Выберите диалог</h3>
              <p className="text-gray-600">Выберите разговор из списка слева, чтобы начать общение</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
