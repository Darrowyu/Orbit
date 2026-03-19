# CLAUDE.md

本文档为 Claude Code (claude.ai/code) 提供本代码库的工作指引。

## 项目概览

Orbit 是一个团队任务协作平台，采用看板式任务管理。主要功能包括 AI 智能任务分解（Gemini）、实时 WebSocket 同步、项目管理和基于角色的权限控制。

- **前端**: React 18 + TypeScript + Vite + Zustand + TailwindCSS v4
- **后端**: NestJS + Prisma + PostgreSQL + Socket.io + JWT
- **AI**: Google Gemini API + 支持用户配置 OpenAI/DeepSeek/Kimi/智谱等第三方 AI

## 常用命令

### 根目录
```bash
npm run dev              # 同时启动后端和前端
npm run dev:backend      # 仅启动后端
npm run dev:frontend     # 仅启动前端
npm run install:all      # 在前端和后端目录安装依赖
npm run build            # 构建前端生产版本
```

### 后端 (`cd backend/`)
```bash
npm run dev              # 以监听模式启动 NestJS，端口 4000
npm run build            # 构建生产版本
npm run start:prod       # 运行生产版本

# 数据库操作（需要 Node.js 20-22）
npx prisma migrate dev   # 执行数据库迁移
npx prisma generate      # 生成 Prisma 客户端
npx prisma db push       # 直接推送 schema 变更（不生成迁移文件）

# 测试
npm run test:cov         # 运行 Jest 测试并生成覆盖率报告（需要 --experimental-vm-modules）
```

### 前端 (`cd frontend/`)
```bash
npm run dev              # 启动 Vite 开发服务器，端口 3000
npm run build            # 构建生产版本
npm run preview          # 预览生产构建
```

## 架构概览

### 单体仓库结构
```
orbit/
├── frontend/            # React 单页应用
│   ├── src/
│   │   ├── components/  # UI 组件（原子化设计）
│   │   ├── pages/       # 路由页面（看板、仪表盘、后台等）
│   │   ├── services/    # API 调用 (api.ts) + WebSocket (socket.ts) + 推送通知
│   │   ├── stores/      # Zustand 状态管理（taskStore、authStore、teamStore 等）
│   │   ├── hooks/       # 自定义 React Hooks
│   │   ├── utils/       # 工具函数
│   │   └── types.ts     # 共享 TypeScript 类型定义
│   └── vite.config.ts   # Vite 配置，路径别名 `@/*` 映射到 `./src/*`
│
├── backend/             # NestJS API
│   ├── src/
│   │   ├── auth/        # JWT 认证（登录/注册/守卫）
│   │   ├── users/       # 用户管理 + AI 配置
│   │   ├── teams/       # 团队 CRUD + 成员管理
│   │   ├── projects/    # 项目管理（含里程碑）
│   │   ├── tasks/       # 任务 CRUD + 子任务 + 依赖关系
│   │   ├── ai/          # AI 服务（Gemini + 其他厂商）
│   │   ├── gateway/     # WebSocket 网关，实现实时同步
│   │   ├── notifications/ # 应用内通知系统
│   │   ├── prisma/      # PrismaService（数据库访问）
│   │   └── ...          # 其他模块（标签、评论、附件等）
│   └── prisma/schema.prisma  # 数据库 Schema
```

## 核心架构模式

### 实时同步机制
- WebSocket 事件按团队隔离（`team:${teamId}` 房间）
- 网关在处理连接和切换团队时验证成员身份
- 前端 socket.ts 处理断线重连并自动刷新数据
- 事件类型：`task:created`、`task:updated`、`task:deleted`、`notification`

### 状态管理
- 客户端状态使用 Zustand 管理（taskStore、authStore、teamStore 等）
- API 层位于 services/api.ts，使用 axios 并配置 JWT 拦截器
- 收到 401 响应时通过 authStore 自动触发登出

### 认证机制
- 基于 JWT，受保护路由使用 `JwtAuthGuard`
- Token 存储在 Zustand authStore 中（持久化）
- Socket.io 认证使用相同的 JWT Token
- 登录接口通过 `RateLimitMiddleware` 实现速率限制

### 数据库访问
- 所有数据库操作通过 `PrismaService` 进行
- 关联关系：User → TeamMember → Team → Project → Task（层级结构）
- 软删除模式通过 `isArchived`/`archivedAt` 字段实现

### AI 集成
- 系统级 Gemini Key 通过 `GEMINI_API_KEY` 环境变量配置
- 用户可配置个人 AI Key（使用 AES-256 加密存储）
- 支持多厂商：OpenAI、DeepSeek、Moonshot、智谱，通过 OpenAI 兼容 API 接入

### 文件上传
- 使用 Multer 处理 multipart 上传
- 文件存储在 `uploads/` 目录，通过 `/uploads/` 路径静态提供服务
- 头像上传返回公开 URL

## 环境变量

### 后端（`backend/` 目录下的 `.env`）
```env
DATABASE_URL="postgresql://postgres:密码@localhost:5432/orbit"
JWT_SECRET="你的密钥"
JWT_EXPIRES_IN="7d"
GEMINI_API_KEY="你的 Gemini Key"
PORT=4000
FRONTEND_URL="http://localhost:3000"
# 可选：HTTPS_PROXY、AI_API_KEY_BACKUP、AI_BASE_URL_BACKUP
```

### 前端（`frontend/` 目录下的 `.env`）
```env
VITE_API_URL="http://localhost:4000"  # 后端 API 和 WebSocket 地址
```

## API 结构
- 基础路径：`/api`
- RESTful 资源：`/auth`、`/users`、`/teams`、`/projects`、`/tasks`、`/ai`、`/admin`
- WebSocket 在根路径（由 Socket.io 处理）
- 静态文件：`/uploads/`

## 权限模型
- **超级管理员**：通过 `isSuperAdmin` 标记拥有全系统权限
- **团队角色**：`owner`、`admin`、`member`（TeamMember 表中）
- **项目角色**：`owner`、`admin`、`member`（ProjectMember 表中）
- 守卫：`JwtAuthGuard`、`TeamMemberGuard`、`SuperAdminGuard`

## 关键文件索引
- `backend/src/main.ts` - 应用启动、CORS、全局管道、限流器
- `backend/src/app.module.ts` - 模块导入
- `backend/src/gateway/tasks.gateway.ts` - WebSocket 处理
- `backend/src/prisma/prisma.service.ts` - 数据库客户端
- `frontend/src/services/api.ts` - 带拦截器的 API 客户端
- `frontend/src/services/socket.ts` - WebSocket 连接管理
- `frontend/src/stores/taskStore.ts` - 主要任务状态管理
