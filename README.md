# Orbit

> 现代团队任务协作平台 —— 看板驱动，AI 辅助，实时同步。

[<img src="https://img.shields.io/badge/license-MIT-blue">](LICENSE)
<img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white">
<img src="https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white">
<img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white">
<img src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white">

<!-- TODO: 替换为实际截图 -->
<!-- <p align="center">
  <img src="docs/screenshots/dashboard.png" alt="Orbit Dashboard" width="800">
</p> -->

## 功能特性

- **项目管理** — 创建项目、设置周期、管理成员、Cockpit 仪表盘全景概览
- **拖拽看板** — 直观的任务状态流转，支持优先级、标签、截止日期
- **任务依赖** — 可视化依赖关系图，自动识别阻塞与风险
- **AI 智能助手** — 基于 LLM 自动任务分解、优先级建议与工作量估算
- **实时协作** — WebSocket 多端同步，任务变更即时推送
- **权限体系** — 团队成员隔离、管理员后台、超级管理员控制
- **通知中心** — 任务指派、状态变更、截止日期提醒

**设计 & 安全**：暗色主题、Glassmorphism UI、响应式布局；JWT 认证、团队隔离、CORS 可控、敏感配置不落地。

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

## License

[MIT](LICENSE) © 2026 Orbit Contributors
