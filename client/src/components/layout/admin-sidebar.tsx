import { Link, useLocation } from "wouter";
import { 
  Users, 
  ShoppingBag,
  Shield,
  BarChart3,
  Scale,
  Settings,
  LogOut,
  Home
} from "lucide-react";

interface AdminSidebarProps {
  user: any;
}

export default function AdminSidebar({ user }: AdminSidebarProps) {
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/admin") {
      // Главная админки активна для корня / и /admin
      return location === "/" || location === "/admin" || location === "/admin/";
    }
    return location === path || location.startsWith(path + "/");
  };

  const menuItems = [
    {
      group: "Управление",
      items: [
        { icon: Home, label: "Главная", href: "/" },
        { icon: BarChart3, label: "Аналитика", href: "/admin/analytics" },
        { icon: Users, label: "Пользователи", href: "/admin/users" },
        ...(user?.role === "admin" ? [{ icon: Shield, label: "Роли", href: "/admin/roles" }] : []),
        { icon: ShoppingBag, label: "Проекты", href: "/admin/tasks" },
        { icon: Scale, label: "Споры", href: "/admin/disputes" },
      ]
    }
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <Shield className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Админ панель</h2>
            <p className="text-sm text-gray-600">FreelanceHub</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-red-600">Администратор</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-6">
        {menuItems.map((group) => (
          <div key={group.group}>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {group.group}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link 
                      href={item.href}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active 
                          ? "bg-red-50 text-red-700 border-r-2 border-red-500" 
                          : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${active ? "text-red-600" : "text-gray-500"}`} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="absolute bottom-4 left-4 right-4">
        <a 
          href="/api/logout"
          className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors w-full"
        >
          <LogOut className="h-5 w-5 text-gray-500" />
          <span>Выйти</span>
        </a>
      </div>
    </div>
  );
}