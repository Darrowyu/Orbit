---
name: component-development
description: 企业级React组件开发指南。涵盖组件设计模式、TypeScript类型系统、性能优化、可复用性架构。适用于创建UI组件、业务组件、复合组件时使用。
---

React + TypeScript 企业级组件开发规范，专为本项目技术栈（React 18 + TypeScript + TailwindCSS + Shadcn UI + CVA）优化。

## 组件分类与职责

### 1. UI基础组件 (`components/ui/`)
原子级可复用组件，无业务逻辑：
```tsx
// 使用CVA管理变体 + forwardRef暴露ref
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const componentVariants = cva('base-classes', {
  variants: {
    variant: { default: '...', primary: '...', destructive: '...' },
    size: { sm: '...', default: '...', lg: '...' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

interface ComponentProps extends React.HTMLAttributes<HTMLElement>, VariantProps<typeof componentVariants> {
  asChild?: boolean; // Radix Slot模式
}

const Component = React.forwardRef<HTMLElement, ComponentProps>(
  ({ className, variant, size, ...props }, ref) => (
    <element ref={ref} className={cn(componentVariants({ variant, size }), className)} {...props} />
  )
);
Component.displayName = 'Component';
```

### 2. 业务组件 (`components/views/*/components/`)
封装特定业务逻辑，可包含状态和副作用：
```tsx
interface BusinessComponentProps {
  data: DataType;        // 必须的数据
  onAction?: () => void; // 可选回调
  className?: string;    // 样式扩展点
}

export const BusinessComponent: React.FC<BusinessComponentProps> = ({ data, onAction, className }) => {
  // 业务逻辑
  return <div className={cn('default-styles', className)}>...</div>;
};
```

### 3. 视图组件 (`components/views/*.tsx`)
页面级组件，组合多个子组件：
```tsx
export const SomeView: React.FC = () => {
  const [state, setState] = useState();
  // 数据获取、状态管理
  return (
    <div className="space-y-6">
      <Header />
      <Content data={state} />
      <Footer />
    </div>
  );
};
```

## TypeScript 类型规范

### Props类型定义
```tsx
// 继承原生HTML属性
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'destructive';
  isLoading?: boolean;
}

// 复杂数据使用interface
interface UserCardProps {
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}

// 泛型组件
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
}

export const List = <T,>({ items, renderItem, keyExtractor }: ListProps<T>) => (
  <ul>{items.map((item, i) => <li key={keyExtractor(item)}>{renderItem(item, i)}</li>)}</ul>
);
```

### 类型导出规范
```tsx
// 组件文件底部统一导出类型
export type { ComponentProps, ComponentVariant };
```

## 组件设计模式

### 1. 复合组件模式（Compound Components）
```tsx
// 父组件提供Context
const TabsContext = React.createContext<TabsContextValue | null>(null);

const Tabs: React.FC<TabsProps> & {
  List: typeof TabsList;
  Trigger: typeof TabsTrigger;
  Content: typeof TabsContent;
} = ({ children, defaultValue, ...props }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div {...props}>{children}</div>
    </TabsContext.Provider>
  );
};

// 子组件消费Context
const TabsTrigger: React.FC<TabsTriggerProps> = ({ value, children }) => {
  const { activeTab, setActiveTab } = useContext(TabsContext)!;
  return <button onClick={() => setActiveTab(value)} data-active={activeTab === value}>{children}</button>;
};

Tabs.List = TabsList;
Tabs.Trigger = TabsTrigger;
Tabs.Content = TabsContent;
```

### 2. 受控/非受控模式
```tsx
interface InputProps {
  value?: string;           // 受控
  defaultValue?: string;    // 非受控
  onChange?: (value: string) => void;
}

const Input: React.FC<InputProps> = ({ value, defaultValue, onChange }) => {
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) setInternalValue(e.target.value);
    onChange?.(e.target.value);
  };
  
  return <input value={currentValue} onChange={handleChange} />;
};
```

### 3. Render Props / Children as Function
```tsx
interface DataFetcherProps<T> {
  url: string;
  children: (data: T | null, loading: boolean, error: Error | null) => React.ReactNode;
}

const DataFetcher = <T,>({ url, children }: DataFetcherProps<T>) => {
  const { data, loading, error } = useFetch<T>(url);
  return <>{children(data, loading, error)}</>;
};
```

## 性能优化

