import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Scale, 
  User,
  Calendar,
  FileText,
  Gavel,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

export default function AdminDisputes() {
  const { toast } = useToast();
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [resolution, setResolution] = useState("");
  const [winner, setWinner] = useState("");

  const { data: disputes, isLoading } = useQuery({
    queryKey: ["/api/admin/disputes"],
    retry: false,
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ disputeId, resolution, winner }: { 
      disputeId: string; 
      resolution: string; 
      winner: string; 
    }) => {
      await apiRequest(`/api/admin/disputes/${disputeId}/resolve`, {
        method: "PATCH",
        body: JSON.stringify({ resolution, winner })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/disputes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setSelectedDispute(null);
      setResolution("");
      setWinner("");
      toast({
        title: "Успешно",
        description: "Спор успешно решен",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось решить спор",
        variant: "destructive",
      });
    },
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "open":
        return "Открыт";
      case "resolved":
        return "Решен";
      default:
        return status;
    }
  };

  const handleResolve = () => {
    if (!selectedDispute || !resolution.trim() || !winner) {
      toast({
        title: "Ошибка",
        description: "Заполните все поля",
        variant: "destructive",
      });
      return;
    }

    resolveMutation.mutate({
      disputeId: selectedDispute.id,
      resolution: resolution.trim(),
      winner,
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Scale className="h-8 w-8 mr-3" />
          Управление спорами
        </h1>
        <p className="text-gray-600 mt-2">Рассмотрение и решение споров между пользователями</p>
      </div>

      {/* Disputes List */}
      <Card>
        <CardHeader>
          <CardTitle>Споры</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="space-y-2">
                        <div className="h-5 bg-gray-200 rounded w-64"></div>
                        <div className="h-4 bg-gray-200 rounded w-48"></div>
                      </div>
                      <div className="h-6 bg-gray-200 rounded w-20"></div>
                    </div>
                    <div className="h-16 bg-gray-200 rounded w-full mb-3"></div>
                    <div className="h-8 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : disputes && disputes.length > 0 ? (
            <div className="space-y-4">
              {disputes.map((dispute: any) => (
                <div key={dispute.id} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">
                        Спор по проекту: {dispute.task?.title}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                        <div className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          Инициатор: {dispute.initiator?.firstName} {dispute.initiator?.lastName}
                        </div>
                        <div className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          Ответчик: {dispute.defendant?.firstName} {dispute.defendant?.lastName}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(dispute.createdAt).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                    </div>
                    <Badge variant={dispute.status === "open" ? "destructive" : "default"}>
                      {dispute.status === "open" ? (
                        <>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Требует рассмотрения
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Решен
                        </>
                      )}
                    </Badge>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md mb-3">
                    <div className="flex items-start">
                      <FileText className="h-4 w-4 text-gray-500 mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Причина спора:</p>
                        <p className="text-sm text-gray-600">{dispute.reason}</p>
                      </div>
                    </div>
                  </div>

                  {dispute.status === "resolved" && dispute.resolution && (
                    <div className="bg-green-50 p-3 rounded-md mb-3">
                      <div className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-green-700 mb-1">Решение:</p>
                          <p className="text-sm text-green-600">{dispute.resolution}</p>
                          {dispute.resolvedAt && (
                            <p className="text-xs text-green-500 mt-1">
                              Решен: {new Date(dispute.resolvedAt).toLocaleDateString('ru-RU')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      Бюджет проекта: ₽{Number(dispute.task?.budget || 0).toLocaleString()}
                    </div>
                    {dispute.status === "open" && (
                      <Button 
                        onClick={() => setSelectedDispute(dispute)}
                        size="sm"
                        className="flex items-center"
                      >
                        <Gavel className="h-3 w-3 mr-1" />
                        Решить спор
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Scale className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Споры отсутствуют</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolve Dispute Dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Решение спора</DialogTitle>
          </DialogHeader>
          {selectedDispute && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Детали спора:</h4>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Проект:</strong> {selectedDispute.task?.title}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Инициатор:</strong> {selectedDispute.initiator?.firstName} {selectedDispute.initiator?.lastName}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Ответчик:</strong> {selectedDispute.defendant?.firstName} {selectedDispute.defendant?.lastName}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Причина:</strong> {selectedDispute.reason}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Кто выигрывает спор? *
                </label>
                <Select value={winner} onValueChange={setWinner}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите победителя" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={selectedDispute.initiatorId}>
                      {selectedDispute.initiator?.firstName} {selectedDispute.initiator?.lastName} (Инициатор)
                    </SelectItem>
                    <SelectItem value={selectedDispute.defendantId}>
                      {selectedDispute.defendant?.firstName} {selectedDispute.defendant?.lastName} (Ответчик)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Решение администрации *
                </label>
                <Textarea
                  placeholder="Опишите решение по спору и обоснование..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setSelectedDispute(null)}
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleResolve}
                  disabled={resolveMutation.isPending || !resolution.trim() || !winner}
                >
                  {resolveMutation.isPending ? "Решение..." : "Решить спор"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}