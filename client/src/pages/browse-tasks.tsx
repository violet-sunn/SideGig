import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import TaskCard from "@/components/tasks/task-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, SortAsc, SortDesc } from "lucide-react";

export default function BrowseTasks() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [budgetFilter, setBudgetFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

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

  const { data: tasks, isLoading: tasksLoading, error } = useQuery<any[]>({
    queryKey: ["/api/tasks/available"],
    enabled: isAuthenticated,
    retry: false,
  });

  if (error && isUnauthorizedError(error)) {
    // This will be handled by the useEffect above
    return null;
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const categories = Array.from(new Set(tasks?.map((task: any) => task.category) || []));
  
  const filteredTasks = tasks?.filter((task: any) => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || task.category === categoryFilter;
    const matchesBudget = !budgetFilter || 
                         (budgetFilter === "low" && task.budget < 25000) ||
                         (budgetFilter === "medium" && task.budget >= 25000 && task.budget <= 100000) ||
                         (budgetFilter === "high" && task.budget > 100000);
    
    return matchesSearch && matchesCategory && matchesBudget;
  }) || [];

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];
    
    if (sortBy === "budget") {
      aValue = parseFloat(aValue);
      bValue = parseFloat(bValue);
    } else if (sortBy === "created_at") {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }
    
    if (sortOrder === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const toggleSort = () => {
    setSortOrder(prev => prev === "asc" ? "desc" : "asc");
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole="freelancer" />
      
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Найти задачи</h1>
            <p className="text-gray-600">Найдите подходящие проекты для ваших навыков</p>
          </div>

          {/* Filters */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Фильтры и поиск
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Поиск задач..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Все категории" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Все категории</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={budgetFilter} onValueChange={setBudgetFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Бюджет" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Любой бюджет</SelectItem>
                    <SelectItem value="low">До ₽25,000</SelectItem>
                    <SelectItem value="medium">₽25,000 - ₽100,000</SelectItem>
                    <SelectItem value="high">Свыше ₽100,000</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center space-x-2">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">По дате</SelectItem>
                      <SelectItem value="budget">По бюджету</SelectItem>
                      <SelectItem value="title">По названию</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={toggleSort}>
                    {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {(searchTerm || categoryFilter || budgetFilter) && (
                <div className="flex items-center space-x-2 mt-4">
                  <span className="text-sm text-gray-500">Активные фильтры:</span>
                  {searchTerm && (
                    <Badge variant="secondary">
                      Поиск: {searchTerm}
                      <button onClick={() => setSearchTerm("")} className="ml-1">×</button>
                    </Badge>
                  )}
                  {categoryFilter && (
                    <Badge variant="secondary">
                      {categoryFilter}
                      <button onClick={() => setCategoryFilter("")} className="ml-1">×</button>
                    </Badge>
                  )}
                  {budgetFilter && (
                    <Badge variant="secondary">
                      Бюджет: {budgetFilter === "low" ? "До ₽25,000" : 
                               budgetFilter === "medium" ? "₽25,000 - ₽100,000" : 
                               "Свыше ₽100,000"}
                      <button onClick={() => setBudgetFilter("")} className="ml-1">×</button>
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Task Results */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Найдено задач: {sortedTasks.length}
              </h2>
            </div>

            {tasksLoading ? (
              <div className="grid gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : sortedTasks.length > 0 ? (
              <div className="grid gap-6">
                {sortedTasks.map((task: any) => (
                  <TaskCard key={task.id} task={task} showBidButton />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Задачи не найдены
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Попробуйте изменить параметры поиска или фильтры
                  </p>
                  <Button 
                    onClick={() => {
                      setSearchTerm("");
                      setCategoryFilter("");
                      setBudgetFilter("");
                    }}
                  >
                    Сбросить фильтры
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
