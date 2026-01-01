---
name: superpowers-tdd
description: 测试驱动开发(TDD)。实现功能或修复Bug前必须使用，强制RED-GREEN-REFACTOR循环，先写失败测试再写实现代码。
---

# 测试驱动开发 (TDD)

## 核心原则

**先写测试，看它失败，再写最小代码使其通过。**

如果没看到测试失败，你不知道它是否测试了正确的东西。

```
铁律：没有失败测试，就不能写生产代码
```

先写了代码？删掉它，重新开始。不要保留作"参考"，不要"改编"，删除就是删除。

## 何时使用

**必须使用：**
- 新功能开发
- Bug修复
- 重构
- 行为变更

**例外（需询问）：**
- 一次性原型
- 生成的代码
- 配置文件

## RED-GREEN-REFACTOR 循环

### RED - 写失败测试

写一个最小测试展示期望行为：

```typescript
test('retries failed operations 3 times', async () => {
  let attempts = 0;
  const operation = () => {
    attempts++;
    if (attempts < 3) throw new Error('fail');
    return 'success';
  };

  const result = await retryOperation(operation);

  expect(result).toBe('success');
  expect(attempts).toBe(3);
});
```

**要求：**
- 一个行为
- 清晰命名
- 使用真实代码（除非不可避免才用mock）

### 验证 RED - 看它失败

**必须执行，不能跳过：**

```bash
npm test path/to/test.test.ts
```

确认：
- 测试失败（不是报错）
- 失败信息是预期的
- 因为功能缺失而失败（不是拼写错误）

**测试通过了？** 你在测试已有功能，修正测试。

### GREEN - 最小代码

写最简单的代码让测试通过：

```typescript
async function retryOperation<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; i < 3; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === 2) throw e;
    }
  }
  throw new Error('unreachable');
}
```

不要添加额外功能、重构其他代码、或"改进"超出测试范围。

### 验证 GREEN - 看它通过

**必须执行：**

```bash
npm test path/to/test.test.ts
```

确认：
- 测试通过
- 其他测试仍通过
- 输出干净（无错误、警告）

### REFACTOR - 清理

仅在GREEN之后：
- 移除重复
- 改进命名
- 提取辅助函数

保持测试绿色，不要添加行为。

## 常见借口与现实

| 借口 | 现实 |
|------|------|
| "太简单不用测" | 简单代码也会出错，测试只需30秒 |
| "之后再测" | 立即通过的测试什么都证明不了 |
| "已经手动测过了" | 临时测试≠系统化测试，没记录，无法重跑 |
| "删掉X小时工作太浪费" | 沉没成本谬误，保留未验证代码才是技术债 |
| "TDD会拖慢我" | TDD比调试快，务实=先测试 |

## 红旗 - 停下来重新开始

- 先写代码后写测试
- 测试立即通过
- 无法解释测试为何失败
- "以后再加测试"
- 在合理化"就这一次"
- "我已经手动测过了"
- "保留作参考"

**所有这些都意味着：删除代码，用TDD重新开始。**

## Bug修复示例

**Bug:** 空邮箱被接受

**RED**
```typescript
test('rejects empty email', async () => {
  const result = await submitForm({ email: '' });
  expect(result.error).toBe('Email required');
});
```

**验证RED** → 失败

**GREEN**
```typescript
function submitForm(data: FormData) {
  if (!data.email?.trim()) {
    return { error: 'Email required' };
  }
  // ...
}
```

**验证GREEN** → 通过

## 验证清单

完成前检查：

- [ ] 每个新函数/方法都有测试
- [ ] 在实现前看到每个测试失败
- [ ] 每个测试因预期原因失败（功能缺失，非拼写错误）
- [ ] 写了最小代码让测试通过
- [ ] 所有测试通过
- [ ] 输出干净（无错误、警告）
- [ ] 测试使用真实代码（仅必要时用mock）
- [ ] 覆盖边界情况和错误处理
