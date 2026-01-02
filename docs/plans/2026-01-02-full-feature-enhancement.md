# Orbit 全功能增强实施计划

**目标：** 补齐任务协作平台核心功能，包括标签系统、全局搜索、任务附件、日历视图、里程碑、@提及、自定义看板、任务模板、时间追踪、甘特图、报表、重复任务等。

**架构：** 采用增量迭代方式，分4个阶段实施。后端使用 NestJS + Prisma，前端使用 React + Zustand，保持现有设计系统风格。

**技术栈：** NestJS, Prisma, PostgreSQL, React 18, TypeScript, Zustand, TailwindCSS, Socket.io

---

## 第一阶段：标签系统 + 全局搜索 + 任务附件（2周）

### 任务 1.1: 标签系统 - 数据库模型

**文件：**
- 修改: `backend/prisma/schema.prisma`

**步骤1: 添加 Label 模型**

```prisma
model Label {
  id        String   @id @default(cuid())
  name      String
  color     String   @default("#6366f1")
  teamId    String
  team      Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  tasks     TaskLabel[]
  createdAt DateTime @default(now())
  @@unique([teamId, name])
  @@index([teamId])
}

model TaskLabel {
  id      String @id @default(cuid())
  taskId  String
  task    Task   @relation(fields: [taskId], references: [id], onDelete: Cascade)
  labelId String
  label   Label  @relation(fields: [labelId], references: [id], onDelete: Cascade)
  @@unique([taskId, labelId])
}
```

**步骤2: 更新 Task 和 Team 模型关联**

在 Task 模型添加:
```prisma
labels    TaskLabel[]
```

在 Team 模型添加:
```prisma
labels    Label[]
```

**步骤3: 运行迁移**

```bash
cd backend && npx prisma migrate dev --name add_labels
```

---

### 任务 1.2: 标签系统 - 后端服务

**文件：**
- 创建: `backend/src/labels/labels.module.ts`
- 创建: `backend/src/labels/labels.service.ts`
- 创建: `backend/src/labels/labels.controller.ts`
- 创建: `backend/src/labels/dto/create-label.dto.ts`
- 修改: `backend/src/app.module.ts`

**步骤1: 创建 DTO**

```typescript
// backend/src/labels/dto/create-label.dto.ts
import { IsString, IsOptional, Matches } from 'class-validator';

export class CreateLabelDto {
  @IsString()
  name: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;
}

export class UpdateLabelDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;
}
```

**步骤2: 创建 Service**

```typescript
// backend/src/labels/labels.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLabelDto, UpdateLabelDto } from './dto/create-label.dto';

@Injectable()
export class LabelsService {
  constructor(private prisma: PrismaService) {}

  async create(teamId: string, dto: CreateLabelDto) {
    const exists = await this.prisma.label.findUnique({ where: { teamId_name: { teamId, name: dto.name } } });
    if (exists) throw new ConflictException('标签名已存在');
    return this.prisma.label.create({ data: { ...dto, teamId } });
  }

  async findAll(teamId: string) {
    return this.prisma.label.findMany({ where: { teamId }, orderBy: { createdAt: 'asc' } });
  }

  async update(id: string, teamId: string, dto: UpdateLabelDto) {
    const label = await this.prisma.label.findFirst({ where: { id, teamId } });
    if (!label) throw new NotFoundException('标签不存在');
    if (dto.name) {
      const exists = await this.prisma.label.findFirst({ where: { teamId, name: dto.name, NOT: { id } } });
      if (exists) throw new ConflictException('标签名已存在');
    }
    return this.prisma.label.update({ where: { id }, data: dto });
  }

  async delete(id: string, teamId: string) {
    const label = await this.prisma.label.findFirst({ where: { id, teamId } });
    if (!label) throw new NotFoundException('标签不存在');
    return this.prisma.label.delete({ where: { id } });
  }

  async addToTask(taskId: string, labelId: string) {
    return this.prisma.taskLabel.create({ data: { taskId, labelId } });
  }

  async removeFromTask(taskId: string, labelId: string) {
    return this.prisma.taskLabel.delete({ where: { taskId_labelId: { taskId, labelId } } });
  }

  async getTaskLabels(taskId: string) {
    return this.prisma.taskLabel.findMany({ where: { taskId }, include: { label: true } });
  }
}
```

**步骤3: 创建 Controller**

