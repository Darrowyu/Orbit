---
name: db-migrate
description: 数据库迁移操作。当用户修改 Prisma schema、需要同步数据库、创建迁移时使用。
---

# 数据库迁移

## Instructions

### 开发环境同步（推荐）

快速同步 schema 到数据库（不创建迁移文件）:
```bash
cd backend && npx prisma db push
```

### 创建正式迁移

1. 创建迁移文件:
   ```bash
   cd backend && npx prisma migrate dev --name <migration-name>
   ```

2. 生成 Prisma Client:
   ```bash
   cd backend && npx prisma generate
   ```

### 重置数据库（危险）

```bash
cd backend && npx prisma migrate reset
```

### 查看数据库

```bash
cd backend && npx prisma studio
```

## 验证

- 运行 `npx prisma validate` 检查 schema 语法
- 运行 `npx prisma db pull` 查看当前数据库状态

## 注意事项

- 生产环境使用 `prisma migrate deploy`
- 修改 schema 后必须重新生成 Client
- 破坏性变更需要数据迁移脚本
