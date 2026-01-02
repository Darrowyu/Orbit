---
name: version-release
description: 版本发布流程。当用户要求发布版本、更新版本号、提交推送代码时使用。自动升级版本、同步 package.json、提交并推送。
---

# 版本发布流程

## 前置条件

- 所有代码变更已完成
- 构建和类型检查通过（建议先运行 build-check skill）

## 流程步骤

### 1. 确认版本类型

询问用户选择版本升级类型：

- **patch** (x.x.X): Bug 修复、小改动
- **minor** (x.X.0): 新功能、向后兼容
- **major** (X.0.0): 重大变更、不兼容更新

### 2. 升级版本号

```bash
# 根据用户选择执行对应命令
npm run version:bump patch   # 补丁版本
npm run version:bump minor   # 次版本
npm run version:bump major   # 主版本
```

### 3. 检查变更状态

```bash
git status
git diff --cached
```

### 4. 提交变更

```bash
# 添加所有变更
git add .

# 提交，包含版本号
git commit -m "release: v<新版本号>

- <变更摘要>

Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>"
```

### 5. 创建 Git Tag（可选）

```bash
git tag -a v<新版本号> -m "Release v<新版本号>"
```

### 6. 推送到远程

```bash
git push origin <当前分支>
git push origin --tags  # 如果创建了 tag
```

## 版本文件结构

```
项目根目录/
├── version.json          # 唯一版本源
├── package.json          # 自动同步
├── frontend/package.json # 自动同步
└── backend/package.json  # 自动同步
```

## 版本号显示位置

- **前端**: 设置 > 帮助页面底部
- **后端**: GET /api/health 返回 version 字段

## 手动操作命令

```bash
npm run version:bump <type>  # 升级并同步版本
npm run version:sync         # 仅同步版本到所有 package.json
git tag                      # 查看所有标签
```
