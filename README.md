# Orbit - 团队任务协作平台

由 Gemini AI 驱动的现代看板式任务管理系统。

## 项目结构

```
orbit/
├── frontend/          # React 前端
│   ├── src/
│   │   ├── components/   # UI 组件
│   │   ├── services/     # API 和 Socket 服务
│   │   ├── stores/       # Zustand 状态管理
│   │   └── types.ts      # 类型定义
│   └── package.json
│
├── backend/           # NestJS 后端
│   ├── src/
│   │   ├── auth/         # JWT 认证
│   │   ├── users/        # 用户管理
│   │   ├── tasks/        # 任务 CRUD
│   │   ├── ai/           # Gemini AI 代理
│   │   ├── gateway/      # WebSocket 实时同步
│   │   └── prisma/       # 数据库服务
│   ├── prisma/
│   │   └── schema.prisma # 数据模型
│   └── package.json
```

## 快速开始

### 1. 安装依赖

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. 配置环境变量

编辑 `backend/.env`：
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/orbit"
JWT_SECRET="your-secret-key"
GEMINI_API_KEY="your-gemini-api-key"
```

### 3. 初始化数据库

```bash
cd backend
npx prisma migrate dev --name init
```

### 4. 启动服务

```bash
# 终端1 - 后端
cd backend && npm run dev

# 终端2 - 前端
cd frontend && npm run dev
```

访问 http://localhost:3000

## 技术栈

- 前端：React 18 + TypeScript + Vite + Zustand + TailwindCSS
- 后端：NestJS + Prisma + PostgreSQL + Socket.io + JWT
- AI：Google Gemini API
