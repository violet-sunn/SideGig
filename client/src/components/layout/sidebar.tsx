import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Handshake,
  BarChart3,
  ListTodo,
  Plus,
  Users,
  MessageSquare,
  CreditCard,
  Scale,
  Search,
  HandHelping,
  Briefcase,
  Wallet,
  UserCog,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/notifications/notification-bell";

interface SidebarProps {
  userRole: "client" | "freelancer" | "moderator" | "admin";
}

export default function Sidebar({ userRole }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  const clientNavItems = [
    { href: "/", icon: BarChart3, label: "Дашборд" },
    { href: "/tasks", icon: ListTodo, label: "Мои задачи" },
    { href: "/create-task", icon: Plus, label: "Создать задачу" },
    { href: "/messages", icon: MessageSquare, label: "Сообщения" },
    { href: "/payments", icon: CreditCard, label: "Платежи" },
    { href: "/disputes", icon: Scale, label: "Споры" },
    { href: "/profile", icon: UserCog, label: "Профиль" },
  ];

  const freelancerNavItems = [
    { href: "/", icon: BarChart3, label: "Дашборд" },
    { href: "/browse-tasks", icon: Search, label: "Найти задачи" },
    { href: "/active-projects", icon: Briefcase, label: "Мои проекты" },
    { href: "/messages", icon: MessageSquare, label: "Сообщения" },
    { href: "/disputes", icon: Scale, label: "Споры" },
    { href: "/earnings", icon: Wallet, label: "Доходы" },
    { href: "/profile", icon: UserCog, label: "Профиль" },
  ];

  const navItems = userRole === "client" ? clientNavItems : freelancerNavItems;

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return (first + last).toUpperCase() || "U";
  };

  return (
    <aside className="w-64 bg-white shadow-sm border-r flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b">
        <div className="flex items-center">
          <div className="bg-primary text-white rounded-lg p-2 mr-3">
            <Handshake className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-bold">Gigly</h2>
        </div>
      </div>

      {/* User Profile */}
      <div className="px-3 py-6">
        <div className={cn(
          "flex items-center justify-between p-3 rounded-lg",
          userRole === "client" ? "bg-blue-50" : "bg-green-50"
        )}>
          <div className="flex items-center">
            <Avatar className="h-10 w-10 mr-3">
              <AvatarImage src={user?.profileImageUrl || ""} />
              <AvatarFallback>
                {getInitials(user?.firstName, user?.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-gray-900">
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user?.email?.split("@")[0] || "Пользователь"
                }
              </p>
              <p className="text-sm text-gray-500">
                {userRole === "client" ? "Заказчик" : "Фрилансер"}
              </p>
            </div>
          </div>
          
          {/* Notification Bell */}
          <div className="ml-2">
            <NotificationBell />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href || 
              (item.href !== "/" && location.startsWith(item.href));
            
            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <span className={cn(
                    "flex items-center p-3 rounded-lg transition-colors cursor-pointer",
                    isActive 
                      ? "bg-primary text-white" 
                      : "hover:bg-gray-50 text-gray-700"
                  )}>
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-3 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-700 hover:text-red-600 hover:bg-red-50"
          onClick={() => window.location.href = "/api/logout"}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Выйти
        </Button>
      </div>
    </aside>
  );
}
