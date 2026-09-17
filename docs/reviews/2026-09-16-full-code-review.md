# Orbit 全量代码审查报告

- **日期**：2026-09-16
- **范围**：backend/（83 个 ts 文件，约 3900 行）+ frontend/（91 个文件，约 9000 行）+ prisma/schema.prisma（19 模型）+ 14 个迁移 + 构建配置
- **方法**：5 路并行专项审查（后端安全 / 后端架构 / 数据库 / 前端 / 业务功能）+ 主线独立复核 + 构建基线验证
- **基线**：后端 `nest build` ✅ 通过；前端 `tsc --noEmit` ❌ 8 个错误（含 1 个运行时崩溃）；后端仅 2 个 spec 文件，前端零测试

---

## 一、最重要的结论（跨专项交叉确认）

### 1. 三条独立的"账号接管 / 全系统失守"链

| 链 | 路径 | 后果 |
|---|---|---|
| 凭据链 | `backend/.env` 被 git 追踪（自 46303fe 起），含真实 DB 密码、Kimi Key；历史中还有 Gemini Key。JWT_SECRET 是公开默认值 `your-super-secret-jwt-key-change-in-production` | 仓库读权限 → 离线伪造任意用户（含超管）token，所有授权失效 |
| XSS 链 | 上传黑名单仅拦 5 种扩展名，`.html/.svg` 可传 → `/uploads/` 同源静态返回 → 脚本读取 localStorage 中的 JWT | 存储型 XSS 盗号；MentionInput.tsx:88 未转义 innerHTML 是第二条 XSS（当前未挂载，接通即引爆） |
| 隔离链 | `JwtStrategy.validate`（jwt.strategy.ts:12）不注入 `currentTeamId` → 7 个模块消费 `undefined` → Prisma 静默忽略该 where 条件 | 跨团队读/改/删（IDOR）全面失守 |

### 2. 系统性 IDOR 同时是"功能已坏"

受 `currentTeamId === undefined` 影响的模块：labels、milestones、recurring、templates、search、reports、time-entries、attachments。

- 越权面：search 搜全站、labels/recurring/templates 跨团队改删、reports 拉任意项目报表、time-entries 任意任务计时
- 已坏面：milestones 读改删恒 404（`ms.project.teamId !== undefined` 恒真）、attachments 删除恒 403、recurring 创建 500
- 另有 `GET /api/tasks?teamId=`（tasks.controller.ts:13-18）显式 teamId 无成员校验，任意团队任务全量可读

### 3. 实时同步是"双轨制"，两头都漏

- 后端 REST 写路径**不产生任何 WS 事件**；前端靠操作者客户端 emit 转发，且 `createTask` 从不调用 `emitTaskCreate` → 新建任务零实时同步
- 网关 `task:create/update/delete`（tasks.gateway.ts:58-77）转播**未校验的客户端 payload**；客户端未 join 团队时回退 `client.broadcast.emit` → **向全站所有团队广播**
- 前端登录/注册后 `connectSocket()` 不带 teamId（authStore.ts:33,46）→ 登录后实时同步静默失效，刷新页面才恢复
- 切换团队不 refetch、不同步 authStore.currentTeamId → socket 已入新房间、本地仍是旧数据，事件无 teamId 过滤 → 跨团队数据污染

**根治方向一致**：广播下沉后端 service 层（写库成功后服务端 emit），删除客户端转播通道。一处改造同时修掉安全 🟠、架构 🟠、前端 🔴×2。

### 4. 数据正确性三颗定时炸弹（数据库）

1. **删用户级联销毁审计/工时/评论**：`AuditLog.userId`、`Comment.userId`、`TimeEntry.userId` 均为 `onDelete: Cascade`；而 `Team.ownerId`/`Project.ownerId` 是默认 Restrict——策略自相矛盾。审计日志语义上不可变，必须 SetNull + 用户只软删
2. **裸外键**：`Attachment.uploaderId`、`TaskTemplate.createdBy`、`RecurringTask.createdBy`、`AuditLog.teamId` 无 relation，孤儿数据无 DB 层防线
3. **索引体系不完整**：Prisma 不自动索引 FK——`Task.assigneeId/dueDate/milestoneId`、`Subtask.taskId` 全缺；`TeamMember @@unique([userId, teamId])` 左前缀不覆盖"按 teamId 列成员"（TeamMemberGuard 每请求都跑）；调度器 dueDate 定时全表扫描

