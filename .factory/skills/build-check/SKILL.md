---
name: build-check
description: 构建检查和类型验证。当用户要求检查代码、验证构建、类型检查、提交前检查时使用。
---

# 构建与类型检查

## Instructions

1. 后端 TypeScript 检查:
   ```bash
   cd backend && npx tsc --noEmit
   ```

2. 前端 TypeScript 检查:
   ```bash
   cd frontend && npx tsc --noEmit
   ```

3. 前端生产构建:
   ```bash
   cd frontend && npm run build
   ```

4. 后端生产构建:
   ```bash
   cd backend && npm run build
   ```

## 成功标准

- [ ] 后端 tsc 无错误
- [ ] 前端 tsc 无错误
- [ ] 前端 build 成功
- [ ] 后端 build 成功

## 常见问题

- `any` 类型: 添加明确的类型定义
- 导入错误: 检查路径和模块导出
- 枚举错误: 使用 `@prisma/client` 导出的枚举
