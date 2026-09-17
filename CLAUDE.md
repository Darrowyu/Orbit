# CLAUDE.md

本文档为 Claude Code (claude.ai/code) 提供本代码库的工作指引。

## 项目概览

Orbit 是一个团队任务协作平台，采用看板式任务管理。主要功能包括 AI 智能任务分解、实时 WebSocket 同步、项目管理和基于角色的权限控制。

- **前端**: React 18 + TypeScript + Vite + Zustand + TailwindCSS v4
- **后端**: NestJS + Prisma + PostgreSQL + Socket.io + JWT
- **AI**: 系统级走 Anthropic Messages API 兼容服务（Kimi 等，环境变量配置）；用户可在个人中心配置自己的 OpenAI 兼容 Key（OpenAI/DeepSeek/Moonshot/智谱/自定义，AES-256-GCM 加密存储，用户配置优先于系统配置）

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
npm run dev              # 启动 Vite 开发服务器，端口 1234
npm run build            # 构建生产版本（tsc --noEmit 类型检查 + vite build）
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
│   │   ├── ai/          # AI 服务（系统级 Anthropic 兼容 + 用户级 OpenAI 兼容）
│   │   ├── gateway/     # WebSocket 网关，实现实时同步
│   │   ├── notifications/ # 应用内通知系统
│   │   ├── prisma/      # PrismaService（数据库访问）
│   │   └── ...          # 其他模块（标签、评论、附件等）
│   └── prisma/schema.prisma  # 数据库 Schema
```

## 核心架构模式

### 实时同步机制
- **服务端权威事件**：REST 写路径（service 层）在事务提交后由后端向 `team:${teamId}` 房间广播；客户端不存在任务上行事件通道
- WebSocket 事件按团队隔离（`team:${teamId}` 房间）
- 网关连接时验证 JWT + 用户存在且未禁用；切换团队时验证成员身份
- 前端 socket.ts 处理断线重连并自动刷新数据；本地操作与广播回声按 id 幂等去重
- 事件类型：`task:created`、`task:updated`、`task:deleted`、`comment:created`、`comment:deleted`、`notification`

### 状态管理
- 客户端状态使用 Zustand 管理（taskStore、authStore、teamStore 等）
- API 层位于 services/api.ts，使用 axios 并配置 JWT 拦截器
- 收到 401 响应时通过 authStore 自动触发登出

### 认证机制
- 基于 JWT，受保护路由使用 `JwtAuthGuard`
- `JwtStrategy.validate` 每次请求查库：拒绝已删除/被禁用用户，并注入 `currentTeamId` 到 req.user（团队边界校验的事实来源，各 controller 通过 getTeamId 守卫校验显式 teamId 的成员身份）
- `JWT_SECRET` 启动时 fail-fast：缺失/默认值/少于 32 字符直接拒绝启动
- Token 存储在 Zustand authStore 中（持久化）
- Socket.io 认证使用相同的 JWT Token
- 限流分两层：`RateLimitMiddleware` 为全局 HTTP 限流（按 IP 或登录用户分桶，参数见 `LOGIN_RATE_LIMIT_*` 环境变量）；登录失败锁定（邮箱 + IP 双维度，失败计入 LoginLog，同邮箱 15 分钟 5 次、同 IP 20 次）在 `AuthService.checkLoginAttempts` 中硬编码实现
- 忘记密码：邮箱验证码（PasswordResetCode 表存 SHA-256 哈希，10 分钟有效、5 次防爆破），SMTP 未配置时验证码降级输出到服务端日志

### 数据库访问
- 所有数据库操作通过 `PrismaService` 进行
- 关联关系：User → TeamMember → Team → Project → Task（层级结构）
- 软删除模式通过 `isArchived`/`archivedAt` 字段实现

### AI 集成
- 系统级：`AI_API_KEY`/`AI_BASE_URL`/`AI_MODEL` 环境变量，Anthropic Messages API 格式（Kimi 等兼容服务）
- 用户级：个人中心"AI 设置"Tab 配置自己的 Key（OpenAI 兼容格式，支持 OpenAI/DeepSeek/Moonshot/智谱/自定义），AES-256-GCM 加密存储（`ENCRYPTION_KEY` 环境变量），用户配置优先于系统配置
- AI 端点按用户限流：10 次/分钟
- 加解密工具：`backend/src/common/crypto.util.ts`（随机 IV，解密失败抛异常）

### 文件上传
- 使用 Multer 处理 multipart 上传，**白名单校验**（`backend/src/common/file-upload.ts`）：附件限图片/PDF/办公文档/zip，头像限图片且校验魔数；扩展名与 mimetype 需匹配
- 文件存储在 `uploads/` 目录（随机文件名），通过 `/uploads/` 路径静态提供服务，响应带 `X-Content-Type-Options: nosniff`，非图片扩展名强制 `Content-Disposition: attachment`
- 头像上传返回公开 URL

## 环境变量

### 后端（`backend/` 目录下的 `.env`，模板见 `.env.example`）
```env
DATABASE_URL="postgresql://postgres:密码@localhost:5432/orbit"
JWT_SECRET="至少32字符高熵随机密钥"  # 缺失/默认值/过短会拒绝启动
JWT_EXPIRES_IN="7d"
ENCRYPTION_KEY="64位hex"            # 用户级 AI Key 加密用，不设置则用户无法保存 AI Key
AI_API_KEY="系统级 AI Key"
AI_BASE_URL="https://api.kimi.com/coding/"
AI_MODEL="kimi-k2.5"
PORT=4000
FRONTEND_URL="http://localhost:1234"
# 可选：SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM（忘记密码邮件；不配置则验证码输出到日志）
# 可选：LOGIN_RATE_LIMIT_WINDOW_MS、LOGIN_RATE_LIMIT_MAX、HTTPS_PROXY
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