### 1. React.memo 使用时机
```tsx
// 适用：接收复杂对象props、列表项组件、纯展示组件
const ExpensiveItem = React.memo<ItemProps>(({ item, onSelect }) => {
  return <div onClick={() => onSelect(item.id)}>{item.name}</div>;
});

// 自定义比较函数
const MemoizedComponent = React.memo(Component, (prevProps, nextProps) => {
  return prevProps.id === nextProps.id && prevProps.version === nextProps.version;
});
```

### 2. useCallback / useMemo
```tsx
const ParentComponent: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  
  // 稳定回调引用，避免子组件重渲染
  const handleSelect = useCallback((id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, selected: true } : item));
  }, []);
  
  // 缓存计算结果
  const selectedCount = useMemo(() => items.filter(i => i.selected).length, [items]);
  
  return <List items={items} onSelect={handleSelect} count={selectedCount} />;
};
```

### 3. 列表渲染优化
```tsx
// 使用稳定唯一key，禁止使用index
{items.map(item => <Item key={item.id} {...item} />)}

// 大列表使用虚拟滚动（推荐 @tanstack/react-virtual）
import { useVirtualizer } from '@tanstack/react-virtual';
```

## 样式规范

### TailwindCSS + cn() 工具
```tsx
import { cn } from '@/lib/utils';

// 合并className，支持条件样式
<div className={cn(
  'base-class',
  variant === 'primary' && 'bg-[#1E4B8E] text-white',
  disabled && 'opacity-50 cursor-not-allowed',
  className // 外部传入的className
)} />
```

### 项目配色
```tsx
// 主色调（使用项目定义的颜色）
'bg-[#1E4B8E]'  // 主蓝色
'bg-[#5B9BD5]'  // 次蓝色
'text-slate-900' // 主文字
'text-slate-500' // 次文字
'border-slate-200' // 边框

// 状态颜色
'text-emerald-600' // 成功/正向
'text-red-500'     // 错误/风险
'text-amber-500'   // 警告
```

## 响应式布局

### 断点系统（TailwindCSS）
```
sm:  640px   - 小屏手机横屏/大屏手机
md:  768px   - 平板竖屏
lg:  1024px  - 平板横屏/小笔记本（侧边栏切换点）
xl:  1280px  - 桌面显示器
2xl: 1536px  - 大屏显示器
```

### 布局架构模式

#### 侧边栏响应式（MainLayout）
```tsx
// 桌面端：固定侧边栏
// 移动端：抽屉式侧边栏 + 遮罩层 + 汉堡菜单

// 侧边栏容器
<div className={`
  fixed top-0 left-0 z-50 h-screen
  lg:translate-x-0 lg:static lg:z-auto      // 桌面端固定显示
  ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}  // 移动端滑入滑出
`}>

// 遮罩层（仅移动端）
<div className="sidebar-overlay lg:hidden" onClick={closeSidebar} />

// 汉堡菜单（仅移动端）
<button className="lg:hidden">
  <Menu className="w-6 h-6" />
</button>
```

#### 顶部工具栏响应式
```tsx
<div className="flex items-center px-4 sm:px-6 py-3">
  {/* 移动端汉堡菜单 */}
  <button className="lg:hidden">...</button>

  {/* 移动端居中Logo */}
  <div className="lg:hidden flex-1 text-center">Logo</div>

  {/* 桌面端占位推右 */}
  <div className="hidden lg:block flex-1" />

  {/* 右侧工具栏（两端通用） */}
  <div className="flex items-center gap-2 sm:gap-3">
    <LanguageToggle />
    <NotificationDropdown />
  </div>
</div>
```

### 常用响应式模式

#### 1. 方向切换（垂直→水平）
```tsx
// 移动端垂直排列，桌面端水平排列
<div className="flex flex-col sm:flex-row gap-4">
  <Button className="w-full sm:w-auto">按钮1</Button>
  <Button className="w-full sm:w-auto">按钮2</Button>
</div>
```

#### 2. 响应式网格
```tsx
// 1列 → 2列 → 3列 → 4列
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {items.map(item => <Card key={item.id} />)}
</div>

// 使用预定义工具类
<div className="card-grid">...</div>      // 1→2→3→4列
<div className="card-grid-dense">...</div> // 2→3→4→6列
```

#### 3. 响应式文字
```tsx
// 标题
<h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">标题</h1>

// 正文
<p className="text-sm sm:text-base">正文内容</p>

// 标签/辅助文字
<span className="text-xs sm:text-sm text-slate-500">辅助信息</span>
```

