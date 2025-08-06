import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import RoleSwitcher from "@/components/dev/role-switcher";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import ClientDashboard from "@/pages/client-dashboard";
import FreelancerDashboard from "@/pages/freelancer-dashboard";
import CreateTask from "@/pages/create-task";
import BrowseTasks from "@/pages/browse-tasks";
import Tasks from "@/pages/tasks";
import Messages from "@/pages/messages";
import Payments from "@/pages/payments";
import Reviews from "@/pages/reviews";
import Disputes from "@/pages/disputes";
import Profile from "@/pages/profile";
import MyBids from "@/pages/my-bids";
import ActiveProjects from "@/pages/active-projects";
import Earnings from "@/pages/earnings";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route component={NotFound} />
        </>
      ) : (
        <>
          <Route path="/" component={user?.role === "client" ? ClientDashboard : FreelancerDashboard} />
          <Route path="/create-task" component={CreateTask} />
          <Route path="/browse-tasks" component={BrowseTasks} />
          <Route path="/tasks" component={Tasks} />
          <Route path="/my-bids" component={MyBids} />
          <Route path="/active-projects" component={ActiveProjects} />
          <Route path="/earnings" component={Earnings} />
          <Route path="/messages" component={Messages} />
          <Route path="/payments" component={Payments} />
          <Route path="/reviews" component={Reviews} />
          <Route path="/disputes" component={Disputes} />
          <Route path="/profile" component={Profile} />
          <Route component={NotFound} />
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <RoleSwitcher />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
