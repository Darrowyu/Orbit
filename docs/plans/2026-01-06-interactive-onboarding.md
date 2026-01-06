# 交互式用户引导 实施计划

**目标：** 将静态弹窗引导重构为交互式引导，高亮真实界面元素，引导用户实际操作

**架构：** 使用 react-joyride 实现交互式引导，通过 Zustand 管理引导状态，支持在设置中重新触发引导

**技术栈：** React, TypeScript, react-joyride, Zustand, TailwindCSS

---

## 任务 1: 安装 react-joyride 依赖

**文件：**
- 修改: `frontend/package.json`

**步骤1: 安装依赖**

```bash
cd frontend && npm install react-joyride
```

**步骤2: 验证安装**

```bash
npm list react-joyride
```
预期: 显示 react-joyride@x.x.x

**步骤3: 提交**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: add react-joyride for interactive onboarding"
```

---

## 任务 2: 为引导目标元素添加 ID

**文件：**
- 修改: `frontend/src/components/FilterBar.tsx`
- 修改: `frontend/src/components/KanbanBoard.tsx`
- 修改: `frontend/src/components/layout/IconRail.tsx`

**步骤1: 在 FilterBar.tsx 添加新建任务按钮 ID**

找到新建任务按钮（约第55行），添加 `id="onboarding-new-task"`：

```tsx
<Button 
  id="onboarding-new-task"
  onClick={onNewTask} 
  size="sm"
  className="w-full sm:w-auto"
  leftIcon={...}
>
  新建任务
</Button>
```

**步骤2: 在 KanbanBoard.tsx 添加看板列 ID**

找到 COLUMN_CONFIG 渲染的列容器（约第101行），为第一列添加 ID：

```tsx
<div 
  key={col.id} 
  id={col.id === TaskStatus.TODO ? 'onboarding-kanban-column' : undefined}
  className="w-[280px] sm:w-[300px] ..."
>
```

**步骤3: 在 IconRail.tsx 添加设置按钮 ID**

找到设置按钮，添加 `id="onboarding-settings"`：

```tsx
<button
  id="onboarding-settings"
  onClick={onSettings}
  className="..."
>
```

**步骤4: 提交**

```bash
git add frontend/src/components/FilterBar.tsx frontend/src/components/KanbanBoard.tsx frontend/src/components/layout/IconRail.tsx
git commit -m "feat(onboarding): add IDs to target elements for interactive guide"
```

---

## 任务 3: 创建引导状态 Store

**文件：**
- 创建: `frontend/src/stores/onboardingStore.ts`

**步骤1: 创建 Store 文件**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnboardingStore {
  isRunning: boolean;
  stepIndex: number;
  hasCompletedOnce: boolean;
  startTour: () => void;
  stopTour: () => void;
  setStepIndex: (index: number) => void;
  completeTour: () => void;
  resetTour: () => void;
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      isRunning: false,
      stepIndex: 0,
      hasCompletedOnce: false,
      startTour: () => set({ isRunning: true, stepIndex: 0 }),
      stopTour: () => set({ isRunning: false }),
      setStepIndex: (index) => set({ stepIndex: index }),
      completeTour: () => set({ isRunning: false, stepIndex: 0, hasCompletedOnce: true }),
      resetTour: () => set({ hasCompletedOnce: false }),
    }),
    { name: 'orbit-onboarding' }
  )
);
```

**步骤2: 提交**

```bash
git add frontend/src/stores/onboardingStore.ts
git commit -m "feat(onboarding): add onboarding state store"
```

---

## 任务 4: 重构 OnboardingGuide 组件

**文件：**
- 修改: `frontend/src/components/OnboardingGuide.tsx`

**步骤1: 替换为交互式引导组件**

```tsx
import React, { useCallback, useEffect } from 'react';
import Joyride, { CallBackProps, ACTIONS, EVENTS, STATUS, Step } from 'react-joyride';
import { useOnboardingStore } from '../stores/onboardingStore';
import { userApi } from '../services/api';

const STEPS: Step[] = [
  {
    target: '#onboarding-new-task',
    title: '创建任务',
    content: '点击这里创建新任务，输入标题后可使用 AI 自动填充描述和子任务',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '#onboarding-kanban-column',
    title: '看板管理',
    content: '将任务卡片拖拽到不同列来更新状态，从「待处理」到「已完成」',
    placement: 'right',
  },
  {
    target: '#onboarding-settings',
    title: '团队设置',
    content: '在这里管理团队成员、邀请新成员加入，以及配置团队设置',
    placement: 'right',
  },
];

const JOYRIDE_STYLES = {
  options: {
    arrowColor: '#fff',
    backgroundColor: '#fff',
    overlayColor: 'rgba(0, 0, 0, 0.6)',
    primaryColor: '#001C3D',
    textColor: '#334155',
    spotlightShadow: '0 0 15px rgba(0, 0, 0, 0.3)',
    width: 380,
    zIndex: 10000,
  },
  buttonNext: { backgroundColor: '#001C3D', fontSize: '14px', fontWeight: 500, padding: '8px 16px', borderRadius: '8px' },
  buttonBack: { color: '#64748B', marginRight: 'auto', fontSize: '14px' },
  buttonSkip: { color: '#94A3B8', fontSize: '14px' },
  tooltip: { borderRadius: '12px', padding: '20px' },
  tooltipTitle: { fontSize: '18px', fontWeight: 600, marginBottom: '8px' },
  tooltipContent: { fontSize: '14px', lineHeight: '1.6' },
};

const LOCALE = {
  back: '上一步',
  close: '关闭',
  last: '开始使用',
  next: '下一步',
  skip: '跳过引导',
};

interface Props { onComplete: () => void; }

export const OnboardingGuide: React.FC<Props> = ({ onComplete }) => {
  const { isRunning, stepIndex, startTour, stopTour, setStepIndex, completeTour } = useOnboardingStore();

  useEffect(() => { startTour(); }, [startTour]);

  const handleCallback = useCallback(async (data: CallBackProps) => {
    const { action, index, status, type } = data;

    if ([EVENTS.STEP_AFTER, EVENTS.TARGET_NOT_FOUND].includes(type as typeof EVENTS.STEP_AFTER)) {
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as typeof STATUS.FINISHED)) {
      await userApi.completeOnboarding();
      completeTour();
      onComplete();
    }
  }, [setStepIndex, completeTour, onComplete]);

  return (
    <Joyride
      callback={handleCallback}
      continuous
      run={isRunning}
      stepIndex={stepIndex}
      steps={STEPS}
      showSkipButton
      showProgress
      hideCloseButton={false}
      scrollToFirstStep
      disableOverlayClose
      spotlightPadding={8}
      styles={JOYRIDE_STYLES}
      locale={LOCALE}
    />
  );
};
```