### 5. "建了但没接通"是业务层最大主题

约 1/3 已建能力差最后一公里：

| 状态 | 功能 |
|---|---|
| 反向断裂（前端✅后端❌） | **忘记密码**：四步 UI 完整，后端三个端点不存在，全系统无邮件模块 → 忘记密码 = 账号锁死 |
| 后端✅组件✅差挂载 | 附件(AttachmentList)、工时(TimeTracker)、模板(TaskTemplateList)、标签创建(LabelManager→用户无法新建标签)、全局搜索(挂在废弃 Header.tsx)、快捷键 hook+帮助面板 |
| 后端✅零 UI | recurring 周期任务（cron 每小时空转）、4 个批量操作端点（无多选 UI）、工时报表（无数据源永远为空） |
| 死代码 | MentionsModule（服务无人调用）、CryptoUtil（仅 spec 引用）、用户级 AI Key（字段有、端点无、UI 无）、Header.tsx、emitTaskCreate |
| 双真相源 | `Project.status` 含 ARCHIVED 又与 `isArchived` 并存，查询口径已分裂 |

### 6. 已核实的运行时崩溃 / 构建问题

- `SimpleBurndownChart.tsx:68` 引用未定义的 `maxRemaining` → 燃尽图有数据时 ReferenceError 崩溃
- 前端 `build` 脚本只有 `vite build`，无 `tsc` → 上述错误直达产物
- `taskStore.ts` 的 `deriveStatusFromSubtasks`/`performArchiveOperation` 运行时存在但未声明在 `TaskStore` 接口（类型缺口，非运行时 bug）
- `"orbit": "file:.."` 自引用依赖无任何导入，纯残留
- vite 端口 1234 与 CLAUDE.md 写的 3000 不符；CORS/网关默认值同样是 1234

---

## 二、后端安全（详表）

### 🔴 严重
1. `.env` 含真实凭据进 git（轮换 + `git rm --cached` + filter-repo 清洗历史）
2. JWT_SECRET 公开默认值 + `validate` 不查库直接信任 payload（高熵密钥 + fail-fast + 回查 isActive）
3. `req.user.currentTeamId` 系统性 IDOR（见上）
4. `GET /api/tasks?teamId=` 无成员校验
5. 附件模块越权（上传/列举/下载链）
6. 文件上传存储型 XSS（白名单 + magic bytes + nosniff + 非图片强制 attachment）

### 🟠 高
7. WS 事件注入/伪造 + 全站广播回退
8. 禁用/删除用户 token 7 天内照常可用（HTTP + WS 都只验签名）
9. AI 接口无配额（系统 Key 计费，可刷量）
10. 登录锁定按账号维度 → 反向 DoS 受害者 + 用户枚举时序差
11. RateLimitMiddleware 双实例（main.ts:15 第一个实例 setInterval 泄漏）+ 中间件阶段 req.user 恒 undefined → 纯 IP 维度（NAT 牵连）+ 重启清零

### 🟡 中
12. 无 helmet/安全头（放大 XSS）
13. ValidationPipe 缺 `forbidNonWhitelisted`；admin/ai/users 多处裸 body 无 DTO；批量 ids 无上限
14. 团队详情向非成员泄露成员邮箱（teams.service.ts:54-65,121）
15. 管理员高危操作（重置密码/授超管/删用户）无审计
16. bcrypt cost=10 偏低；`MinLength(6)` 与 validators 要求 8 位不一致
17. CryptoUtil 硬编码盐 'salt'、拿 JWT_SECRET 当加密密钥、解密失败静默返回原文
18. labelIds/dependsOn/subtask.assigneeId 不校验团队归属（tasks.service.ts:147-202）
19. admin 排序键用户可控 + limit 无上限
20. `/uploads` 静态无鉴权；头像文件名 `Date.now+random` 可枚举

### 🔵 低
邀请码 32bit 熵偏低、注册无专用限流、未设 trust proxy、AI 错误日志带上游响应体、双 Gateway 未分 namespace。

**已核实无问题**：Guard 无漏挂、SuperAdminGuard 逐请求查库、WS 握手认证与 join:team 校验正确、无 SQL 注入面（全程参数化）、Multer 服务端随机文件名路径穿越不可利用、评论/通知归属校验扎实。

