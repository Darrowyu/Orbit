# Windows Git 操作规范

## 概述
在Windows环境下执行Git命令时，由于PowerShell和cmd的特殊字符处理问题，需要使用特定的命令格式来避免解析错误。

## 问题原因
1. PowerShell会解析`-`开头的内容为运算符
2. `cmd /c`中双引号嵌套会导致参数分割
3. 中文字符在某些终端下显示为乱码

## 正确的命令格式

### 1. 切换目录执行命令 - 错误方式
```bash
# ❌ 错误：PowerShell不支持 &&
cd D:\project && git status

# ❌ 错误：cmd /c 嵌套引号问题
cmd /c "cd /d D:\project && git commit -m \"message\""
```

### 2. 切换目录执行命令 - 正确方式
```bash
# ✅ 正确：使用 git -C 指定工作目录
git -C "D:\project" status
git -C "D:\project" add -A
git -C "D:\project" commit -m "message"
git -C "D:\project" push
```

### 3. 多行提交消息
```bash
# ❌ 错误：多行消息在Windows中会被解析出错
git commit -m "title

- item 1
- item 2"

# ✅ 正确：使用单行消息
git -C "D:\project" commit -m "fix: brief description"

# ✅ 正确：如需详细描述，使用 -m 多次
git -C "D:\project" commit -m "title" -m "body line 1" -m "body line 2"
```

### 4. 其他常用命令
```bash
# 查看状态
git -C "D:\project" status --porcelain

# 查看差异
git -C "D:\project" diff --stat

# 查看日志
git -C "D:\project" log --oneline -5

# 拉取代码
git -C "D:\project" pull

# 推送代码
git -C "D:\project" push
```

## 网络问题处理
如果遇到 `Connection was reset` 错误：
1. 检查网络连接
2. 重试推送命令
3. 考虑使用代理或SSH方式

## 使用场景
当用户要求执行git操作（commit、push等）时，自动使用`git -C`格式避免Windows解析问题。
