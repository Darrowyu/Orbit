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
3. 多个域名用逗号分隔：`http://localhost:1234,https://xxx.vercel.app`

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
| `AI_API_KEY` | AI 功能（可选） | API Key |
| `AI_BASE_URL` | AI 服务端点（可选） | `https://api.kimi.com/coding/` |
| `AI_MODEL` | AI 模型名称（可选） | `kimi-k2.5` |

#### Vercel 前端
| 变量名 | 说明 | 示例 |
|--------|------|------|
| `VITE_API_URL` | 后端 API 地址 | `https://xxx.up.railway.app` |

### 五、验证部署

1. 访问前端域名，应能正常加载页面
2. 注册/登录账号，验证 API 连通性
3. 创建任务，验证数据库读写
4. 访问 `/admin` 验证管理员权限（需先设置超级管理员）

## License

[MIT](LICENSE) © 2026 Orbit Contributors