---

## 三、后端架构（详表）

### 🔴 严重
1. currentTeamId 系统性缺陷（同安全 #3，根治：`@CurrentTeam()` 装饰器 + TeamMemberGuard）
2. tasks teamId 无校验（同安全 #4）
3. 附件模块（同安全 #5/6，且删除功能已坏）
4. 禁用用户 token 不失效（同安全 #8）
5. 驾驶舱"最近动态"查错字段：`projects.service.ts:306` 拿 projectId 当 teamId 查 AuditLog → 永远为空；cockpit 还返回 `burndown: [], cumulativeFlow: []` 占位
6. Recurring 双重 JSON 编码：模板 Json 列被 stringify 写入，遇真数组 `JSON.parse` 抛错 → catch 只记日志且 nextRun 不推进 → 每小时静默重试卡死
7. Recurring 建任务与推进 nextRun 非事务、无幂等 → 失败/多实例即重复建任务；无审计无通知无 WS

### 🟠 高
8. tasks.update 标签先删后建（事务外）+ 本体更新第三提交 → 部分提交丢标签；archive/remove 的依赖清理同样不在事务内
9. 批量操作在 Controller 重写发散逻辑（无审计/通知/WS、空 catch 吞错、ids 无上限、不清理 dependsOn 悬挂引用）
10. WS 双轨制（见上）
11. projects.archive / teams 加成员 / mentions 先删后建等多步操作未整体事务化
12. 循环依赖检测全表加载团队任务做 DFS；getTeamWorkload N+1；批量通知 2N 次查询
13. AI 无配额 + 代码（kimi/anthropic 协议）与文档（GEMINI）严重漂移 + 用户 AI Key/CryptoUtil 死代码
14. 无全局异常过滤器：P2002/P2025 直接 500 泄露表名字段名；admin sort 任意字段可打 500
15. 登录锁定反向 DoS（同安全 #10）

### 🟡 中（摘选）
16. 限流中间件双实例泄漏
17. Scheduler 内存去重 Set：重启全量重发通知 + key 只增不减（缓增泄漏）+ 多实例重复发送
18. 时区三种口径：cron 本地时区（DST 漂移）、通知 `toLocaleDateString`、reports `toISOString` UTC
19. 双 Gateway 同 namespace 重复认证；`userSockets` Map 与房间功能冗余
20. 多列表缺分页（findArchived、comments、time-entries、audit、reports、admin trends）
21. Controller 直接注入 PrismaService，成员校验三套重复实现（verifyTaskAccess/verifyProjectAccess/checkPermission）
22. 通知偏好映射张冠李戴（关"加入项目"连带关"被移出项目"）；GET preferences 有写副作用
23. `updatedAt` 误当完成时间 → 燃尽图/趋势失真（建议加 `completedAt`）
24. 级联删除后磁盘附件文件成孤儿
25. 通知触发点遗漏（批量、recurring、mentions）

### 🔵 低（摘选）
logger 只开 error/warn 导致定时任务不可观测；CORS 默认端口与文档不符；魔法字符串遍布；统计代码重复 5 处；`tasks.map(this.format)` 脆弱裸引用；admin 操作无审计且 EntityType 枚举不全。

---

## 四、数据库（详表）

### 🔴 严重
1. AuditLog/Comment/TimeEntry 的 userId Cascade（改 SetNull + 用户软删）
2. 裸外键 4 处（补 relation + 索引）

### 🟠 高
3. Task 缺索引：`@@index([teamId, isArchived, status])`、`[assigneeId, isArchived]`、`[dueDate]`、`[milestoneId]`
4. Subtask 完全无索引：`@@index([taskId])`
5. 唯一索引左前缀反查失效：TeamMember `@@index([teamId, role])`、ProjectMember `@@index([projectId])`、TaskLabel `@@index([labelId])`
6. 状态/角色字段全为自由 String → 建议 Prisma enum（TaskStatus/Priority/Role 等）
7. `Task.dependsOn String[]` 无 FK 无级联 → 建议 TaskDependency 联结表

