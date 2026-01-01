---
name: git-pull-workflow
description: Git拉取代码后的标准化检查流程。确保依赖同步、数据库迁移、环境变量更新。当执行git pull或切换分支后使用。
---

Git代码更新后的标准化操作流程，避免因遗漏同步步骤导致的运行时错误。

## 更新后检查流程

### 1. 查看变更文件
```bash
# 查看本次pull涉及的文件
git diff --name-only HEAD@{1} HEAD

# 或查看最近一次merge的变更
git diff --name-only ORIG_HEAD HEAD
```

### 2. 依赖检查（按需执行）

#### 检测依赖文件变化
```bash
# 检查package.json是否变更
git diff HEAD@{1} HEAD --name-only | grep -E "package(-lock)?\.json"
```

#### 若依赖变更，执行安装
```bash
# 根目录（安装所有工作区依赖）
npm run install:all

# 或分别安装
cd frontend && npm install
cd backend && npm install
```

### 3. 数据库迁移检查

#### 检测Prisma schema变化
```bash
git diff HEAD@{1} HEAD --name-only | grep "prisma/schema.prisma"
```

#### 若schema变更，执行迁移
```bash
cd backend

# 开发环境：应用迁移
npx prisma migrate dev

# 生产环境：仅应用已有迁移
npx prisma migrate deploy

# 重新生成Prisma Client
npx prisma generate
```

### 4. 环境变量检查

#### 检测.env示例文件变化
```bash
git diff HEAD@{1} HEAD --name-only | grep -E "\.env\.example|\.env\.template"
```

#### 若有新增环境变量
1. 对比 `.env.example` 与本地 `.env`
2. 补充缺失的环境变量
3. 确认敏感值已正确配置

### 5. 类型/构建检查
```bash
# 前端类型检查
cd frontend && npm run typecheck

# 后端类型检查
cd backend && npm run build

# 或使用项目统一命令
npm run build
```

### 6. 重启开发服务
```bash
# 停止当前服务后重启
npm run dev
```

## 快速检查脚本

一键执行所有检查（建议添加到项目脚本）：
```bash
#!/bin/bash
echo "=== Git Pull 后置检查 ==="

# 获取变更文件列表
CHANGED=$(git diff --name-only HEAD@{1} HEAD 2>/dev/null || echo "")

# 依赖检查
if echo "$CHANGED" | grep -qE "package(-lock)?\.json"; then
  echo "[!] 检测到依赖变更，执行 npm install..."
  npm run install:all
fi

# Prisma检查
if echo "$CHANGED" | grep -q "prisma/schema.prisma"; then
  echo "[!] 检测到数据库schema变更，执行迁移..."
  cd backend && npx prisma migrate dev && npx prisma generate && cd ..
fi

# 环境变量提醒
if echo "$CHANGED" | grep -qE "\.env\.example"; then
  echo "[!] 检测到环境变量模板变更，请检查本地.env文件"
fi

echo "=== 检查完成 ==="
```

## 常见问题处理

### Prisma Client类型不匹配
```bash
cd backend && npx prisma generate
```

### 模块找不到（Module not found）
```bash
rm -rf node_modules
npm run install:all
```

### 端口占用
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :3000
kill -9 <PID>
```

### 数据库连接失败
1. 确认PostgreSQL服务运行中
2. 检查 `DATABASE_URL` 配置正确
3. 确认数据库已创建

## 分支切换特别注意

切换到功能分支时：
```bash
git checkout feature/xxx

# 必须检查
npm run install:all           # 依赖可能不同
cd backend && npx prisma migrate dev  # 迁移状态可能不同
```

切回主分支时：
```bash
git checkout main
git pull origin main

# 同样执行完整检查流程
```

## 检查清单

每次 `git pull` 后确认：
- [ ] 依赖是否需要更新 (`package.json` 变更)
- [ ] 数据库是否需要迁移 (`schema.prisma` 变更)
- [ ] 环境变量是否需要补充 (`.env.example` 变更)
- [ ] 类型检查是否通过
- [ ] 开发服务是否正常启动
