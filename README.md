# Orbit

> 现代团队任务协作平台 —— 看板驱动，AI 辅助，实时同步。

## 功能特性

- **项目管理** — 创建项目、设置周期、管理成员、Cockpit 仪表盘全景概览
- **拖拽看板** — 直观的任务状态流转，支持优先级、标签、截止日期
- **任务依赖** — 可视化依赖关系图，自动识别阻塞与风险
- **AI 智能助手** — 基于 LLM 自动任务分解、优先级建议与工作量估算
- **实时协作** — WebSocket 多端同步，任务变更即时推送
- **权限体系** — 团队成员隔离、管理员后台、超级管理员控制
- **通知中心** — 任务指派、状态变更、截止日期提醒

## 快速开始

### 前置要求

- Node.js ≥ 18
- PostgreSQL ≥ 14

### 1. 安装依赖

```bash
npm run install:all
```

### 2. 配置环境变量

```bash
cp backend/.env.example backend/.env
```

编辑 `backend/.env`，至少配置以下项：

```env
# 数据库
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/orbit?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# AI 功能（可选，Anthropic Messages API 格式，兼容 Kimi 等服务）
AI_API_KEY=your_api_key_here
AI_BASE_URL=https://api.kimi.com/coding/
AI_MODEL=kimi-k2.5
```

### 3. 初始化数据库

```bash
cd backend
npx prisma migrate dev --name init
```

### 4. 启动开发服务

```bash
npm run dev
```

访问 http://localhost:1234

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

- **前端**：React 18 + TypeScript + Vite + Zustand + TailwindCSS
- **后端**：NestJS + Prisma + PostgreSQL + Socket.io + JWT
- **AI**：Anthropic Messages API（兼容 Kimi、OpenRouter 等）

## 设计系统

- 完整的设计令牌系统（颜色、间距、圆角、阴影）
- 暗色主题支持（CSS 变量）
- 丰富的动画效果
- Glassmorphism 风格组件
- 响应式布局

## 安全特性

- JWT 认证与可配置过期时间
- 任务操作权限验证（团队成员隔离）
- WebSocket 按团队隔离广播
- CORS 环境变量配置
- 敏感配置项不提交 Git

## License

[MIT](LICENSE) © 2026 Orbit Contributors