**步骤2: 提交**

```bash
git add frontend/src/components/OnboardingGuide.tsx
git commit -m "feat(onboarding): refactor to interactive guide with react-joyride"
```

---

## 任务 5: 在 TeamSettings 添加「重新查看引导」入口

**文件：**
- 修改: `frontend/src/components/TeamSettings.tsx`

**步骤1: 导入 onboardingStore**

在文件顶部添加：

```tsx
import { useOnboardingStore } from '../stores/onboardingStore';
```

**步骤2: 获取 store 方法**

在组件内部添加：

```tsx
const { startTour, resetTour } = useOnboardingStore();
```

**步骤3: 添加重新查看引导按钮**

在关闭按钮上方（`<Button variant="ghost" onClick={onClose}` 之前）添加：

```tsx
<Button 
  variant="secondary" 
  onClick={() => { resetTour(); startTour(); onClose(); }} 
  isFullWidth
  leftIcon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
>
  重新查看引导
</Button>
```

**步骤4: 提交**

```bash
git add frontend/src/components/TeamSettings.tsx
git commit -m "feat(onboarding): add restart tour button in team settings"
```

---

## 任务 6: 更新 App.tsx 集成逻辑

**文件：**
- 修改: `frontend/src/App.tsx`

**步骤1: 导入 onboardingStore**

```tsx
import { useOnboardingStore } from './stores/onboardingStore';
```

**步骤2: 获取引导状态**

在组件内部添加：

```tsx
const { isRunning: showOnboardingTour } = useOnboardingStore();
```

**步骤3: 修改引导渲染逻辑**

将原来的：

```tsx
{showOnboarding && <OnboardingGuide onComplete={() => { setShowOnboarding(false); updateUser({ isFirstLogin: false }); }} />}
```

改为：

```tsx
{(showOnboarding || showOnboardingTour) && <OnboardingGuide onComplete={() => { setShowOnboarding(false); updateUser({ isFirstLogin: false }); }} />}
```

**步骤4: 提交**

```bash
git add frontend/src/App.tsx
git commit -m "feat(onboarding): integrate onboarding store with app"
```

---

## 任务 7: 添加键盘快捷键支持

**文件：**
- 修改: `frontend/src/components/OnboardingGuide.tsx`

**步骤1: 添加 ESC 键监听**

在 OnboardingGuide 组件中添加 useEffect：

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isRunning) {
      userApi.completeOnboarding();
      completeTour();
      onComplete();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isRunning, completeTour, onComplete]);
```

**步骤2: 提交**

```bash
git add frontend/src/components/OnboardingGuide.tsx
git commit -m "feat(onboarding): add ESC key support to skip guide"
```

---

## 任务 8: 构建验证

**步骤1: 运行构建检查**

```bash
cd frontend && npm run build
```

预期: 无错误，构建成功

**步骤2: 修复任何类型错误（如有）**

---

## 任务 9: 功能测试

**测试用例：**

1. **首次登录引导**
   - 新用户注册后，应自动显示交互式引导
   - 引导高亮新建任务按钮、看板列、设置按钮
   - 点击「下一步」切换步骤
   - 点击「跳过引导」或完成后，引导消失

2. **重新查看引导**
   - 打开团队设置
   - 点击「重新查看引导」按钮
   - 引导重新启动

3. **键盘操作**
   - 按 ESC 键可跳过引导

4. **刷新保持**
   - 引导中途刷新页面，应从当前步骤继续（而非重新开始）

---

## 文件变更总结

| 文件 | 操作 | 说明 |
|------|------|------|
| `frontend/package.json` | 修改 | 添加 react-joyride 依赖 |
| `frontend/src/stores/onboardingStore.ts` | 新建 | 引导状态管理 |
| `frontend/src/components/OnboardingGuide.tsx` | 重构 | 交互式引导组件 |
| `frontend/src/components/FilterBar.tsx` | 修改 | 添加 ID |
| `frontend/src/components/KanbanBoard.tsx` | 修改 | 添加 ID |
| `frontend/src/components/layout/IconRail.tsx` | 修改 | 添加 ID |
| `frontend/src/components/TeamSettings.tsx` | 修改 | 添加重新引导按钮 |
| `frontend/src/App.tsx` | 修改 | 集成 onboardingStore |
