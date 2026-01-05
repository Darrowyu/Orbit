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

## 生产部署

本项目采用前后端分离部署：
- **后端 + 数据库**：Railway
- **前端**：Vercel

### 一、Railway 部署（后端 + 数据库）

#### 1. 创建项目
1. 打开 [railway.com](https://railway.com) → 登录
2. 点击 **"New Project"** → **"Deploy from GitHub repo"**
3. 选择仓库

#### 2. 添加 PostgreSQL 数据库
1. 项目中点击 **"Add Service"** → **"Database"** → **PostgreSQL**
2. 创建后点击数据库 → **Variables** → 复制 `DATABASE_URL`

#### 3. 配置后端服务
1. 点击 **"Add Service"** → **"GitHub Repo"** → 选择仓库
2. **Settings** 配置：
   | 配置项 | 值 |
   |--------|-----|
   | Service Name | `backend` |
   | Root Directory | `backend` |
   | Watch Paths | `/backend/**` |

3. **Variables** 添加环境变量：
   ```
   DATABASE_URL=（粘贴数据库连接字符串）
   JWT_SECRET=your-super-secret-jwt-key
   NODE_ENV=production
   FRONTEND_URL=https://你的前端域名.vercel.app
   ```

4. **Networking** → 点击 **"Generate Domain"** 获取后端公开域名

### 二、Vercel 部署（前端）

#### 1. 创建项目
1. 打开 [vercel.com](https://vercel.com) → 登录
2. **"Add New Project"** → 导入仓库

#### 2. 配置构建
| 配置项 | 值 |
|--------|-----|
| **Root Directory** | `frontend`（点击 Edit 修改） |
| **Framework Preset** | Vite（自动检测） |
| **Build Command** | 留空（使用默认） |
| **Output Directory** | 留空（使用默认） |

#### 3. 环境变量
```
VITE_API_URL = https://你的Railway后端域名.up.railway.app
```

#### 4. 点击 Deploy

### 三、部署后配置

#### 1. 配置 CORS（重要！）
前端部署成功后，回到 Railway 后端服务：
1. **Variables** → 修改 `FRONTEND_URL`
2. 设置为 Vercel 分配的前端域名（如 `https://xxx.vercel.app`）
3. 多个域名用逗号分隔：`http://localhost:3000,https://xxx.vercel.app`

#### 2. 设置超级管理员
在 Railway 数据库的 **Query** 中执行：

```sql
-- 查看所有用户
SELECT id, email, name, "isSuperAdmin" FROM "User";

-- 设置指定邮箱为超级管理员
UPDATE "User" SET "isSuperAdmin" = true WHERE email = '你的邮箱';
```

### 四、环境变量汇总

#### Railway 后端
| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://...` |
| `JWT_SECRET` | JWT 签名密钥 | 随机字符串 |
| `NODE_ENV` | 运行环境 | `production` |
| `FRONTEND_URL` | 前端地址（CORS） | `https://xxx.vercel.app` |
| `GEMINI_API_KEY` | AI 功能（可选） | Gemini API Key |

#### Vercel 前端
| 变量名 | 说明 | 示例 |
|--------|------|------|
| `VITE_API_URL` | 后端 API 地址 | `https://xxx.up.railway.app` |

### 五、验证部署

1. 访问前端域名，应能正常加载页面
2. 注册/登录账号，验证 API 连通性
3. 创建任务，验证数据库读写
4. 访问 `/admin` 验证管理员权限（需先设置超级管理员）


