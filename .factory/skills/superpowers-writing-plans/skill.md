---
name: superpowers-writing-plans
description: 编写实施计划。当有规范或多步骤任务需求时使用，在写代码前创建详细的分步实施计划。
---

# 编写实施计划

## 概述

编写全面的实施计划，假设工程师对代码库零上下文且品味可疑。记录他们需要知道的一切：每个任务要修改哪些文件、代码、测试、可能需要查阅的文档、如何测试。将整个计划作为小任务给他们。DRY、YAGNI、TDD、频繁提交。

假设他们是熟练的开发者，但对我们的工具集或问题域几乎一无所知。假设他们不太了解好的测试设计。

**保存计划到：** `docs/plans/YYYY-MM-DD-<功能名>.md`

## 小任务粒度

**每步是一个动作（2-5分钟）：**
- "写失败测试" - 一步
- "运行确保它失败" - 一步
- "实现最小代码让测试通过" - 一步
- "运行测试确保通过" - 一步
- "提交" - 一步

## 计划文档头部

**每个计划必须以此头部开始：**

```markdown
# [功能名] 实施计划

**目标：** [一句话描述构建什么]

**架构：** [2-3句关于方案]

**技术栈：** [关键技术/库]

---
```

## 任务结构

```markdown
### 任务 N: [组件名]

**文件：**
- 创建: `exact/path/to/file.ts`
- 修改: `exact/path/to/existing.ts:123-145`
- 测试: `tests/exact/path/to/test.ts`

**步骤1: 写失败测试**

```typescript
describe('specificBehavior', () => {
  it('should do something', () => {
    const result = function(input);
    expect(result).toBe(expected);
  });
});
```

**步骤2: 运行测试验证它失败**

运行: `npm test tests/path/test.ts`
预期: FAIL "function is not defined"

**步骤3: 写最小实现**

```typescript
function function(input) {
  return expected;
}
```

**步骤4: 运行测试验证通过**

运行: `npm test tests/path/test.ts`
预期: PASS

**步骤5: 提交**

```bash
git add tests/path/test.ts src/path/file.ts
git commit -m "feat: add specific feature"
```
```

## 记住

- 总是精确文件路径
- 计划中写完整代码（不是"添加验证"）
- 精确命令和预期输出
- DRY、YAGNI、TDD、频繁提交

## 执行交接

保存计划后，提供执行选择：

**"计划完成并保存到 `docs/plans/<filename>.md`。两种执行选项：**

**1. 子代理驱动（本会话）** - 我为每个任务派发新子代理，任务间审查，快速迭代

**2. 分批执行（手动检查点）** - 分批执行，每批后报告并等待反馈

**选择哪种方式？"**

## 示例计划片段

```markdown
# 用户认证 实施计划

**目标：** 实现基于JWT的用户登录功能

**架构：** 使用Passport.js + JWT策略，token存localStorage，刷新逻辑在拦截器

**技术栈：** NestJS, Passport, JWT, bcrypt

---

### 任务 1: 创建登录DTO

**文件：**
- 创建: `backend/src/modules/auth/dto/login.dto.ts`

**步骤1: 创建DTO类**

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
```

**步骤2: 提交**

```bash
git add backend/src/modules/auth/dto/login.dto.ts
git commit -m "feat(auth): add login DTO"
```

### 任务 2: 实现登录服务方法

**文件：**
- 修改: `backend/src/modules/auth/auth.service.ts`
- 测试: `backend/src/modules/auth/auth.service.spec.ts`

**步骤1: 写失败测试**
...
```