### 🟡 中
8. 全部 TIMESTAMP(3) 无时区 → `@db.Timestamptz`
9. Project.status 与 isArchived 双真相源 → 收敛
10. Notification 排序索引 `@@index([userId, createdAt(sort: Desc)])` 或 read=false 部分索引
11. Task 无 order/position → 看板列内拖拽顺序无法持久化；status 与 BoardColumn 两套语义并存
12. AuditLog/LoginLog/Notification 无保留策略（短期定期清理，中期 AuditLog 按月分区）
13. User.email 唯一约束区分大小写（lower() + 表达式唯一索引）
14. Mention 缺 `@@unique([userId, sourceType, sourceId])` 防重
15. 软删除过滤两处遗漏：admin.service.ts:179、:106

### 🔵 低
cuid() 对插入密集表造成 B-tree 碎片（uuidv7）；Label 冗余索引；LoginLog 缺 (userId, createdAt)；BoardColumn 缺 (teamId, order)；Attachment.size 建议 BigInt；Task 无 createdById；迁移链与 schema 文件级核对一致无漂移。

---

## 五、前端（详表）

### 🔴 严重
1. 切团队不刷新 + socket 房间错位 → 跨团队数据污染（teamStore.ts:64-69）
2. 登录/注册后 socket 无 teamId → 实时同步静默失效（authStore.ts:33,46）
3. MentionInput.tsx:88 未转义 innerHTML XSS（当前未挂载，接线前必修）

### 🟠 高
4. 实时广播靠客户端转发，createTask 从不 emit，断线丢消息
5. socket.ts 重连门控 bug + `socket.on('reconnect')` 在 v4 是死代码
6. LoginModal 四处裸 fetch 绕过 api 层 + 字符串匹配 '401' 判错
7. TaskCard memo 是 default export 无人消费 → 全量重渲染（areEqual 还漏 teamMembers）
8. token 存 localStorage（与 XSS 叠加，中期 HttpOnly Cookie）
9. 任务 limit=100 静默截断无翻页入口

### 🟡 中（摘选）
currentTeamId 双事实源漂移（teamStore 用 teams[0] 兜底）；远端事件与本地乐观更新无冲突解决（无 updatedAt 比较）；fetchTasks 无 AbortController、GlobalSearch 无乱序守卫无 catch；types.ts 与后端漂移（NotificationType 7 vs 12 种）；App.tsx 325 行 17 个 useState 全量订阅；build 无 tsc；`"orbit": "file:.."` 残留；socket 与 api 生产回退不一致（vercel.json rewrite 会吞同源 /api）；大面积静默 catch、列表页无错误态；onboardingStore 持久化 isRunning 导致刷新自动弹引导。

### 🔵 低（摘选）
Header.tsx/GlobalLoading 死代码；生产 console.error 残留；大列表无虚拟化；DependencyLines 每 tasks 变化 O(n) getBoundingClientRect；a11y（div onClick 无 role、下拉无 aria-expanded、拖拽无键盘替代）；TimeTracker 混用原生 alert/confirm；vite 端口与文档不符。

---

## 六、业务功能缺口

### P0（发布阻断）
1. 忘记密码流程断裂（需邮件基础设施 + 三个端点）
2. 评论无前端入口（后端就绪）→ 协作闭环缺失
3. @提及全链路断裂（MentionsService 死代码，补评论 UI 时同步注入）

### P1（用户预期）
邮件验证/邀请/通知；全局搜索接入当前布局；标签创建挂载 + 卡片展示；附件/周期任务/模板/工时四模块接线；快捷键注册；批量多选 UI；任务详情抽屉（是评论/附件/计时/活动历史的统一落点，建议先于接线做）；用户级 AI Key 打通或删除；数据导出。

### P2（竞争优势）
自动化规则；Webhook/IM 集成；报表深化（velocity/PDF）；甘特依赖编辑；watchers/分享链接；暗黑模式/i18n/PWA/SSO。

### 核心旅程走查
注册登录 ⚠️（断在忘记密码）→ 建团队 ✅ → 邀请 ⚠️（无邮件邀请）→ 建项目 ✅ → 建任务 ✅ → 拖拽看板 ✅ → 协作 ❌（评论/提及断）→ 归档 ✅

---

## 七、修复路线图（按依赖与性价比排序）

