# FreelanceHub Platform

Комплексная платформа для фрилансинга, соединяющая клиентов с исполнителями через безопасную систему эскроу-платежей, обмена сообщениями, управления заявками, отзывов и разрешения споров.

## 📋 Оглавление

- [Архитектура системы](#архитектура-системы)
- [Стек технологий](#стек-технологий)
- [Структура проекта](#структура-проекта)
- [База данных](#база-данных)
- [Аутентификация и авторизация](#аутентификация-и-авторизация)
- [API Endpoints](#api-endpoints)
- [Frontend архитектура](#frontend-архитектура)
- [Backend архитектура](#backend-архитектура)
- [Установка и запуск](#установка-и-запуск)
- [Разработка](#разработка)
- [Развертывание](#развертывание)
- [Особенности и бизнес-логика](#особенности-и-бизнес-логика)

## 🏗 Архитектура системы

### Общая архитектура

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Client  │◄──►│  Express Server  │◄──►│   PostgreSQL    │
│  (TypeScript)   │    │   (TypeScript)   │    │   Database      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌────▼────┐             ┌────▼────┐             ┌────▼────┐
    │  Vite   │             │ Drizzle │             │  Neon   │
    │  Build  │             │   ORM   │             │Serverless│
    └─────────┘             └─────────┘             └─────────┘
```

### Трёхуровневая система ролей

1. **Администраторы** - полный доступ ко всем функциям платформы
2. **Модераторы** - ограниченный доступ для разрешения споров
3. **Пользователи** - клиенты и исполнители

## 🛠 Стек технологий

### Frontend
- **React 18** с TypeScript
- **Vite** - сборщик и dev сервер
- **Wouter** - клиентская маршрутизация
- **TanStack Query** - управление серверным состоянием
- **React Hook Form** + **Zod** - работа с формами и валидация
- **Tailwind CSS** - стилизация
- **Radix UI** + **shadcn/ui** - компоненты интерфейса
- **Lucide React** - иконки

### Backend
- **Node.js** с **Express.js**
- **TypeScript** с ES модулями
- **Passport.js** - аутентификация
- **Express Session** - управление сессиями
- **Drizzle ORM** - работа с базой данных

### База данных
- **PostgreSQL** (Neon Serverless)
- **Drizzle Kit** - миграции и схема

### Внешние сервисы
- **Replit Auth** - OpenID Connect провайдер
- **Neon Database** - серверная PostgreSQL

## 📁 Структура проекта

```
FreelanceHub/
├── client/                    # Frontend приложение
│   ├── src/
│   │   ├── components/        # React компоненты
│   │   │   ├── ui/           # Базовые UI компоненты (shadcn/ui)
│   │   │   ├── layout/       # Компоненты макета (сайдбары, навигация)
│   │   │   ├── tasks/        # Компоненты для работы с задачами
│   │   │   ├── messaging/    # Компоненты чата и сообщений
│   │   │   ├── admin/        # Административные компоненты
│   │   │   └── dev/          # Инструменты разработки
│   │   ├── pages/            # Страницы приложения
│   │   │   ├── admin/        # Административные страницы
│   │   │   └── *.tsx         # Основные страницы
│   │   ├── hooks/            # Custom React хуки
│   │   ├── lib/              # Утилиты и конфигурация
│   │   └── index.css         # Глобальные стили
│   └── index.html            # Входная точка
├── server/                   # Backend приложение
│   ├── index.ts             # Точка входа сервера
│   ├── routes.ts            # API маршруты
│   ├── storage.ts           # Слой работы с данными
│   ├── db.ts                # Подключение к базе данных
│   ├── replitAuth.ts        # Конфигурация аутентификации
│   └── vite.ts              # Интеграция с Vite
├── shared/                  # Общий код
│   └── schema.ts            # Схемы базы данных и типы
├── attached_assets/         # Загруженные файлы и ресурсы
├── package.json            # Зависимости и скрипты
├── drizzle.config.ts       # Конфигурация Drizzle ORM
├── vite.config.ts          # Конфигурация Vite
├── tailwind.config.ts      # Конфигурация Tailwind CSS
├── tsconfig.json           # Конфигурация TypeScript
└── replit.md              # Документация проекта и предпочтения
```

## 🗃 База данных

### Схема базы данных

#### Основные таблицы

```sql
-- Пользователи
users (
  id VARCHAR PRIMARY KEY,           -- ID из Replit Auth
  email VARCHAR UNIQUE,             -- Email пользователя
  firstName VARCHAR,                -- Имя
  lastName VARCHAR,                 -- Фамилия
  profileImageUrl VARCHAR,          -- URL аватара
  role VARCHAR DEFAULT 'client',    -- Роль: client, freelancer, moderator, admin
  isBlocked BOOLEAN DEFAULT false,  -- Заблокирован ли пользователь
  createdAt TIMESTAMP,              -- Дата создания
  updatedAt TIMESTAMP               -- Дата обновления
);

-- Задачи
tasks (
  id VARCHAR PRIMARY KEY,           -- Уникальный ID задачи
  title VARCHAR NOT NULL,           -- Название задачи
  description TEXT NOT NULL,        -- Описание
  category VARCHAR NOT NULL,        -- Категория
  budget DECIMAL NOT NULL,          -- Бюджет
  deadline TIMESTAMP,               -- Дедлайн (может быть NULL)
  priority VARCHAR DEFAULT 'medium', -- Приоритет: low, medium, high
  skills TEXT[] DEFAULT {},         -- Массив требуемых навыков
  status VARCHAR DEFAULT 'open',    -- Статус: open, in_progress, completed, cancelled
  clientId VARCHAR NOT NULL,        -- ID клиента
  freelancerId VARCHAR,             -- ID исполнителя (NULL до назначения)
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (clientId) REFERENCES users(id),
  FOREIGN KEY (freelancerId) REFERENCES users(id)
);

-- Заявки на задачи
bids (
  id VARCHAR PRIMARY KEY,           -- Уникальный ID заявки
  taskId VARCHAR NOT NULL,          -- ID задачи
  freelancerId VARCHAR NOT NULL,    -- ID исполнителя
  amount DECIMAL NOT NULL,          -- Предложенная сумма
  deadline TIMESTAMP NOT NULL,      -- Предложенный срок
  proposal TEXT NOT NULL,           -- Предложение исполнителя
  status VARCHAR DEFAULT 'pending', -- Статус: pending, accepted, rejected
  counterOfferAmount DECIMAL,       -- Контрпредложение по сумме
  counterOfferDeadline TIMESTAMP,   -- Контрпредложение по сроку
  counterOfferMessage TEXT,         -- Сообщение к контрпредложению
  createdAt TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (taskId) REFERENCES tasks(id),
  FOREIGN KEY (freelancerId) REFERENCES users(id)
);

-- Сообщения
messages (
  id VARCHAR PRIMARY KEY,           -- Уникальный ID сообщения
  taskId VARCHAR NOT NULL,          -- ID задачи
  senderId VARCHAR NOT NULL,        -- ID отправителя
  content TEXT NOT NULL,            -- Содержимое сообщения
  createdAt TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (taskId) REFERENCES tasks(id),
  FOREIGN KEY (senderId) REFERENCES users(id)
);

-- Платежи (эскроу)
payments (
  id VARCHAR PRIMARY KEY,           -- Уникальный ID платежа
  taskId VARCHAR NOT NULL,          -- ID задачи
  clientId VARCHAR NOT NULL,        -- ID клиента
  freelancerId VARCHAR NOT NULL,    -- ID исполнителя
  amount DECIMAL NOT NULL,          -- Сумма платежа
  status VARCHAR DEFAULT 'pending', -- Статус: pending, held, released, refunded
  createdAt TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (taskId) REFERENCES tasks(id),
  FOREIGN KEY (clientId) REFERENCES users(id),
  FOREIGN KEY (freelancerId) REFERENCES users(id)
);

-- Отзывы
reviews (
  id VARCHAR PRIMARY KEY,           -- Уникальный ID отзыва
  taskId VARCHAR NOT NULL,          -- ID задачи
  reviewerId VARCHAR NOT NULL,      -- ID того, кто оставляет отзыв
  revieweeId VARCHAR NOT NULL,      -- ID того, о ком отзыв
  rating INTEGER NOT NULL,          -- Рейтинг 1-5
  comment TEXT,                     -- Комментарий
  createdAt TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (taskId) REFERENCES tasks(id),
  FOREIGN KEY (reviewerId) REFERENCES users(id),
  FOREIGN KEY (revieweeId) REFERENCES users(id)
);

-- Споры
disputes (
  id VARCHAR PRIMARY KEY,           -- Уникальный ID спора
  taskId VARCHAR NOT NULL,          -- ID задачи
  initiatorId VARCHAR NOT NULL,     -- ID инициатора спора
  reason TEXT NOT NULL,             -- Причина спора
  status VARCHAR DEFAULT 'open',    -- Статус: open, investigating, resolved
  resolution TEXT,                  -- Решение по спору
  resolvedBy VARCHAR,               -- ID модератора/админа
  createdAt TIMESTAMP DEFAULT NOW(),
  resolvedAt TIMESTAMP,             -- Дата решения
  FOREIGN KEY (taskId) REFERENCES tasks(id),
  FOREIGN KEY (initiatorId) REFERENCES users(id),
  FOREIGN KEY (resolvedBy) REFERENCES users(id)
);

-- Сессии (для Replit Auth)
sessions (
  sid VARCHAR PRIMARY KEY,          -- ID сессии
  sess JSONB NOT NULL,             -- Данные сессии
  expire TIMESTAMP NOT NULL        -- Время истечения
);
```

### Связи в базе данных

- **users ↔ tasks**: Один ко многим (клиент может создать много задач)
- **users ↔ bids**: Один ко многим (исполнитель может подать много заявок)
- **tasks ↔ bids**: Один ко многим (на задачу может быть много заявок)
- **tasks ↔ messages**: Один ко многим (в рамках задачи много сообщений)
- **tasks ↔ payments**: Один к одному (одна задача - один платёж)
- **tasks ↔ reviews**: Один ко многим (по задаче могут быть отзывы от обеих сторон)
- **tasks ↔ disputes**: Один к одному/нулю (по задаче может быть спор)

## 🔐 Аутентификация и авторизация

### Система аутентификации

Проект использует **Replit Auth** как OpenID Connect провайдер:

```typescript
// Конфигурация аутентификации
export async function setupAuth(app: Express) {
  // Настройка сессий с PostgreSQL хранилищем
  app.use(session({
    secret: process.env.SESSION_SECRET!,
    store: new pgStore({
      conString: process.env.DATABASE_URL,
      tableName: "sessions",
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 неделя
    },
  }));

  // Настройка Passport.js с OpenID Connect
  passport.use(new Strategy({
    config: oidcConfig,
    scope: "openid email profile offline_access",
    callbackURL: `/api/callback`,
  }, verify));
}
```

### Система ролей и разрешений

#### Роли пользователей:
1. **client** - клиент (создаёт задачи)
2. **freelancer** - исполнитель (выполняет задачи)
3. **moderator** - модератор (разрешает споры)
4. **admin** - администратор (полный доступ)

#### Middleware для проверки ролей:

```typescript
// Базовая аутентификация
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  // Проверка и обновление токенов
};

// Доступ для модераторов и админов
export const isModerator: RequestHandler = async (req, res, next) => {
  await isAuthenticated(req, res, async () => {
    const user = await storage.getUser(userId);
    if (!user || !["moderator", "admin"].includes(user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  });
};

// Доступ только для админов
export const isAdmin: RequestHandler = async (req, res, next) => {
  // Аналогично, но только для роли "admin"
};
```

### IP-ограничения

Для повышенной безопасности админ панели:

```typescript
const ALLOWED_ADMIN_IPS = [
  '127.0.0.1',      // Локальная разработка
  '::1',            // IPv6 localhost
  '0.0.0.0',        // Replit environment
];

// В production - строгие IP ограничения
// В development - доступ со всех IP
```

## 🔗 API Endpoints

### Аутентификация
```
GET  /api/login              # Начать вход через Replit Auth
GET  /api/callback           # Callback для OAuth
GET  /api/logout             # Выход из системы
GET  /api/auth/user          # Получить данные текущего пользователя
```

### Задачи
```
GET    /api/tasks            # Получить список задач (с фильтрами)
POST   /api/tasks            # Создать новую задачу
GET    /api/tasks/:id        # Получить задачу по ID
PATCH  /api/tasks/:id        # Обновить задачу
DELETE /api/tasks/:id        # Удалить задачу
GET    /api/tasks/my         # Получить мои задачи
```

### Заявки
```
GET  /api/bids               # Получить заявки (для исполнителей)
POST /api/bids               # Подать заявку на задачу
GET  /api/bids/:id           # Получить заявку по ID
PATCH /api/bids/:id/accept   # Принять заявку (для клиентов)
PATCH /api/bids/:id/reject   # Отклонить заявку
POST /api/bids/:id/counter-offer # Контрпредложение
```

### Сообщения
```
GET  /api/messages/:taskId   # Получить сообщения по задаче
POST /api/messages           # Отправить сообщение
```

### Платежи
```
GET  /api/payments           # Получить список платежей
POST /api/payments           # Создать платёж (эскроу)
PATCH /api/payments/:id/release # Освободить средства
PATCH /api/payments/:id/refund  # Вернуть средства
```

### Отзывы
```
GET  /api/reviews            # Получить отзывы
POST /api/reviews            # Оставить отзыв
GET  /api/reviews/stats      # Статистика отзывов пользователя
```

### Споры
```
GET  /api/disputes           # Получить споры
POST /api/disputes           # Создать спор
PATCH /api/disputes/:id/resolve # Разрешить спор (модераторы/админы)
```

### Административные API
```
GET    /api/admin/stats      # Статистика платформы
GET    /api/admin/users      # Список всех пользователей
PATCH  /api/admin/users/:id/block   # Заблокировать пользователя
PATCH  /api/admin/users/:id/unblock # Разблокировать пользователя
PATCH  /api/admin/users/:id/role    # Изменить роль пользователя
GET    /api/admin/tasks      # Все задачи (админ просмотр)
GET    /api/admin/disputes   # Все споры
```

## 🎨 Frontend архитектура

### Компонентная структура

#### UI компоненты (shadcn/ui)
Базовые переиспользуемые компоненты:
- `Button`, `Input`, `Select`, `Dialog`
- `Table`, `Card`, `Badge`, `Avatar`
- `Form`, `Textarea`, `Checkbox`, `Switch`
- `Toast`, `Tooltip`, `Popover`, `Tabs`

#### Layout компоненты
- `Sidebar` - боковая навигация с ролевым доступом
- `AdminSidebar` - навигация для админ панели
- `Header` - шапка с информацией о пользователе

#### Feature компоненты
- `TaskCard` - карточка задачи с возможностями подачи заявок
- `BidCard` - карточка заявки с контрпредложениями
- `Chat` - компонент чата для общения по задачам
- `RatingDisplay` - отображение рейтингов и отзывов

### Управление состоянием

#### TanStack Query для серверного состояния
```typescript
// Пример запроса задач с кешированием
const { data: tasks, isLoading } = useQuery({
  queryKey: ["/api/tasks", { status, category }],
  staleTime: 5 * 60 * 1000, // 5 минут
});

// Мутация для создания задачи
const createTaskMutation = useMutation({
  mutationFn: (taskData) => apiRequest("POST", "/api/tasks", taskData),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    toast({ title: "Задача создана!" });
  },
});
```

#### Локальное состояние с useState/useReducer
Для форм, UI состояния, модальных окон

### Маршrutизация с Wouter

```typescript
function Router() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          {/* Админ маршруты */}
          <Route path="/admin/*" component={AdminLayout} />
          
          {/* Основной маршрут в зависимости от роли */}
          <Route path="/" component={
            (user?.role === "admin" || user?.role === "moderator") 
              ? AdminLayout 
              : user?.role === "client" 
                ? ClientDashboard 
                : FreelancerDashboard
          } />
          
          {/* Остальные маршруты */}
          <Route path="/tasks" component={Tasks} />
          <Route path="/messages" component={Messages} />
          {/* ... */}
        </>
      )}
    </Switch>
  );
}
```

### Обработка ошибок

#### Unauthorized ошибки
```typescript
// Утилита для проверки ошибок авторизации
export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}

// Обработка в компонентах
const mutation = useMutation({
  mutationFn: apiRequest,
  onError: (error) => {
    if (isUnauthorizedError(error)) {
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
    // Другие ошибки
  },
});
```

## ⚙️ Backend архитектура

### Express.js сервер

#### Основная структура
```typescript
// server/index.ts
import express from "express";
import { registerRoutes } from "./routes";

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("trust proxy", 1);

// Регистрация маршрутов и запуск сервера
registerRoutes(app).then((httpServer) => {
  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
});
```

#### Архитектура маршрутов
```typescript
// server/routes.ts
export async function registerRoutes(app: Express): Promise<Server> {
  // Настройка аутентификации
  await setupAuth(app);

  // API маршруты с middleware
  app.get("/api/tasks", isAuthenticated, async (req, res) => {
    // Логика получения задач
  });

  app.post("/api/tasks", isAuthenticated, async (req, res) => {
    // Валидация с Zod
    const result = insertTaskSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid data" });
    }
    
    // Бизнес-логика
    const task = await storage.createTask(result.data);
    res.json(task);
  });

  return createServer(app);
}
```

### Слой работы с данными (Storage)

#### Интерфейс IStorage
```typescript
export interface IStorage {
  // Пользователи
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(userId: string, role: string): Promise<void>;
  
  // Задачи
  createTask(task: InsertTask): Promise<Task>;
  getTask(id: string): Promise<Task | undefined>;
  getAllTasks(page?: number, limit?: number, status?: string): Promise<Task[]>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task>;
  
  // Заявки
  createBid(bid: InsertBid): Promise<Bid>;
  getBidsForTask(taskId: string): Promise<Bid[]>;
  updateBidStatus(id: string, status: string): Promise<void>;
  
  // И так далее для всех сущностей...
}
```

#### Реализация с Drizzle ORM
```typescript
export class DatabaseStorage implements IStorage {
  async createTask(taskData: InsertTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values({
        ...taskData,
        id: nanoid(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return task;
  }

  async getAllTasks(page = 1, limit = 10, status?: string): Promise<Task[]> {
    let query = db
      .select()
      .from(tasks)
      .limit(limit)
      .offset((page - 1) * limit)
      .orderBy(desc(tasks.createdAt));

    if (status) {
      query = query.where(eq(tasks.status, status));
    }

    return await query;
  }
}
```

### Валидация данных

#### Zod схемы
```typescript
// shared/schema.ts
export const insertTaskSchema = createInsertSchema(tasks, {
  title: z.string().min(1, "Название обязательно"),
  description: z.string().min(10, "Описание должно быть минимум 10 символов"),
  budget: z.number().positive("Бюджет должен быть положительным"),
  deadline: z.string().refine((date) => {
    if (!date) return true;
    return new Date(date) > new Date();
  }, "Дедлайн должен быть в будущем"),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
```

### Безопасность

#### Middleware для IP ограничений
```typescript
const isAllowedAdminIP = (req: any): boolean => {
  if (process.env.NODE_ENV === 'development') {
    return true; // В разработке разрешаем все IP
  }
  
  const clientIP = req.ip;
  return ALLOWED_ADMIN_IPS.includes(clientIP);
};
```

#### Защита от CSRF
```typescript
app.use(session({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
}));
```

## 🚀 Установка и запуск

### Требования
- Node.js 18+
- PostgreSQL база данных
- npm или yarn

### Установка

1. **Клонирование проекта:**
```bash
git clone <repository-url>
cd freelancehub
```

2. **Установка зависимостей:**
```bash
npm install
```

3. **Настройка переменных окружения:**
Создайте `.env` файл:
```env
# База данных
DATABASE_URL=postgresql://user:password@host:port/database
PGHOST=localhost
PGPORT=5432
PGDATABASE=freelancehub
PGUSER=your_user
PGPASSWORD=your_password

# Сессии
SESSION_SECRET=your-super-secret-key

# Replit Auth (если используете)
REPL_ID=your-repl-id
ISSUER_URL=https://replit.com/oidc
REPLIT_DOMAINS=your-domain.replit.app

# Разработка
NODE_ENV=development
```

4. **Настройка базы данных:**
```bash
# Применить схему к базе данных
npm run db:push

# Или запустить миграции (если есть)
npm run db:migrate
```

5. **Запуск в режиме разработки:**
```bash
npm run dev
```

Приложение будет доступно на `http://localhost:5000`

### Скрипты package.json
```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "tsc && vite build",
    "start": "NODE_ENV=production node dist/server/index.js",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

## 💻 Разработка

### Настройка среды разработки

#### VSCode настройки (.vscode/settings.json)
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

#### Git hooks (с Husky)
```bash
# Установка
npm install --save-dev husky
npx husky install

# Pre-commit hook
npx husky add .husky/pre-commit "npm run lint && npm run type-check"
```

### Инструменты разработки

#### Отладка TypeScript
```typescript
// Включение исходных карт в tsconfig.json
{
  "compilerOptions": {
    "sourceMap": true,
    "inlineSourceMap": false
  }
}
```

#### Hot Module Replacement
Vite автоматически обновляет изменения в браузере без перезагрузки страницы.

#### Инструменты базы данных
```bash
# Запуск Drizzle Studio для визуального управления БД
npm run db:studio
```

### Тестирование ролей

Проект включает инструмент для переключения ролей в development режиме:

```typescript
// client/src/components/dev/role-switcher.tsx
export default function RoleSwitcher() {
  // Компонент для переключения между ролями в разработке
}
```

### Импорт тестовых данных

```typescript
// server/storage.ts - метод для создания тестовых пользователей
async getTestUsers(): Promise<User[]> {
  return [
    {
      id: "test-client-001",
      email: "client@test.com",
      role: "client",
      // ...
    },
    // ...
  ];
}
```

## 🌐 Развертывание

### Production сборка

1. **Сборка приложения:**
```bash
npm run build
```

2. **Настройка переменных окружения для production:**
```env
NODE_ENV=production
DATABASE_URL=your-production-db-url
SESSION_SECRET=strong-production-secret
REPLIT_DOMAINS=your-production-domain.com
```

3. **Запуск production сервера:**
```bash
npm start
```

### Развертывание на Replit

Проект оптимизирован для Replit:

1. **Файл .replit:**
```toml
run = "npm run dev"
modules = ["nodejs-20"]

[nix]
channel = "stable-23.11"

[deployment]
build = ["npm", "run", "build"]
run = ["npm", "start"]
```

2. **Автоматическое развертывание:**
- Используйте кнопку Deploy в Replit
- Настройте secrets для production переменных
- База данных автоматически провиженится через Neon

### Мониторинг и логирование

#### Логирование в production
```typescript
// Добавление Winston или другой библиотеки логирования
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

#### Health checks
```typescript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});
```

## 🎯 Особенности и бизнес-логика

### Система эскроу-платежей

1. **Создание платежа:**
   - Клиент создаёт задачу с бюджетом
   - При принятии заявки создаётся payment с статусом "held"
   - Средства блокируются в системе

2. **Освобождение средств:**
   - После завершения работы клиент освобождает средства
   - Или автоматически через определённое время
   - Средства переводятся исполнителю

3. **Возврат средств:**
   - При споре или отмене задачи
   - Решение принимает модератор/админ

### Система заявок с контрпредложениями

1. **Подача заявки:**
   - Исполнитель предлагает сумму и срок
   - Добавляет описание своего подхода

2. **Контрпредложение:**
   - Клиент может предложить другую сумму/срок
   - Исполнитель может принять или отклонить

3. **Принятие заявки:**
   - Создаётся связь freelancer ↔ task
   - Статус задачи меняется на "in_progress"
   - Создаётся payment

### Система сообщений

- **Контекст задачи:** все сообщения привязаны к конкретной задаче
- **Участники:** только клиент и назначенный исполнитель
- **Реальное время:** WebSocket уведомления (планируется)

### Система отзывов

- **Двусторонние отзывы:** клиент оценивает исполнителя и наоборот
- **Рейтинговая система:** 1-5 звёзд
- **Агрегация:** средний рейтинг пользователя

### Система разрешения споров

1. **Создание спора:** любая сторона может инициировать
2. **Модерация:** модераторы/админы изучают детали
3. **Решение:** освобождение средств или возврат клиенту

### Валидация дат

- **Клиентская валидация:** HTML5 date input с min=today
- **Серверная валидация:** Zod схемы проверяют будущие даты
- **Ошибки:** информативные сообщения на русском языке

## 🔧 Troubleshooting

### Частые проблемы

#### База данных не подключается
```bash
# Проверить переменные окружения
echo $DATABASE_URL

# Проверить подключение
psql $DATABASE_URL
```

#### TypeScript ошибки
```bash
# Очистить кеш TypeScript
rm -rf node_modules/.cache
npm run build
```

#### Vite не обновляет изменения
```bash
# Перезапустить с очисткой кеша
rm -rf node_modules/.vite
npm run dev
```

#### Проблемы с аутентификацией
1. Проверить REPL_ID в переменных окружения
2. Убедиться что домен добавлен в REPLIT_DOMAINS
3. Проверить сессии в базе данных

### Отладка

#### Логирование SQL запросов
```typescript
// В server/db.ts
export const db = drizzle(pool, { 
  schema,
  logger: process.env.NODE_ENV === 'development'
});
```

#### Отладка сессий
```typescript
// Добавить middleware для логирования
app.use((req, res, next) => {
  console.log('Session:', req.session);
  console.log('User:', req.user);
  next();
});
```

## 📚 Дополнительные ресурсы

### Документация технологий
- [Drizzle ORM](https://orm.drizzle.team/)
- [TanStack Query](https://tanstack.com/query/latest)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Replit Auth](https://docs.replit.com/tutorials/replit-auth)

### Полезные команды

```bash
# Проверка типов
npx tsc --noEmit

# Анализ bundle размера
npm run build -- --analyze

# Обновление схемы БД
npm run db:push

# Генерация миграций
npx drizzle-kit generate

# Просмотр БД в браузере
npm run db:studio
```

---

## 👥 Команда разработки

При работе над проектом следуйте:

1. **Code Style:** Prettier + ESLint конфигурация
2. **Git Flow:** Feature branches + Pull Requests
3. **Тестирование:** Покрытие критических функций
4. **Документация:** Обновление README при изменениях архитектуры

**Контакты для вопросов:** см. файл `replit.md` для текущего состояния проекта и предпочтений.