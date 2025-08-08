import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Star, Gavel, Handshake } from "lucide-react";

export default function Landing() {
  const handleRoleSelection = (role: string) => {
    window.location.href = `/api/login?role=${role}`;
  };

  return (
    <div className="h-screen overflow-y-auto bg-background">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="bg-primary text-white rounded-lg p-2 mr-3">
                <Handshake className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Gigly</h1>
            </div>
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
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl font-bold mb-6">
            Найдите идеального исполнителя для ваших задач
          </h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Безопасная платформа для заказчиков и фрилансеров с эскроу-системой, рейтингами и защитой сделок
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-primary hover:bg-gray-50"
              onClick={() => handleRoleSelection('client')}
            >
              <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              Я заказчик
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-primary hover:bg-gray-50 border-2 border-white"
              onClick={() => handleRoleSelection('freelancer')}
            >
              <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
              </svg>
              Я исполнитель
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center mb-12">Преимущества платформы</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <div className="bg-green-100 text-green-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8" />
                </div>
                <h4 className="text-xl font-semibold mb-2">Безопасные сделки</h4>
                <p className="text-gray-600">Эскроу-система защищает средства до завершения работы</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <div className="bg-yellow-100 text-yellow-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Star className="h-8 w-8" />
                </div>
                <h4 className="text-xl font-semibold mb-2">Система рейтингов</h4>
                <p className="text-gray-600">Прозрачные отзывы и оценки для выбора лучших исполнителей</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <div className="bg-blue-100 text-blue-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Gavel className="h-8 w-8" />
                </div>
                <h4 className="text-xl font-semibold mb-2">Разрешение споров</h4>
                <p className="text-gray-600">Система модерации для справедливого решения конфликтов</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
