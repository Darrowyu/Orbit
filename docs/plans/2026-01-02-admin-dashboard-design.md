# 管理后台完善设计文档

## 概述
完整企业级管理后台，新增6个管理模块，覆盖团队、项目、任务、审计、设置全方位管控。

## Tab结构（共8个）
```
概览 | 用户 | 团队 | 项目 | 任务 | 审计 | 日志 | 设置
```

## 模块设计

### 1. 概览增强
**现有统计卡片保留**：总用户、活跃用户、已禁用、团队数、任务数

**新增趋势图表**：
- 7日新增用户趋势（折线图）
- 7日任务完成趋势（折线图）
- 7日活跃用户趋势（折线图）

**新增健康指标**：
| 指标 | 说明 | 预警 |
|------|------|------|
| 逾期任务数 | 全局已过期未完成 | >10 红色 |
| 7日未登录用户 | 活跃度监控 | 显示数量 |
| 无负责人任务 | 孤儿任务数 | >5 黄色 |
| 存储占用 | 附件总大小 | 仅显示 |

### 2. 用户管理
保持现有功能不变。

### 3. 团队管理（新增）
**列表字段**：团队名称、代码、所有者、成员数、项目数、任务数、创建时间
**筛选**：搜索名称/代码、排序
**操作**：查看详情、转让所有权、解散团队

### 4. 项目管理（新增）
**列表字段**：项目名称、所属团队、负责人、状态、任务数、里程碑、创建时间
**筛选**：状态（活跃/暂停/完成/归档）、团队、搜索
**操作**：查看详情、归档、恢复

### 5. 任务监控（新增）
**逾期任务列表**：标题、团队、负责人、截止日期、状态
**统计面板**：任务状态分布饼图、无负责人任务数
**批量操作**：批量归档

### 6. 操作审计（新增）
**列表字段**：时间、操作者、操作类型、实体类型、实体ID
**筛选**：时间范围、操作类型、实体类型、操作者
**详情展开**：显示 oldValue/newValue JSON对比

### 7. 登录日志
现有功能独立为Tab。

### 8. 系统设置（新增）
**AI配置**：全局开关、默认Provider
**存储配置**：附件大小限制、允许类型、占用统计
**安全配置**：登录锁定次数、密码长度、会话有效期

## 后端API设计

### 趋势统计
```
GET /admin/stats/trends?days=7
Response: { dates, newUsers, completedTasks, activeUsers }
```

### 团队管理
```
GET    /admin/teams?search=&page=&sort=
GET    /admin/teams/:id
POST   /admin/teams/:id/transfer-ownership
DELETE /admin/teams/:id
```

### 项目管理
```
GET  /admin/projects?status=&teamId=&search=&page=
GET  /admin/projects/:id
POST /admin/projects/:id/archive
POST /admin/projects/:id/restore
```

### 任务监控
```
GET  /admin/tasks/overdue?page=
GET  /admin/tasks/stats
POST /admin/tasks/batch-archive
```

### 操作审计
```
GET /admin/audit-logs?startDate=&endDate=&action=&entityType=&userId=&page=
```

### 系统设置
```
GET  /admin/settings
POST /admin/settings
GET  /admin/storage/stats
```

## 数据库变更
新增 `SystemSetting` 表：
```prisma
model SystemSetting {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  updatedAt DateTime @updatedAt
}
```

## 前端组件清单
1. AdminOverviewCharts - 趋势图表组件
2. AdminHealthIndicators - 健康指标组件
3. AdminTeamList - 团队列表
4. AdminTeamDetail - 团队详情弹窗
5. AdminProjectList - 项目列表
6. AdminProjectDetail - 项目详情弹窗
7. AdminTaskOverdue - 逾期任务列表
8. AdminTaskStats - 任务统计面板
9. AdminAuditLog - 审计日志列表
10. AdminAuditDetail - 审计详情展开
11. AdminSettings - 系统设置面板
