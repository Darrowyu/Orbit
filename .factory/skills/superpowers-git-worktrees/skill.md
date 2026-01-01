---
name: superpowers-git-worktrees
description: Git工作树。开始需要与当前工作区隔离的功能开发时使用，或执行实施计划前创建隔离的Git工作树。
---

# 使用Git工作树

## 概述

Git工作树创建共享同一仓库的隔离工作空间，允许同时在多个分支上工作而无需切换。

**核心原则：** 系统化目录选择 + 安全验证 = 可靠隔离

## 目录选择流程

按此优先级顺序：

### 1. 检查现有目录

```bash
# 按优先级检查
ls -d .worktrees 2>/dev/null     # 首选（隐藏）
ls -d worktrees 2>/dev/null      # 备选
```

**如找到：** 使用该目录。如果都存在，`.worktrees` 优先。

### 2. 检查 CLAUDE.md / AGENTS.md

```bash
grep -i "worktree.*director" CLAUDE.md 2>/dev/null
```

**如指定了偏好：** 使用它，不用询问。

### 3. 询问用户

如果没有目录存在且没有配置偏好：

```
未找到工作树目录。我应该在哪里创建工作树？

1. .worktrees/ (项目本地，隐藏)
2. worktrees/ (项目本地，可见)

你更喜欢哪个？
```

## 安全验证

### 对于项目本地目录（.worktrees 或 worktrees）

**创建工作树前必须验证目录被忽略：**

```bash
# 检查目录是否被忽略（尊重本地、全局和系统gitignore）
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

**如果未被忽略：**

1. 添加适当行到 .gitignore
2. 提交更改
3. 继续创建工作树

**为什么关键：** 防止意外将工作树内容提交到仓库。

## 创建步骤

### 1. 检测项目名

```bash
project=$(basename "$(git rev-parse --show-toplevel)")
```

### 2. 创建工作树

```bash
# 确定完整路径
path=".worktrees/$BRANCH_NAME"

# 创建带新分支的工作树
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

### 3. 运行项目设置

自动检测并运行适当的设置：

```bash
# Node.js
if [ -f package.json ]; then npm install; fi

# Rust
if [ -f Cargo.toml ]; then cargo build; fi

# Python
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi

# Go
if [ -f go.mod ]; then go mod download; fi
```

### 4. 验证干净基线

运行测试确保工作树起点干净：

```bash
# 使用项目适当的命令
npm test
cargo test
pytest
go test ./...
```

**如测试失败：** 报告失败，询问是继续还是调查。

**如测试通过：** 报告就绪。

### 5. 报告位置

```
工作树就绪于 <完整路径>
测试通过（<N> 测试，0 失败）
准备实现 <功能名>
```

## 快速参考

| 情况 | 行动 |
|------|------|
| `.worktrees/` 存在 | 使用它（验证被忽略） |
| `worktrees/` 存在 | 使用它（验证被忽略） |
| 都存在 | 使用 `.worktrees/` |
| 都不存在 | 检查配置 → 询问用户 |
| 目录未被忽略 | 添加到 .gitignore + 提交 |
| 基线测试失败 | 报告失败 + 询问 |

## 常见错误

### 跳过忽略验证

- **问题：** 工作树内容被跟踪，污染git状态
- **修复：** 创建项目本地工作树前总是用 `git check-ignore`

### 假设目录位置

- **问题：** 创建不一致，违反项目约定
- **修复：** 遵循优先级：现有 > 配置 > 询问

### 测试失败时继续

- **问题：** 无法区分新Bug和预存问题
- **修复：** 报告失败，获得明确许可后继续

## 示例工作流

```
我正在使用 git-worktrees 技能设置隔离工作空间。

[检查 .worktrees/ - 存在]
[验证被忽略 - git check-ignore 确认 .worktrees/ 被忽略]
[创建工作树: git worktree add .worktrees/auth -b feature/auth]
[运行 npm install]
[运行 npm test - 47 通过]

工作树就绪于 /path/to/project/.worktrees/auth
测试通过（47 测试，0 失败）
准备实现 auth 功能
```

## 红旗

**绝不：**
- 不验证是否被忽略就创建工作树（项目本地）
- 跳过基线测试验证
- 测试失败时不询问就继续
- 有歧义时假设目录位置

**总是：**
- 遵循目录优先级：现有 > 配置 > 询问
- 对项目本地目录验证是否被忽略
- 自动检测并运行项目设置
- 验证干净测试基线
