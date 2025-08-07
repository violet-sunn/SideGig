import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import AdminSidebar from "@/components/layout/admin-sidebar";
import { useLocation } from "wouter";

// Import admin pages using relative paths
import AdminDashboard from "./admin-dashboard.tsx";
import AdminUsers from "./admin-users.tsx";
import AdminTasks from "./admin-tasks.tsx";  
import AdminDisputes from "./admin-disputes.tsx";
import AdminAnalytics from "./admin-analytics.tsx";

export default function AdminLayout() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location] = useLocation();

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== "admin")) {
      toast({
        title: "Доступ запрещен",
        description: "У вас нет прав для доступа к админ панели",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  if (isLoading || !isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Simple routing - just render based on location
  const renderPage = () => {
    if (location === '/admin/users') {
      return <AdminUsers />;
    } else if (location === '/admin/tasks') {
      return <AdminTasks />;
    } else if (location === '/admin/disputes') {
      return <AdminDisputes />;
    } else if (location === '/admin/analytics') {
      return <AdminAnalytics />;
    } else {
      // Главная админки (для /, /admin, /admin/)
      return <AdminDashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar user={user} />
      
      <main className="flex-1 overflow-auto">
        {renderPage()}
      </main>
    </div>
  );
}