#### 4. 响应式间距
```tsx
// 内边距
<div className="p-4 sm:p-6 lg:p-8">...</div>

// 外边距/间隙
<div className="space-y-4 sm:space-y-6">...</div>
<div className="gap-3 sm:gap-4 lg:gap-6">...</div>

// 使用预定义工具类
<div className="section-spacing">...</div>  // py-4 sm:py-6 lg:py-8
```

#### 5. 条件显示/隐藏
```tsx
// 移动端隐藏
<div className="hidden sm:block">桌面端内容</div>

// 桌面端隐藏
<div className="sm:hidden">移动端内容</div>

// 仅在特定断点显示
<div className="hidden md:block lg:hidden">仅平板显示</div>
```

#### 6. 响应式表单
```tsx
// 两列表单
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div><Label>字段1</Label><Input /></div>
  <div><Label>字段2</Label><Input /></div>
</div>

// 三列表单
<div className="form-grid-3">...</div>  // 1→2→3列
```

#### 7. 响应式表格
```tsx
// 可滚动表格容器
<div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
  <Table>...</Table>
</div>

// 或使用工具类
<div className="table-responsive">
  <Table>...</Table>
</div>
```

### 预定义工具类（index.css）

```css
/* 响应式卡片网格 */
.card-grid { @apply grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4; }
.card-grid-dense { @apply grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6; }

/* 内容容器 */
.content-container { @apply w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8; }

/* 响应式间距 */
.section-spacing { @apply py-4 sm:py-6 lg:py-8; }

/* 按钮组响应式 */
.button-group-responsive { @apply flex flex-col sm:flex-row gap-2 sm:gap-3; }

/* 表单网格 */
.form-grid { @apply grid gap-4 grid-cols-1 sm:grid-cols-2; }
.form-grid-3 { @apply grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3; }

/* 表格响应式容器 */
.table-responsive { @apply w-full overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0; }

/* 触摸友好尺寸 (最小44px) */
.touch-target { @apply min-h-[44px] min-w-[44px]; }

/* 安全区域（刘海屏/底部手势条） */
.safe-area-bottom { padding-bottom: env(safe-area-inset-bottom, 0); }
.safe-area-top { padding-top: env(safe-area-inset-top, 0); }

/* 隐藏滚动条 */
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
.scrollbar-hide::-webkit-scrollbar { display: none; }

/* 侧边栏遮罩层 */
.sidebar-overlay { @apply fixed inset-0 bg-black/50 z-40 transition-opacity duration-300; }
```

### 响应式检查清单

- [ ] 所有交互元素至少44x44px（touch-target）
- [ ] 文字在小屏幕可读（最小14px）
- [ ] 按钮组在移动端垂直排列且全宽
- [ ] 表格在小屏幕可横向滚动
- [ ] 侧边栏在移动端为抽屉式
- [ ] 间距在不同断点适当缩放
- [ ] 网格列数随屏幕宽度调整
- [ ] 考虑安全区域（刘海屏、底部手势条）
- [ ] 关键操作按钮在移动端易于触达

## 组件文件结构

```
components/
├── ui/                          # UI基础组件
│   ├── button.tsx
│   ├── input.tsx
│   └── index.ts                 # 统一导出
├── views/
│   └── some-feature/
│       ├── SomeFeatureView.tsx  # 主视图
│       └── components/          # 视图专属子组件
│           ├── FeatureCard.tsx
│           └── FeatureList.tsx
└── layout/                      # 布局组件
    ├── Header.tsx
    └── Sidebar.tsx
```

## 可访问性(a11y)

```tsx
// 交互元素必须有标签
<button aria-label="关闭对话框" onClick={onClose}>
  <XIcon />
</button>

// 表单关联label
<label htmlFor="email">邮箱</label>
<input id="email" type="email" />

// 动态内容通知
<div role="alert" aria-live="polite">{errorMessage}</div>

// 键盘导航支持
<button onKeyDown={(e) => e.key === 'Enter' && handleAction()}>
```

## 组件检查清单

开发新组件前确认：
- [ ] Props类型定义完整，必要属性无`?`
- [ ] 使用`forwardRef`暴露ref（UI组件）
- [ ] className支持外部扩展
- [ ] 使用CVA管理变体（如有多种样式）
- [ ] React.memo优化（列表项/复杂组件）
- [ ] 回调使用useCallback包裹
- [ ] displayName已设置（forwardRef组件）
- [ ] 遵循项目配色和间距规范
- [ ] 考虑加载/空/错误状态
- [ ] 基础a11y支持（aria-label等）