```typescript
// backend/src/labels/labels.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LabelsService } from './labels.service';
import { CreateLabelDto, UpdateLabelDto } from './dto/create-label.dto';

@Controller('labels')
@UseGuards(JwtAuthGuard)
export class LabelsController {
  constructor(private service: LabelsService) {}

  @Post()
  create(@Req() req, @Body() dto: CreateLabelDto) {
    return this.service.create(req.user.currentTeamId, dto);
  }

  @Get()
  findAll(@Req() req) {
    return this.service.findAll(req.user.currentTeamId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Req() req, @Body() dto: UpdateLabelDto) {
    return this.service.update(id, req.user.currentTeamId, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req) {
    return this.service.delete(id, req.user.currentTeamId);
  }

  @Post('task/:taskId/:labelId')
  addToTask(@Param('taskId') taskId: string, @Param('labelId') labelId: string) {
    return this.service.addToTask(taskId, labelId);
  }

  @Delete('task/:taskId/:labelId')
  removeFromTask(@Param('taskId') taskId: string, @Param('labelId') labelId: string) {
    return this.service.removeFromTask(taskId, labelId);
  }
}
```

**步骤4: 创建 Module 并注册**

```typescript
// backend/src/labels/labels.module.ts
import { Module } from '@nestjs/common';
import { LabelsService } from './labels.service';
import { LabelsController } from './labels.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LabelsController],
  providers: [LabelsService],
  exports: [LabelsService],
})
export class LabelsModule {}
```

在 app.module.ts imports 数组添加 `LabelsModule`

**步骤5: 提交**

```bash
git add backend/src/labels backend/prisma/schema.prisma backend/src/app.module.ts
git commit -m "feat(labels): 添加标签系统后端"
```

---

### 任务 1.3: 标签系统 - 前端组件

**文件：**
- 创建: `frontend/src/components/ui/Tag.tsx`
- 创建: `frontend/src/components/LabelManager.tsx`
- 创建: `frontend/src/stores/labelStore.ts`
- 修改: `frontend/src/services/api.ts`
- 修改: `frontend/src/types.ts`

**步骤1: 添加类型定义**

```typescript
// frontend/src/types.ts 添加
export interface Label {
  id: string;
  name: string;
  color: string;
  teamId: string;
  createdAt: string;
}

export interface TaskLabel {
  id: string;
  taskId: string;
  labelId: string;
  label: Label;
}
```

**步骤2: 创建 Tag UI 组件**

