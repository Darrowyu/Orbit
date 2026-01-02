# Orbit - 团队任务协作平台

由 Gemini AI 驱动的现代看板式任务管理系统。

## 功能特性

- **项目管理** - 创建项目、设置周期、管理成员、查看进度仪表盘
- 拖拽式看板任务管理
- 任务归属项目，按项目筛选
- 任务依赖关系可视化
- AI 智能任务分解与优先级建议
- 实时多端同步协作
- 仪表盘数据概览
- 团队成员管理与权限控制
- 通知中心
- 管理后台

## 项目结构

```
orbit/
├── frontend/          # React 前端
│   ├── src/
│   │   ├── components/   # UI 组件
│   │   ├── pages/        # 页面组件
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

复制示例配置文件并修改：

```bash
cp backend/.env.example backend/.env
```

编辑 `backend/.env`：

```env
# 数据库连接
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/orbit"

# JWT 配置
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Gemini AI API
GEMINI_API_KEY="your-gemini-api-key"

# 服务端口
PORT=4000

# 前端地址（CORS配置，多个用逗号分隔）
FRONTEND_URL="http://localhost:3000"

# 代理配置（可选）
# HTTPS_PROXY=http://127.0.0.1:7890

# 登录安全配置
LOGIN_RATE_LIMIT_WINDOW_MS=900000
LOGIN_RATE_LIMIT_MAX=5
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

## 页面路由

| 路径 | 描述 |
|------|------|
| `/` | 主看板页面 |
| `/dashboard` | 仪表盘概览 |
| `/notifications` | 通知中心 |
| `/profile` | 个人设置 |
| `/admin` | 管理后台（需管理员权限） |
| `/join/:inviteLink` | 团队邀请加入 |

## 技术栈

- 前端：React 18 + TypeScript + Vite + Zustand + TailwindCSS
- 后端：NestJS + Prisma + PostgreSQL + Socket.io + JWT
- AI：Google Gemini API

## 设计系统

- 完整的设计令牌系统（颜色、间距、圆角、阴影）
- 暗色主题支持（CSS变量）
- 丰富的动画效果
- Glassmorphism 风格组件
- 响应式布局

## 安全特性

- JWT 认证与可配置过期时间
- 任务操作权限验证（团队成员隔离）
- WebSocket 按团队隔离广播
- CORS 环境变量配置
- 敏感配置项不提交 Git


