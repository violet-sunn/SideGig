import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { 
  Handshake, 
  Bell, 
  User, 
  Settings, 
  LogOut,
  MessageSquare
} from "lucide-react";

export default function Navbar() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return (first + last).toUpperCase() || "U";
  };

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/">
            <a className="flex items-center">
              <div className="bg-primary text-white rounded-lg p-2 mr-3">
                <Handshake className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Gigly</h1>
            </a>
          </Link>

          {/* Navigation Links - only show when authenticated */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center space-x-8">
              {user?.role === "client" ? (
                <>
                  <Link href="/">
                    <a className={`text-gray-700 hover:text-primary transition-colors ${
                      location === "/" ? "text-primary font-medium" : ""
                    }`}>
                      Дашборд
                    </a>
                  </Link>
                  <Link href="/tasks">
                    <a className={`text-gray-700 hover:text-primary transition-colors ${
                      location === "/tasks" ? "text-primary font-medium" : ""
                    }`}>
                      Мои задачи
                    </a>
                  </Link>
                  <Link href="/create-task">
                    <a className={`text-gray-700 hover:text-primary transition-colors ${
                      location === "/create-task" ? "text-primary font-medium" : ""
                    }`}>
                      Создать задачу
                    </a>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/">
                    <a className={`text-gray-700 hover:text-primary transition-colors ${
                      location === "/" ? "text-primary font-medium" : ""
                    }`}>
                      Дашборд
                    </a>
                  </Link>
                  <Link href="/browse-tasks">
                    <a className={`text-gray-700 hover:text-primary transition-colors ${
                      location === "/browse-tasks" ? "text-primary font-medium" : ""
                    }`}>
                      Найти задачи
                    </a>
                  </Link>
                  <Link href="/my-bids">
                    <a className={`text-gray-700 hover:text-primary transition-colors ${
                      location === "/my-bids" ? "text-primary font-medium" : ""
                    }`}>
                      Мои заявки
                    </a>
                  </Link>
                </>
              )}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {/* Messages */}
                <Link href="/messages">
                  <a className="relative p-2 text-gray-500 hover:text-gray-700 transition-colors">
                    <MessageSquare className="h-6 w-6" />
                    {/* Placeholder for unread count */}
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
                      3
                    </Badge>
                  </a>
                </Link>

                {/* Notifications */}
                <button className="relative p-2 text-gray-500 hover:text-gray-700 transition-colors">
                  <Bell className="h-6 w-6" />
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
                    2
                  </Badge>
                </button>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user?.profileImageUrl || ""} />
                        <AvatarFallback>
                          {getInitials(user?.firstName, user?.lastName)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">
                          {user?.firstName && user?.lastName 
                            ? `${user.firstName} ${user.lastName}`
                            : user?.email?.split("@")[0] || "Пользователь"
                          }
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user?.email}
                        </p>
                        <Badge variant="secondary" className="w-fit text-xs">
                          {user?.role === "client" ? "Заказчик" : "Фрилансер"}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile">
                        <a className="flex items-center w-full">
                          <User className="mr-2 h-4 w-4" />
                          <span>Профиль</span>
                        </a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings">
                        <a className="flex items-center w-full">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Настройки</span>
                        </a>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-red-600 focus:text-red-600"
                      onClick={() => window.location.href = "/api/logout"}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Выйти</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  onClick={() => window.location.href = '/api/login'}
                >
                  Войти
                </Button>
                <Button onClick={() => window.location.href = '/api/login'}>
                  Регистрация
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