```typescript
// frontend/src/components/ui/Tag.tsx
import React from 'react';

interface TagProps {
  color: string;
  children: React.ReactNode;
  onRemove?: () => void;
  size?: 'sm' | 'md';
  className?: string;
}

export const Tag: React.FC<TagProps> = ({ color, children, onRemove, size = 'sm', className = '' }) => {
  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  return (
    <span 
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeStyles} ${className}`}
      style={{ backgroundColor: `${color}20`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {children}
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 hover:opacity-70 transition-opacity">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
};
```

**步骤3: 创建 labelStore**

```typescript
// frontend/src/stores/labelStore.ts
import { create } from 'zustand';
import { Label } from '../types';

interface LabelState {
  labels: Label[];
  isLoading: boolean;
  setLabels: (labels: Label[]) => void;
  addLabel: (label: Label) => void;
  updateLabel: (id: string, data: Partial<Label>) => void;
  removeLabel: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useLabelStore = create<LabelState>((set) => ({
  labels: [],
  isLoading: false,
  setLabels: (labels) => set({ labels }),
  addLabel: (label) => set((s) => ({ labels: [...s.labels, label] })),
  updateLabel: (id, data) => set((s) => ({ labels: s.labels.map((l) => l.id === id ? { ...l, ...data } : l) })),
  removeLabel: (id) => set((s) => ({ labels: s.labels.filter((l) => l.id !== id) })),
  setLoading: (isLoading) => set({ isLoading }),
}));
```

**步骤4: 添加 API**

```typescript
// frontend/src/services/api.ts 添加
export const labelApi = {
  getAll: () => api.get<Label[]>('/labels'),
  create: (data: { name: string; color?: string }) => api.post<Label>('/labels', data),
  update: (id: string, data: { name?: string; color?: string }) => api.put<Label>(`/labels/${id}`, data),
  delete: (id: string) => api.delete(`/labels/${id}`),
  addToTask: (taskId: string, labelId: string) => api.post(`/labels/task/${taskId}/${labelId}`),
  removeFromTask: (taskId: string, labelId: string) => api.delete(`/labels/task/${taskId}/${labelId}`),
};
```

**步骤5: 创建标签管理组件**

```typescript
// frontend/src/components/LabelManager.tsx
import React, { useState } from 'react';
import { Modal, ModalFooter } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { Tag } from './ui/Tag';
import { useLabelStore } from '../stores/labelStore';
import { labelApi } from '../services/api';
import { Label } from '../types';

const PRESET_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'];

interface LabelManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LabelManager: React.FC<LabelManagerProps> = ({ isOpen, onClose }) => {
  const { labels, addLabel, updateLabel, removeLabel } = useLabelStore();
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      if (editId) {
        const { data } = await labelApi.update(editId, { name, color });
        updateLabel(editId, data);
        setEditId(null);
      } else {
        const { data } = await labelApi.create({ name, color });
        addLabel(data);
      }
      setName('');
      setColor(PRESET_COLORS[0]);
    } finally { setLoading(false); }
  };

  const handleEdit = (label: Label) => {
    setEditId(label.id);
    setName(label.name);
    setColor(label.color);
  };

  const handleDelete = async (id: string) => {
    await labelApi.delete(id);
    removeLabel(id);
    if (editId === id) { setEditId(null); setName(''); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="管理标签" size="sm">
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="标签名称" size="sm" className="flex-1" />
          <Button onClick={handleSubmit} isLoading={loading} size="sm">{editId ? '更新' : '添加'}</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-110'}`} style={{ backgroundColor: c }} />
          ))}
        </div>
        <div className="border-t border-slate-100 pt-4 space-y-2 max-h-60 overflow-y-auto">
          {labels.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">暂无标签</p>
          ) : labels.map((l) => (
            <div key={l.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg group">
              <Tag color={l.color}>{l.name}</Tag>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <IconButton size="sm" variant="ghost" onClick={() => handleEdit(l)}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </IconButton>
                <IconButton size="sm" variant="ghost" onClick={() => handleDelete(l.id)} className="text-red-500 hover:bg-red-50">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
```

**步骤6: 提交**

```bash
git add frontend/src/components/ui/Tag.tsx frontend/src/components/LabelManager.tsx frontend/src/stores/labelStore.ts frontend/src/services/api.ts frontend/src/types.ts
git commit -m "feat(labels): 添加标签系统前端组件"
```

---

### 任务 1.4: 全局搜索 - 后端

**文件：**
- 创建: `backend/src/search/search.module.ts`
- 创建: `backend/src/search/search.service.ts`
- 创建: `backend/src/search/search.controller.ts`

**步骤1: 创建搜索服务**

```typescript
// backend/src/search/search.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SearchResult {
  tasks: Array<{ id: string; title: string; description: string; status: string; projectId?: string }>;
  projects: Array<{ id: string; name: string; description: string }>;
  comments: Array<{ id: string; content: string; taskId: string; taskTitle: string }>;
}

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(teamId: string, query: string, limit = 10): Promise<SearchResult> {
    const q = `%${query}%`;
    
    const [tasks, projects, comments] = await Promise.all([
      this.prisma.task.findMany({
        where: { teamId, isArchived: false, OR: [{ title: { contains: query, mode: 'insensitive' } }, { description: { contains: query, mode: 'insensitive' } }] },
        select: { id: true, title: true, description: true, status: true, projectId: true },
        take: limit,
      }),
      this.prisma.project.findMany({
        where: { teamId, isArchived: false, OR: [{ name: { contains: query, mode: 'insensitive' } }, { description: { contains: query, mode: 'insensitive' } }] },
        select: { id: true, name: true, description: true },
        take: limit,
      }),
      this.prisma.comment.findMany({
        where: { task: { teamId }, content: { contains: query, mode: 'insensitive' } },
        select: { id: true, content: true, taskId: true, task: { select: { title: true } } },
        take: limit,
      }),
    ]);

    return {
      tasks,
      projects,
      comments: comments.map((c) => ({ id: c.id, content: c.content, taskId: c.taskId, taskTitle: c.task.title })),
    };
  }
}
```

**步骤2: 创建 Controller**

```typescript
// backend/src/search/search.controller.ts
import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SearchService } from './search.service';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private service: SearchService) {}

  @Get()
  search(@Req() req, @Query('q') query: string, @Query('limit') limit?: string) {
    if (!query || query.length < 2) return { tasks: [], projects: [], comments: [] };
    return this.service.search(req.user.currentTeamId, query, limit ? parseInt(limit) : 10);
  }
}
```

**步骤3: 创建 Module 并注册**

```typescript
// backend/src/search/search.module.ts
import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
```

**步骤4: 提交**

```bash
git add backend/src/search backend/src/app.module.ts
git commit -m "feat(search): 添加全局搜索后端"
```

---

### 任务 1.5: 全局搜索 - 前端组件

**文件：**
- 创建: `frontend/src/components/GlobalSearch.tsx`
- 修改: `frontend/src/components/Header.tsx`
- 修改: `frontend/src/services/api.ts`

**步骤1: 添加搜索 API**

```typescript
// frontend/src/services/api.ts 添加
export interface SearchResult {
  tasks: Array<{ id: string; title: string; description: string; status: string; projectId?: string }>;
  projects: Array<{ id: string; name: string; description: string }>;
  comments: Array<{ id: string; content: string; taskId: string; taskTitle: string }>;
}

