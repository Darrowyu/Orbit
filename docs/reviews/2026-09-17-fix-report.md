# Orbit 修复执行报告（对应 2026-09-16 全量审查）

> 执行日期：2026-09-16 ~ 2026-09-17
> 审查报告：`docs/reviews/2026-09-16-full-code-review.md`
> 原则：根因修复、最小正确改动、无兼容层；所有阶段以 nest build + tsc + 运行时冒烟为验收。

## 一、阶段完成总览

| 阶段 | 内容 | 状态 |
|---|---|---|
| P0 | 止血 | ✅ |
| P1 | 统一身份上下文（消灭系统性 IDOR 根因） | ✅ |
| P2 | XSS/上传收口 | ✅ |
| P3 | WebSocket 服务端权威事件 | ✅ |
| P4 | 数据库迁移包 | ✅ |
| P5a | 事务边界/全局异常/批量下沉 | ✅ |
| P5b | 定时任务可靠性/查询优化/管理端加固 | ✅ |
| P6a-d | 业务接线（详情抽屉/忘记密码/挂载/用户级 AI Key） | ✅ |
| P7 | 测试补建 | ✅ |

## 二、关键修复与根因

### P0 止血
- `backend/.env` 移出 git 索引（`git rm --cached`；gitignore 本就覆盖）。**Git 历史仍含泄露密钥（DB 密码、Kimi `sk-kimi-...`、历史 Gemini `AIzaSy...`），需在厂商控制台轮换；历史重写（filter-repo + force push）待 Darrow哥 单独授权。**
- `JWT_SECRET` 启动 fail-fast（缺失/默认值/<32 字符拒绝启动，`src/common/jwt-config.ts`，auth/gateway/notifications 三处统一使用）；本地 .env 已轮换 96 字符高熵密钥
- 燃尽图除零崩溃修复（maxRemaining 下限 1）；前端 `build` 脚本加 `tsc --noEmit`；删除 `orbit: file:..` 自引用依赖；限流中间件改单实例

### P1 统一身份上下文（根因链修复）
- 根因：`JwtStrategy.validate` 不查库不注入 `currentTeamId` → 依赖它的 where 条件收到 `undefined` 被 Prisma 静默忽略 → 7 模块跨团队 IDOR + 里程碑 404/附件删除 403/周期任务创建 500
- 修复：validate 每请求查库（拒绝已删/禁用用户），返回 `{id, sub, email, currentTeamId}`；9 个 controller 加 getTeamId 守卫（显式 teamId 验证 TeamMember 成员身份，缺失 currentTeamId → 403）
- auth 加固：bcrypt cost 12、邮箱+IP 双维度锁定、不存在账号时序对齐（DUMMY_HASH）、LoginLog 全量落库（含撞库尝试，userId 可空）、注册密码 MinLength(8)、邮箱大小写不敏感（`User_email_lower_key` 唯一索引）
- WS 网关连接时查库验证用户存在且未禁用

### P2 XSS/上传收口
- 上传黑名单改白名单（`src/common/file-upload.ts`）：扩展名白名单 + mimetype 匹配 + originalname 清洗；头像加魔数校验（不符删文件）
- `/uploads/` 全部响应 `nosniff`，非图片扩展名强制 `Content-Disposition: attachment`（历史 .html/.svg 存量无法内联执行）
- MentionInput 渲染前 escapeHtml（存储型 XSS 修复）

### P3 WS 服务端权威事件
- 删除客户端→服务端 `task:create/update/delete` 转播通道（伪造注入 + `client.broadcast.emit` 全站泄露通道关闭）
- service 层写库/事务提交后由后端向 `team:${teamId}` 房间广播：task created/updated/deleted、comment created/deleted；归档→deleted、恢复→created（看板语义）
- 前端：删除 emitTask*；socket 重连/断线刷新修复；切换团队同步更新 authStore.currentTeamId + join 新房间；本地操作与广播回声按 id 幂等去重

