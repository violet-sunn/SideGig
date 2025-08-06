import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

export default function RoleSwitcher() {
  const [currentImpersonation, setCurrentImpersonation] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const queryClient = useQueryClient();

  // Check if we're in development mode
  const isDev = import.meta.env.DEV;
  if (!isDev) return null;

  const { data: testUsers, isLoading } = useQuery({
    queryKey: ["/api/dev/test-users"],
    enabled: isDev,
  });

  useEffect(() => {
    // Check URL for impersonation parameter
    const urlParams = new URLSearchParams(window.location.search);
    const impersonate = urlParams.get('impersonate');
    setCurrentImpersonation(impersonate);
    
    // Save to localStorage for persistence
    if (impersonate) {
      localStorage.setItem('current-impersonation', impersonate);
    }
  }, []);

  useEffect(() => {
    // Auto-restore impersonation if not in URL but saved in localStorage
    const savedImpersonation = localStorage.getItem('current-impersonation');
    const urlParams = new URLSearchParams(window.location.search);
    const urlImpersonate = urlParams.get('impersonate');
    
    if (savedImpersonation && !urlImpersonate && window.location.pathname !== '/') {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('impersonate', savedImpersonation);
      window.history.replaceState({}, '', newUrl.toString());
      setCurrentImpersonation(savedImpersonation);
    }
  }, []);

  const switchToUser = (userId: string | null) => {
    // Clear all queries before switching
    queryClient.clear();
    
    // Update localStorage
    if (userId) {
      localStorage.setItem('current-impersonation', userId);
    } else {
      localStorage.removeItem('current-impersonation');
    }
    
    const url = new URL(window.location.href);
    
    // Simply update the impersonate parameter without affecting others
    if (userId) {
      url.searchParams.set('impersonate', userId);
    } else {
      url.searchParams.delete('impersonate');
    }
    
    // Use full page reload to ensure clean state
    window.location.href = url.toString();
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return (first + last).toUpperCase() || "U";
  };

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 bg-orange-50 border-orange-200">
      <CardHeader 
        className="pb-3 cursor-pointer hover:bg-orange-100 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Режим разработки
          </div>
          {isCollapsed ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </CardTitle>
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent className="space-y-3">
          <div className="text-xs text-gray-600 mb-3">
            Переключение между тестовыми ролями:
          </div>
          
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Загрузка...
            </div>
          ) : (
            <div className="space-y-2">
              {/* Reset to real user */}
              <Button
                variant={!currentImpersonation ? "default" : "outline"}
                size="sm"
                onClick={() => switchToUser(null)}
                className="w-full justify-start"
              >
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarFallback className="text-xs">Я</AvatarFallback>
                </Avatar>
                Ваш аккаунт
              </Button>

              {/* Test users */}
              {Array.isArray(testUsers) && testUsers.map((user: any) => (
                <Button
                  key={user.id}
                  variant={currentImpersonation === user.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => switchToUser(user.id)}
                  className="w-full justify-start"
                >
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage src={user.profileImageUrl || ""} />
                    <AvatarFallback className="text-xs">
                      {getInitials(user.firstName, user.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start">
                    <span className="text-xs">
                      {user.firstName} {user.lastName}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {user.role === "client" ? "Заказчик" : "Исполнитель"}
                    </Badge>
                  </div>
                </Button>
              ))}
            </div>
          )}
          
          {currentImpersonation && (
            <div className="text-xs text-orange-600 bg-orange-100 p-2 rounded">
              Активна роль тестового пользователя
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}