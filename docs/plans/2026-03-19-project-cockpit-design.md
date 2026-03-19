# 项目管理 Cockpit 设计文档

> **目标**：将项目概览升级为功能完整的项目管理 Cockpit，提供数据可视化、风险洞察、团队负载等一站式管理视图。

---

## 背景与需求

当前 `ProjectDashboard` 仅展示基础统计数字，缺乏：
1. 可视化图表（燃尽图、累积流图）
2. 团队工作量分布
3. 逾期/风险任务预警
4. 项目活动动态
5. AI 智能洞察

---

## 设计方案

### 整体布局

```
┌─────────────────────────────────────────────────────────────────┐
│  项目头部 Banner (保持现有)                                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │ 风险预警区   │ │ 燃尽图      │ │ 累积流图    │ │ 团队负载   │ │
│  │ (新增)      │ │ (新增)      │ │ (新增)      │ │ (新增)     │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────┐ ┌─────────────────────────────┐│
│  │ 任务状态分布 + 进度          │ │ 近期活动动态                 ││
│  │ (增强)                      │ │ (新增)                       ││
│  └─────────────────────────────┘ └─────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│  里程碑列表 (保持现有)                                            │
├─────────────────────────────────────────────────────────────────┤
│  项目成员 (保持现有)                                              │
└─────────────────────────────────────────────────────────────────┘
```

### 组件拆分

| 组件 | 文件路径 | 说明 |
|------|----------|------|
| `ProjectDashboard` | `components/ProjectDashboard.tsx` | 主容器，布局编排 |
| `RiskAlertPanel` | `components/RiskAlertPanel.tsx` | 风险任务预警卡片 |
| `BurndownChart` | `components/BurndownChart.tsx` | 燃尽图（已有，复用） |
| `CumulativeFlowChart` | `components/CumulativeFlowChart.tsx` | 累积流图（已有，复用） |
| `TeamWorkloadChart` | `components/TeamWorkloadChart.tsx` | 团队工作量（已有，增强） |
| `ProjectActivityFeed` | `components/ProjectActivityFeed.tsx` | 项目活动动态列表 |
| `ProjectStatsPanel` | `components/ProjectStatsPanel.tsx` | 统计卡片+状态分布 |

---

## 数据结构

### API 扩展示例

```typescript
// GET /api/projects/:id/cockpit
interface ProjectCockpitData {
  // 基础统计
  stats: ProjectStats;

  // 风险任务
  risks: {
    overdue: Task[];      // 逾期任务
    highPriority: Task[]; // 高优先级未开始
    blocked: Task[];      // 被依赖阻塞
  };

  // 图表数据
  burndown: BurndownData[];
  cumulativeFlow: CumulativeFlowData[];
  teamWorkload: TeamWorkload[];

  // 活动动态
  activities: ProjectActivity[];
}

interface ProjectActivity {
  id: string;
  action: 'CREATED' | 'UPDATED' | 'COMPLETED' | 'ASSIGNED' | 'COMMENTED';
  entityType: 'TASK' | 'MILESTONE' | 'PROJECT';
  entityId: string;
  entityName: string;
  user: { id: string; name: string; avatar: string };
  createdAt: string;
  metadata?: Record<string, unknown>;
}
```

---

## 技术要点

1. **数据获取**：新增 `getProjectCockpit()` API，聚合多个报表接口
2. **图表复用**：复用现有的 `BurndownChart`、`CumulativeFlowChart` 组件
3. **实时更新**：通过 WebSocket 监听任务变更，刷新 Cockpit 数据
4. **权限控制**：复用现有项目权限检查

---

## 验收标准

- [ ] Dashboard 展示风险预警区（逾期/高优先级/阻塞任务）
- [ ] 燃尽图、累积流图、团队负载图正常显示
- [ ] 项目活动动态展示最近 20 条操作记录
- [ ] 所有图表支持日期范围筛选
- [ ] 响应式布局，移动端适配

---

**设计确认日期**: 2026-03-19