### P4 数据库迁移包
- 新增迁移 `20260916151818_security_hardening`、`20260916154800_add_password_reset_code`、`20260917120000_notification_preferences_split`，全部 deploy 到本地库；6 个历史漂移迁移已 `migrate resolve` 基线化
- 删除用户级联改 SetNull（AuditLog/Comment/TimeEntry/LoginLog/Attachment/TaskTemplate/RecurringTask）；补 12+ 索引（外键、团队过滤、时间序）；Mention 唯一约束；Task 新增 `completedAt`、`order`
- 报表口径统一：完成时间一律 `completedAt`（历史 DONE 任务已回填）；reports 日界改 UTC（消除服务器时区漂移）

### P5a 事务/异常/批量
- tasks.update 三段写入（子任务 diff/标签重写/主更新）合并单事务；通知/审计/WS 全部移到提交后；进出 DONE 维护 completedAt
- projects.archive 事务化；归档双真相源收敛（不再写 status='ARCHIVED'，历史脏数据已清理）
- 全局 PrismaExceptionFilter：P2002→409、P2025→404、P2003→409、其余 500 脱敏
- 批量操作下沉 service：ids 上限 100、团队归属一次校验、逐条复用单条校验、整体单事务、提交后审计+WS、返回 {succeeded, failed, errors:[{id,reason}]}；batchDelete 清理 dependsOn 悬挂与附件文件
- 附件孤儿文件清理（删任务/解散团队后 unlink）；团队详情对非成员剥离成员邮箱

### P5b 可靠性/优化/加固
- recurring：模板 Json 列双重编码修复（原生读写 + 历史数据兼容解析）；乐观锁 `updateMany(id+nextRun)` 抢占多实例；建任务+推进 nextRun 单事务（失败回滚下周期重试，不再静默卡死）；失效标签过滤防 FK 死循环；calculateNextRun 全 UTC；自动建任务补审计+WS 广播
- scheduler：通知去重从进程内 Set 改 DB 查重（同任务同类型 24h 窗口，重启不丢失）
- N+1：项目工作量统计、团队成员通知改单次查询聚合
- 分页上限：comments/time-entries/audit 100、archived 200、admin trends 90 天封顶
- admin：limit 封顶 100、sort 白名单、4 个高危操作补审计
- 通知偏好拆分：新增 projectMemberRemoved/projectRoleChanged/mention 独立字段 + 前端 3 个新开关；getPreferences 去读副作用
- mentions 后端接通：评论创建解析 @[name](id) → Mention 记录 + MENTION 通知（自提及跳过、唯一约束去重）

### P6 业务接线
- **任务详情抽屉**（新建 TaskDetailDrawer）：只读详情 + 评论区（@提及高亮、MentionInput、自己评论可删、socket 实时追加幂等）+ 附件 + 计时；TaskCard 点击开抽屉，抽屉内"编辑"才开 CreateTaskModal；任务被删抽屉自动关闭
- **忘记密码全链路**：PasswordResetCode 表（SHA-256 存码、10 分钟、5 次防爆破、60 秒频控、防枚举）+ MailService（SMTP 配置/日志降级）+ 3 端点；前端 4 处裸 fetch 收进 authApi
- **挂载补齐**：LabelManager + RecurringTaskList → TeamSettings；TaskTemplateList → CreateTaskModal"从模板快速创建"；GlobalSearch → SlimHeader（Ctrl+K）；本地过滤平移 FilterBar；快捷键注册（Ctrl+K/?/N/Esc）+ 帮助面板；看板多选 + 底部批量操作栏（移动/指派/归档/删除，失败明细展示）；TaskCard 标签 Badge 行；Modal 嵌套 Esc 栈修复
- **用户级 AI Key**：CryptoUtil 重写（AES-256-GCM、ENCRYPTION_KEY、随机 IV、解密失败抛异常，9/9 单测）；GET/PUT `/users/me/ai-config`（masked 回显、空串清除）；AiService 用户 Key 优先（OpenAI 兼容 + 厂商默认值，系统配置回退）；AI 端点按用户限流 10 次/分；ProfilePage 新增"AI 设置"Tab；auth sanitize 剔除 aiApiKey 密文

