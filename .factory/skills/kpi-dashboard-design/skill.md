---
name: kpi-dashboard-design
description: KPI仪表板设计。构建业务仪表板、选择指标、设计可视化布局时使用。涵盖指标选择和实时监控最佳实践。
---

## KPI Dashboard Design

Comprehensive patterns for designing effective Key Performance Indicator (KPI) dashboards that drive business decisions.

### When to Use This Skill

- Designing executive dashboards
- Selecting meaningful KPIs
- Building real-time monitoring displays
- Creating department-specific metrics views
- Improving existing dashboard layouts
- Establishing metric governance

### Core Concepts

#### 1. KPI Framework

| Level | Focus | Update Frequency | Audience |
|-------|-------|------------------|----------|
| **Strategic** | Long-term goals | Monthly/Quarterly | Executives |
| **Tactical** | Department goals | Weekly/Monthly | Managers |
| **Operational** | Day-to-day | Real-time/Daily | Teams |

#### 2. SMART KPIs

```
Specific: Clear definition
Measurable: Quantifiable
Achievable: Realistic targets
Relevant: Aligned to goals
Time-bound: Defined period
```

#### 3. Dashboard Hierarchy

```
├── Executive Summary (1 page)
│   ├── 4-6 headline KPIs
│   ├── Trend indicators
│   └── Key alerts
├── Department Views
│   ├── Sales Dashboard
│   ├── Marketing Dashboard
│   ├── Operations Dashboard
│   └── Finance Dashboard
└── Detailed Drilldowns
    ├── Individual metrics
    └── Root cause analysis
```

### Common KPIs by Department

#### Sales KPIs
```yaml
Revenue Metrics:
  - Monthly Recurring Revenue (MRR)
  - Annual Recurring Revenue (ARR)
  - Average Revenue Per User (ARPU)
  - Revenue Growth Rate

Pipeline Metrics:
  - Sales Pipeline Value
  - Win Rate
  - Average Deal Size
  - Sales Cycle Length
```

#### Product KPIs
```yaml
Usage:
  - Daily/Monthly Active Users (DAU/MAU)
  - Session Duration
  - Feature Adoption Rate
  - Stickiness (DAU/MAU)

Quality:
  - Net Promoter Score (NPS)
  - Customer Satisfaction (CSAT)
  - Bug/Issue Count
  - Time to Resolution
```

### Dashboard Layout Patterns

#### Pattern 1: Executive Summary
```
┌─────────────────────────────────────────────────────────────┐
│  EXECUTIVE DASHBOARD                        [Date Range ▼]  │
├─────────────┬─────────────┬─────────────┬─────────────────┤
│   REVENUE   │   PROFIT    │  CUSTOMERS  │    NPS SCORE    │
│   $2.4M     │    $450K    │    12,450   │       72        │
│   ▲ 12%     │    ▲ 8%     │    ▲ 15%    │     ▲ 5pts     │
├─────────────┴─────────────┴─────────────┴─────────────────┤
│  Revenue Trend              │  Revenue by Product          │
│  ┌───────────────────────┐  │  ┌──────────────────┐       │
│  │    /\    /\          │  │  │ ████████ 45%     │       │
│  │   /  \  /  \    /\   │  │  │ ██████   32%     │       │
│  │  /    \/    \  /  \  │  │  │ ████     18%     │       │
│  └───────────────────────┘  │  └──────────────────┘       │
├─────────────────────────────────────────────────────────────┤
│  🔴 Alert: Churn rate exceeded threshold (>5%)              │
└─────────────────────────────────────────────────────────────┘
```

### Best Practices

#### Do's
- **Limit to 5-7 KPIs** - Focus on what matters
- **Show context** - Comparisons, trends, targets
- **Use consistent colors** - Red=bad, green=good
- **Enable drilldown** - From summary to detail
- **Update appropriately** - Match metric frequency

#### Don'ts
- **Don't show vanity metrics** - Focus on actionable data
- **Don't overcrowd** - White space aids comprehension
- **Don't use 3D charts** - They distort perception
- **Don't hide methodology** - Document calculations
- **Don't ignore mobile** - Ensure responsive design