### 第 0 阶段：止血（小时级，立即）
- [ ] 轮换全部泄露密钥（DB、Kimi、Gemini），换高熵 JWT_SECRET
- [ ] `git rm --cached backend/.env` + 确认 gitignore 生效；评估 filter-repo 清洗历史
- [ ] 修 `SimpleBurndownChart.tsx` 的 `maxRemaining` 崩溃
- [ ] 前端 build 加 `tsc -b &&`，清理现有 8 个 tsc 错误
- [ ] 删除 `"orbit": "file:.."` 残留依赖
- [ ] 修 main.ts:15 限流双实例（顺带消除 setInterval 泄漏）

### 第 1 阶段：统一身份上下文（1-2 天，最优先架构债）
- [ ] `@CurrentTeam()` 装饰器 + TeamMemberGuard：JwtStrategy 查库注入 user（含 isActive 校验），Controller 统一改造
- [ ] 修 tasks?teamId= 成员校验
- [ ] 一次性消灭 7 个模块 IDOR + 修好 milestones/attachments-delete/recurring-create 已坏功能
- [ ] 补团队隔离越权回归测试（每控制器一条）

### 第 2 阶段：XSS 与上传收口（半天-1 天）
- [ ] 上传改白名单（扩展名 + magic bytes），非图片强制 `Content-Disposition: attachment` + nosniff
- [ ] MentionInput 转义或改 React 分段渲染
- [ ] 加 helmet 安全头

### 第 3 阶段：WS 服务端权威事件（1-2 天）
- [ ] service 写库成功后服务端 emit，删除客户端转播与 broadcast 回退
- [ ] 前端切团队同步 authStore + 全量 refetch + 事件按 teamId 过滤
- [ ] 登录后 connectSocket 带 currentTeamId；修重连门控与死代码
- [ ] 合并双 Gateway / 删 userSockets 冗余

### 第 4 阶段：数据库迁移包（一次性迁移）
- [ ] userId 级联改 SetNull + 用户软删；补裸外键 relation
- [ ] 索引整改合并一个迁移（Task/Subtask/TeamMember/ProjectMember/TaskLabel/Notification）
- [ ] Project.status 与 isArchived 收敛；修 admin.service.ts:106,179 过滤口径
- [ ] 排期：timestamptz、enum、TaskDependency 联结表、Task.order

### 第 5 阶段：事务与可靠性（2-3 天）
- [ ] tasks.update / projects.archive / recurring 事务边界；通知/WS 提交后发送
- [ ] Recurring：去 stringify/parse、幂等（唯一约束 + 乐观锁）、时区统一
- [ ] Scheduler 去重状态落库
- [ ] 全局 PrismaExceptionFilter（P2002→409 / P2025→404 / 其余脱敏）
- [ ] 批量操作下沉 Service + ids 上限 + 错误明细

### 第 6 阶段：接线专项（1-2 周，功能完整度跃升）
- [ ] 任务详情抽屉先行（评论/附件/计时/活动历史的统一落点）
- [ ] 评论 UI + 接通 MentionsService（复用 MentionInput，先修 XSS）
- [ ] 挂载 AttachmentList/TimeTracker/TaskTemplateList/LabelManager/GlobalSearch，注册快捷键，批量多选 UI
- [ ] 忘记密码：邮件服务（Resend/nodemailer）+ 三端点，顺带奠定邮箱验证/邀请/通知地基

### 第 7 阶段：测试补建（与上述并行）
优先级：① auth 锁定/注册竞态；② tasks.service 权限/依赖/循环检测/子任务 diff；③ 团队隔离回归；④ recurring 幂等与 calculateNextRun；⑤ 限流中间件。

---

## 八、总体评价

**骨架在水准之上**：模块划分清晰无循环依赖、Prisma/Audit 全局化、任务依赖环检测、主流列表有分页、审计失败隔离、软删除执行一致、无 SQL 注入面、Guard 覆盖完整、管理后台与 AI 能力（分解/估算/指派/风险）完成度高、迁移链干净无漂移。

**三个架构级问题不解决，功能越叠债越重**：
1. 身份上下文注入的系统性缺陷（安全与功能双重失守）
2. WS 双轨制（实时一致性无从谈起）
3. 事务/幂等缺失（数据正确性靠运气）

**业务上建议冻结新模块开发**：先做"止血 → 架构债 → 接线专项"三件事。约 1/3 已建能力只差最后一公里，接线完成后产品即可达到 Trello 级最小完整闭环。