export const searchApi = {
  search: (query: string, limit?: number) => api.get<SearchResult>('/search', { params: { q: query, limit } }),
};
```

**步骤2: 创建搜索组件**

```typescript
// frontend/src/components/GlobalSearch.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from './ui/Input';
import { searchApi, SearchResult } from '../services/api';
import { Badge } from './ui/Badge';

interface GlobalSearchProps {
  onSelectTask?: (taskId: string) => void;
  onSelectProject?: (projectId: string) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onSelectTask, onSelectProject }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const { data } = await searchApi.search(q);
      setResults(data);
      setIsOpen(true);
    } finally { setLoading(false); }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(v), 300);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasResults = results && (results.tasks.length || results.projects.length || results.comments.length);
  const statusMap: Record<string, 'default' | 'primary' | 'warning' | 'success'> = { TODO: 'default', IN_PROGRESS: 'primary', REVIEW: 'warning', DONE: 'success' };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <Input 
        value={query} 
        onChange={handleChange} 
        onFocus={() => results && setIsOpen(true)}
        placeholder="搜索任务、项目、评论..." 
        size="sm"
        leftIcon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
        rightIcon={loading ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : undefined}
      />
      {isOpen && hasResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50 max-h-96 overflow-y-auto animate-fade-in-down">
          {results.tasks.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-medium text-slate-400 px-2 py-1">任务</div>
              {results.tasks.map((t) => (
                <button key={t.id} onClick={() => { onSelectTask?.(t.id); setIsOpen(false); setQuery(''); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg flex items-center justify-between group">
                  <span className="text-sm text-slate-700 truncate">{t.title}</span>
                  <Badge variant={statusMap[t.status]} size="sm">{t.status}</Badge>
                </button>
              ))}
            </div>
          )}
          {results.projects.length > 0 && (
            <div className="p-2 border-t border-slate-100">
              <div className="text-xs font-medium text-slate-400 px-2 py-1">项目</div>
              {results.projects.map((p) => (
                <button key={p.id} onClick={() => { onSelectProject?.(p.id); setIsOpen(false); setQuery(''); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg">
                  <span className="text-sm text-slate-700">{p.name}</span>
                  {p.description && <span className="text-xs text-slate-400 ml-2 truncate">{p.description}</span>}
                </button>
              ))}
            </div>
          )}
          {results.comments.length > 0 && (
            <div className="p-2 border-t border-slate-100">
              <div className="text-xs font-medium text-slate-400 px-2 py-1">评论</div>
              {results.comments.map((c) => (
                <button key={c.id} onClick={() => { onSelectTask?.(c.taskId); setIsOpen(false); setQuery(''); }} className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg">
                  <span className="text-xs text-slate-500">在「{c.taskTitle}」中:</span>
                  <span className="text-sm text-slate-700 block truncate">{c.content}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {isOpen && query.length >= 2 && !hasResults && !loading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-100 p-4 text-center text-sm text-slate-400 z-50">
          未找到相关结果
        </div>
      )}
    </div>
  );
};
```

**步骤3: 集成到 Header**

在 Header.tsx 中导入并添加 GlobalSearch 组件

**步骤4: 提交**

```bash
git add frontend/src/components/GlobalSearch.tsx frontend/src/components/Header.tsx frontend/src/services/api.ts
git commit -m "feat(search): 添加全局搜索前端组件"
```

---

### 任务 1.6: 任务附件系统 - 数据库模型

**文件：**
- 修改: `backend/prisma/schema.prisma`

**步骤1: 添加 Attachment 模型**

```prisma
model Attachment {
  id          String   @id @default(cuid())
  filename    String
  originalName String
  mimeType    String
  size        Int
  url         String
  taskId      String
  task        Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  uploaderId  String
  createdAt   DateTime @default(now())
  @@index([taskId])
}
```

在 Task 模型添加:
```prisma
attachments Attachment[]
```

**步骤2: 运行迁移**

```bash
cd backend && npx prisma migrate dev --name add_attachments
```

---

### 任务 1.7: 任务附件系统 - 后端服务

**文件：**
- 创建: `backend/src/attachments/attachments.module.ts`
- 创建: `backend/src/attachments/attachments.service.ts`
- 创建: `backend/src/attachments/attachments.controller.ts`
- 修改: `backend/src/upload/upload.controller.ts`

**步骤1: 创建附件服务**

```typescript
// backend/src/attachments/attachments.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AttachmentsService {
  constructor(private prisma: PrismaService) {}

  async create(taskId: string, uploaderId: string, file: { filename: string; originalname: string; mimetype: string; size: number; path: string }) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('任务不存在');
    
    return this.prisma.attachment.create({
      data: {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: `/uploads/attachments/${file.filename}`,
        taskId,
        uploaderId,
      },
    });
  }

  async findByTask(taskId: string) {
    return this.prisma.attachment.findMany({ where: { taskId }, orderBy: { createdAt: 'desc' } });
  }

  async delete(id: string, userId: string) {
    const att = await this.prisma.attachment.findUnique({ where: { id } });
    if (!att) throw new NotFoundException('附件不存在');
    
    const filePath = path.join(process.cwd(), 'uploads/attachments', att.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    
    return this.prisma.attachment.delete({ where: { id } });
  }
}
```

**步骤2: 创建 Controller**

```typescript
// backend/src/attachments/attachments.controller.ts
import { Controller, Get, Post, Delete, Param, UseGuards, UseInterceptors, UploadedFile, Req, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AttachmentsService } from './attachments.service';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

const storage = diskStorage({
  destination: './uploads/attachments',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

@Controller('attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(private service: AttachmentsService) {}

  @Post(':taskId')
  @UseInterceptors(FileInterceptor('file', { storage, limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(@Param('taskId') taskId: string, @UploadedFile() file: Express.Multer.File, @Req() req) {
    if (!file) throw new BadRequestException('请选择文件');
    return this.service.create(taskId, req.user.id, file);
  }

  @Get(':taskId')
  findByTask(@Param('taskId') taskId: string) {
    return this.service.findByTask(taskId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req) {
    return this.service.delete(id, req.user.id);
  }
}
```

**步骤3: 创建 Module 并注册**

```typescript
// backend/src/attachments/attachments.module.ts
import { Module } from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { AttachmentsController } from './attachments.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
})
export class AttachmentsModule {}
```

**步骤4: 提交**

```bash
git add backend/src/attachments backend/prisma/schema.prisma backend/src/app.module.ts
git commit -m "feat(attachments): 添加任务附件后端"
```

---

### 任务 1.8: 任务附件系统 - 前端组件

**文件：**
- 创建: `frontend/src/components/AttachmentList.tsx`
- 修改: `frontend/src/services/api.ts`
- 修改: `frontend/src/types.ts`

**步骤1: 添加类型和 API**

```typescript
// types.ts 添加
export interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  taskId: string;
  uploaderId: string;
  createdAt: string;
}

// api.ts 添加
export const attachmentApi = {
  getByTask: (taskId: string) => api.get<Attachment[]>(`/attachments/${taskId}`),
  upload: (taskId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<Attachment>(`/attachments/${taskId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  delete: (id: string) => api.delete(`/attachments/${id}`),
};
```

**步骤2: 创建附件列表组件**

```typescript
// frontend/src/components/AttachmentList.tsx
import React, { useState, useRef } from 'react';
import { Attachment } from '../types';
import { attachmentApi } from '../services/api';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';

interface AttachmentListProps {
  taskId: string;
  attachments: Attachment[];
  onUpdate: (attachments: Attachment[]) => void;
  readonly?: boolean;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
  return '📎';
};

export const AttachmentList: React.FC<AttachmentListProps> = ({ taskId, attachments, onUpdate, readonly }) => {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await attachmentApi.upload(taskId, file);
      onUpdate([data, ...attachments]);
    } finally { 
      setUploading(false); 
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    await attachmentApi.delete(id);
    onUpdate(attachments.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-3">
      {!readonly && (
        <div>
          <input ref={fileRef} type="file" onChange={handleUpload} className="hidden" accept="*/*" />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} isLoading={uploading} leftIcon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>}>
            上传附件
          </Button>
          <p className="text-xs text-slate-400 mt-1">最大 10MB</p>
        </div>
      )}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((att) => (
            <div key={att.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg group">
              <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 overflow-hidden hover:text-[#001C3D]">
                <span className="text-lg">{getFileIcon(att.mimeType)}</span>
                <div className="overflow-hidden">
                  <span className="text-sm truncate block">{att.originalName}</span>
                  <span className="text-xs text-slate-400">{formatSize(att.size)}</span>
                </div>
              </a>
              {!readonly && (
                <IconButton size="sm" variant="ghost" onClick={() => handleDelete(att.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </IconButton>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

**步骤3: 提交**

```bash
git add frontend/src/components/AttachmentList.tsx frontend/src/services/api.ts frontend/src/types.ts
git commit -m "feat(attachments): 添加任务附件前端组件"
```

---

## 第二阶段：日历视图 + 里程碑 + @提及（2周）

### 任务 2.1: 日历视图 - 前端组件

**文件：**
- 创建: `frontend/src/components/CalendarView.tsx`
- 创建: `frontend/src/pages/CalendarPage.tsx`
- 修改: `frontend/src/App.tsx`

**步骤1: 创建日历视图组件**

```typescript
// frontend/src/components/CalendarView.tsx
import React, { useMemo, useState } from 'react';
import { Task, TaskStatus, Priority } from '../types';
import { Badge } from './ui/Badge';
import { IconButton } from './ui/IconButton';

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onDateChange?: (taskId: string, newDate: string) => void;
}

const DAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

export const CalendarView: React.FC<CalendarViewProps> = ({ tasks, onTaskClick, onDateChange }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const { year, month, days, firstDay, daysInMonth } = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const first = new Date(y, m, 1).getDay();
    const dim = new Date(y, m + 1, 0).getDate();
    const d: Date[] = [];
    for (let i = 1; i <= dim; i++) d.push(new Date(y, m, i));
    return { year: y, month: m, days: d, firstDay: first, daysInMonth: dim };
  }, [currentDate]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.filter(t => t.dueDate).forEach(t => {
      const key = new Date(t.dueDate!).toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tasks]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = new Date().toDateString();

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId && onDateChange) onDateChange(taskId, date.toISOString());
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDragStart = (e: React.DragEvent, taskId: string) => e.dataTransfer.setData('taskId', taskId);

  const priorityColors: Record<Priority, string> = { [Priority.HIGH]: 'bg-red-500', [Priority.MEDIUM]: 'bg-amber-500', [Priority.LOW]: 'bg-emerald-500' };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <IconButton variant="ghost" onClick={prevMonth}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </IconButton>
          <h2 className="text-lg font-semibold text-slate-900">{year}年 {MONTHS[month]}</h2>
          <IconButton variant="ghost" onClick={nextMonth}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </IconButton>
        </div>
        <button onClick={() => setCurrentDate(new Date())} className="text-sm text-[#001C3D] hover:underline">今天</button>
      </div>
      
      <div className="grid grid-cols-7">
        {DAYS.map(d => <div key={d} className="p-2 text-center text-xs font-medium text-slate-400 border-b border-slate-100">{d}</div>)}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-slate-100 bg-slate-50/50" />)}
        {days.map(date => {
          const key = date.toDateString();
          const dayTasks = tasksByDate[key] || [];
          const isToday = key === today;
          return (
            <div 
              key={key} 
              className={`min-h-[100px] border-b border-r border-slate-100 p-1 ${isToday ? 'bg-blue-50/50' : ''}`}
              onDrop={(e) => handleDrop(e, date)}
              onDragOver={handleDragOver}
            >
              <div className={`text-sm p-1 ${isToday ? 'bg-[#001C3D] text-white rounded-full w-6 h-6 flex items-center justify-center' : 'text-slate-600'}`}>
                {date.getDate()}
              </div>
              <div className="space-y-1 mt-1">
                {dayTasks.slice(0, 3).map(t => (
                  <div 
                    key={t.id} 
                    draggable 
                    onDragStart={(e) => handleDragStart(e, t.id)}
                    onClick={() => onTaskClick(t)}
                    className="text-xs p-1 rounded bg-white border border-slate-100 hover:shadow-sm cursor-pointer truncate flex items-center gap-1"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${priorityColors[t.priority]}`} />
                    <span className="truncate">{t.title}</span>
                  </div>
                ))}
                {dayTasks.length > 3 && <div className="text-xs text-slate-400 pl-1">+{dayTasks.length - 3} 更多</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

**步骤2: 提交**

```bash
git add frontend/src/components/CalendarView.tsx
git commit -m "feat(calendar): 添加日历视图组件"
```

---

### 任务 2.2: 里程碑系统 - 数据库模型

**文件：**
- 修改: `backend/prisma/schema.prisma`

**步骤1: 添加 Milestone 模型**

```prisma
model Milestone {
  id          String   @id @default(cuid())
  name        String
  description String   @default("")
  dueDate     DateTime
  status      String   @default("PENDING") // PENDING, COMPLETED
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  tasks       Task[]   @relation("MilestoneTasks")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([projectId])
}
```

在 Task 模型添加:
```prisma
milestoneId String?
milestone   Milestone? @relation("MilestoneTasks", fields: [milestoneId], references: [id], onDelete: SetNull)
```

在 Project 模型添加:
```prisma
milestones  Milestone[]
```

**步骤2: 运行迁移**

```bash
cd backend && npx prisma migrate dev --name add_milestones
```

---

### 任务 2.3: 里程碑系统 - 后端服务

**文件：**
- 创建: `backend/src/milestones/milestones.module.ts`
- 创建: `backend/src/milestones/milestones.service.ts`
- 创建: `backend/src/milestones/milestones.controller.ts`
- 创建: `backend/src/milestones/dto/milestone.dto.ts`

（后端实现类似标签系统，包含 CRUD 操作和任务关联）

---

### 任务 2.4: @提及功能 - 数据库模型

**文件：**
- 修改: `backend/prisma/schema.prisma`

**步骤1: 添加 Mention 模型**

```prisma
model Mention {
  id        String   @id @default(cuid())
  userId    String   // 被提及的用户
  user      User     @relation("MentionedUser", fields: [userId], references: [id], onDelete: Cascade)
  sourceType String  // TASK_DESCRIPTION, COMMENT
  sourceId   String
  createdAt DateTime @default(now())
  @@index([userId])
  @@index([sourceType, sourceId])
}
```

在 User 模型添加:
```prisma
mentions   Mention[] @relation("MentionedUser")
```

---

### 任务 2.5: @提及功能 - 前端组件

**文件：**
- 创建: `frontend/src/components/MentionInput.tsx`
- 创建: `frontend/src/hooks/useMention.ts`

**步骤1: 创建提及输入组件**

```typescript
// frontend/src/components/MentionInput.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { User } from '../types';
import { Avatar } from './ui/Avatar';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMention: (userIds: string[]) => void;
  members: User[];
  placeholder?: string;
  rows?: number;
  className?: string;
}

export const MentionInput: React.FC<MentionInputProps> = ({ value, onChange, onMention, members, placeholder, rows = 3, className = '' }) => {
  const [showSuggest, setShowSuggest] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionStart, setMentionStart] = useState(-1);

  const filtered = members.filter(m => m.name.toLowerCase().includes(query.toLowerCase()) || m.email.toLowerCase().includes(query.toLowerCase()));

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    const pos = e.target.selectionStart;
    onChange(v);

    // 检测 @ 触发
    const before = v.slice(0, pos);
    const atMatch = before.match(/@(\w*)$/);
    if (atMatch) {
      setMentionStart(pos - atMatch[0].length);
      setQuery(atMatch[1]);
      setShowSuggest(true);
      // 计算弹窗位置
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect();
        setPosition({ top: rect.height + 8, left: 0 });
      }
    } else {
      setShowSuggest(false);
    }
  };

  const selectMember = (m: User) => {
    const before = value.slice(0, mentionStart);
    const after = value.slice(textareaRef.current?.selectionStart || mentionStart);
    const newValue = `${before}@${m.name} ${after}`;
    onChange(newValue);
    setShowSuggest(false);
    
    // 提取所有被提及的用户
    const mentions = newValue.match(/@(\w+)/g) || [];
    const ids = mentions.map(m => members.find(u => `@${u.name}` === m)?.id).filter(Boolean) as string[];
    onMention([...new Set(ids)]);
    
    textareaRef.current?.focus();
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        placeholder={placeholder}
        rows={rows}
        className={`w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#001C3D]/20 focus:border-[#001C3D] resize-none ${className}`}
      />
      {showSuggest && filtered.length > 0 && (
        <div className="absolute z-50 bg-white rounded-lg shadow-lg border border-slate-100 max-h-48 overflow-y-auto w-64 animate-fade-in" style={{ top: position.top, left: position.left }}>
          {filtered.map(m => (
            <button key={m.id} onClick={() => selectMember(m)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 text-left">
              <Avatar src={m.avatar} fallback={m.avatar} size="sm" color={m.color} />
              <div>
                <div className="text-sm font-medium text-slate-700">{m.name}</div>
                <div className="text-xs text-slate-400">{m.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
```

---

## 第三阶段：自定义看板 + 任务模板 + 时间追踪（3周）

### 任务 3.1: 自定义看板列 - 数据库模型

**文件：**
- 修改: `backend/prisma/schema.prisma`

```prisma
model BoardColumn {
  id        String   @id @default(cuid())
  name      String
  color     String   @default("#6366f1")
  order     Int
  teamId    String
  team      Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  isDefault Boolean  @default(false)
  createdAt DateTime @default(now())
  @@index([teamId])
}
```

---

### 任务 3.2: 任务模板系统 - 数据库模型

```prisma
model TaskTemplate {
  id          String   @id @default(cuid())
  name        String
  title       String
  description String   @default("")
  priority    String   @default("MEDIUM")
  subtasks    Json     @default("[]") // [{title: string}]
  labels      Json     @default("[]") // [labelId]
  teamId      String
  team        Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  createdBy   String
  createdAt   DateTime @default(now())
  @@index([teamId])
}
```

---

### 任务 3.3: 时间追踪系统 - 数据库模型

```prisma
model TimeEntry {
  id          String   @id @default(cuid())
  taskId      String
  task        Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  userId      String
  user        User     @relation("TimeEntryUser", fields: [userId], references: [id], onDelete: Cascade)
  startTime   DateTime
  endTime     DateTime?
  duration    Int?     // 分钟
  description String   @default("")
  createdAt   DateTime @default(now())
  @@index([taskId])
  @@index([userId])
}
```

---

## 第四阶段：甘特图 + 报表 + 重复任务（3周）

### 任务 4.1: 甘特图视图 - 前端组件

**文件：**
- 创建: `frontend/src/components/GanttChart.tsx`

（使用 SVG 渲染时间线，支持拖拽调整日期）

---

### 任务 4.2: 报表系统 - 后端服务

**文件：**
- 创建: `backend/src/reports/reports.module.ts`
- 创建: `backend/src/reports/reports.service.ts`
- 创建: `backend/src/reports/reports.controller.ts`

报表类型：
- 燃尽图数据
- 累积流图数据
- 个人工作量统计
- 团队效率统计

---

### 任务 4.3: 重复任务系统 - 数据库模型

```prisma
model RecurringTask {
  id          String   @id @default(cuid())
  templateId  String   // 关联任务模板
  frequency   String   // DAILY, WEEKLY, MONTHLY
  interval    Int      @default(1)
  daysOfWeek  Int[]    @default([]) // 0-6
  dayOfMonth  Int?
  startDate   DateTime
  endDate     DateTime?
  lastCreated DateTime?
  isActive    Boolean  @default(true)
  teamId      String
  team        Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  @@index([teamId, isActive])
}
```

---

## 验证清单

每个任务完成后需验证：

1. **后端**
   - [ ] API 返回正确数据
   - [ ] 权限验证正常
   - [ ] 数据库操作正确
   - [ ] 错误处理完善

2. **前端**
   - [ ] 组件渲染正确
   - [ ] 交互流畅
   - [ ] 符合设计系统风格
   - [ ] 响应式布局

3. **集成**
   - [ ] 前后端联调成功
   - [ ] WebSocket 实时同步
   - [ ] 通知触发正常

---

## 提交规范

```
feat(module): 简短描述

- 具体改动1
- 具体改动2

Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>
```
