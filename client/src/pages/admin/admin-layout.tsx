import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import AdminSidebar from "@/components/layout/admin-sidebar";
import { Switch, Route, useLocation } from "wouter";
import AdminDashboard from "./admin-dashboard";
import AdminUsers from "./admin-users";
import AdminTasks from "./admin-tasks";
import AdminDisputes from "./admin-disputes";
import AdminAnalytics from "./admin-analytics";

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

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar user={user} />
      
      <main className="flex-1 overflow-auto">
        <Switch>
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/analytics" component={AdminAnalytics} />
          <Route path="/admin/users" component={AdminUsers} />
          <Route path="/admin/tasks" component={AdminTasks} />
          <Route path="/admin/disputes" component={AdminDisputes} />
          <Route>
            <AdminDashboard />
          </Route>
        </Switch>
      </main>
    </div>
  );
}