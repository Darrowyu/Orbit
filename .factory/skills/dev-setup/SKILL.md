---
name: dev-setup
description: 启动开发环境。当用户要求启动项目、运行开发服务器、启动服务时使用。
---

# 开发环境启动

## Prerequisites

- Node.js 18+
- PostgreSQL 运行中
- Redis 运行中（可选，用于队列）

## Instructions

1. 检查环境变量配置:
   - `backend/.env` 存在且包含 DATABASE_URL, JWT_SECRET
   - `frontend/.env` 存在且包含 VITE_PORT, VITE_API_URL

2. 安装依赖（如需要）:
   ```bash
   npm run install:all
   ```

3. 启动后端服务:
   ```bash
   cd backend && npm run start:dev
   ```

4. 启动前端服务（新终端）:
   ```bash
   cd frontend && npm run dev
   ```

## 验证

- 前端: http://localhost:5173
- 后端: http://localhost:3000/api
- 测试登录: admin / admin123