## 三、验证证据

### 构建与迁移
- backend `nest build`：零错误（每个阶段后复验，含 spec 补建后最终复验）
- frontend `npm run build`（tsc + vite）：零错误，built in 3.65s
- `prisma migrate status`：17 个迁移全部应用，schema up to date
- **Jest 全量：8/8 suites、78/78 用例通过**（新增 6 个 spec 66 用例：auth 19、tasks.service 16、tasks.controller 4、recurring 12、rate-limit 5、prisma-exception.filter 5；含既有 crypto.util 9、validators）

### 运行时冒烟（真实起服 + HTTP，非仅构建）
| 验证项 | 结果 |
|---|---|
| 应用启动（JWT fail-fast + 新密钥） | ✅ 干净启动 |
| 注册/登录/建团队/建任务 | ✅ |
| IDOR：伪造 teamId 拉任务 | ✅ 403 |
| 批量移动 | ✅ {succeeded:2, failed:0} |
| completedAt 维护（进 DONE） | ✅ |
| 通知偏好新字段 | ✅ 三字段返回 |
| 双用户 @提及 → MENTION 通知 | ✅（自提及正确跳过） |
| 模板 Json 原生数组 | ✅ |
| 周期任务创建（UTC nextRun） | ✅ |
| 全局搜索 | ✅ |
| AI 配置端点 + sanitize 无 aiApiKey/password | ✅ |
| 忘记密码全链路（发码→验码→重置→新密码登录→旧密码失效→码作废） | ✅ |
| 冒烟数据清理 | ✅ 数据库与磁盘无残留 |

## 四、遗留事项处理结果（2026-09-17 更新）

1. **Git 历史重写：✅ 已完成**。filter-branch 从全部历史移除 `backend/.env`，清理 refs/original 与 stash 残留后 gc，验证历史中 `.env`/Gemini Key/旧 DB 密码均为零命中，已 force push（远端 e335967 与本地一致）。注意：GitHub 对旧提交的缓存/其他克隆可能短暂留存，密钥轮换仍是必要兜底。
2. **DB 密码：✅ 已轮换**（10 位旧密码 → 48 位 hex，本地 `ALTER USER` 执行 + 连接验证通过）。
3. **Kimi Key：⚠️ 需 Darrow哥 操作**。精确值检索证明该 Key **从未进入 git 历史**（无泄露面）；但在 .env 重建过程中原值丢失，需从 Kimi 控制台重新生成填入 `backend/.env` 的 `AI_API_KEY=`（建议同时吊销旧 Key，顺带完成轮换）。
4. **Gemini Key：⚠️ 需 Darrow哥 操作**。该 Key 确实曾随 `backend/.env` 进入历史并推送 GitHub，虽历史已清洗，仍建议在 Google AI 控制台吊销。
5. **事故记录**：历史重写需 stash 全部未提交改动；`backend/.env` 当时处于"staged 删除"状态，`stash pop` 按索引状态未将其恢复到磁盘，且 stash 对象随后被 gc 回收，导致本地 `.env` 丢失。已通过 trust 模式重置 DB 密码并按 `.env.example` 重建全部配置（JWT_SECRET/ENCRYPTION_KEY 重新生成——现有登录态会失效，重新登录即可；用户级 AI Key 尚未有人配置，无数据损失）。除 `.env` 外 99 个改动文件全部完好。
6. **明确暂缓**（审查中确认、本次未做）：timestamptz 转换、Prisma 枚举化（与 BoardColumn 自定义列语义冲突）、TaskDependency 独立表、HttpOnly Cookie 认证迁移
7. Node 25 与 jest-environment-node 不兼容：测试在 Node 20-22 直接跑，Node 25 需 `--experimental-vm-modules --localstorage-file`

## 五、修复规模

- 未提交改动约 100 个文件（按 Darrow哥 规则未自动提交，提交节奏由 Darrow哥 决定，commit 需带 `Co-Authored-By: Darrowyu <darrowyu@126.com>`）
