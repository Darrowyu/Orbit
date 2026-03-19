import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto, AddProjectMemberDto, UpdateProjectMemberDto, ProjectCockpitData, CockpitRiskTasks, TeamMemberWorkload, ProjectActivity } from './dto/project.dto';
import { ProjectEntity } from '../common/types';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ProjectsService {
    constructor(private prisma: PrismaService, private notifications: NotificationsService) { }

    private async getProjectTaskStats(projectId: string) {
        const stats = await this.prisma.task.groupBy({
            by: ['status'],
            where: { projectId, isArchived: false },
            _count: { id: true }
        });
        const total = stats.reduce((sum, s) => sum + s._count.id, 0);
        const incomplete = stats.filter(s => s.status !== 'DONE').reduce((sum, s) => sum + s._count.id, 0);
        return { total, incomplete };
    }

    async findAll(teamId: string, includeArchived = false) { // 获取团队下所有项目
        const projects = await this.prisma.project.findMany({
            where: { teamId, isArchived: includeArchived ? undefined : false },
            include: { members: { include: { user: true } }, _count: { select: { tasks: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return projects.map(this.format);
    }

    async findOne(id: string, userId?: string) { // 获取单个项目详情
        const project = await this.prisma.project.findUnique({
            where: { id },
            include: { members: { include: { user: true } }, owner: true, _count: { select: { tasks: true } } },
        });
        if (!project) throw new NotFoundException('项目不存在');
        if (userId) { // 验证用户是否为项目成员或同团队成员
            const isMember = project.members.some(m => m.userId === userId);
            if (!isMember) {
                const isTeamMember = await this.prisma.teamMember.findUnique({ where: { userId_teamId: { userId, teamId: project.teamId } } });
                if (!isTeamMember) throw new ForbiddenException('无权访问此项目');
            }
        }
        return this.format(project);
    }

    async create(dto: CreateProjectDto, teamId: string, ownerId: string) { // 创建项目
        const project = await this.prisma.project.create({
            data: {
                name: dto.name,
                description: dto.description || '',
                color: dto.color || '#6366f1',
                startDate: dto.startDate ? new Date(dto.startDate) : null,
                endDate: dto.endDate ? new Date(dto.endDate) : null,
                teamId,
                ownerId,
                members: { create: { userId: ownerId, role: 'owner' } }, // 创建者自动成为 owner
            },
            include: { members: { include: { user: true } }, _count: { select: { tasks: true } } },
        });
        return this.format(project);
    }

    async update(id: string, dto: UpdateProjectDto, operatorId: string) { // 更新项目
        await this.checkPermission(id, operatorId, ['owner', 'admin']);
        if (dto.status === 'COMPLETED') { // 项目标记完成时检查任务状态
            const taskStats = await this.getProjectTaskStats(id);
            if (taskStats.incomplete > 0) {
                throw new BadRequestException(`无法标记项目为已完成：还有 ${taskStats.incomplete} 个任务未完成`);
            }
        }
        const { startDate, endDate, ...data } = dto;
        const project = await this.prisma.project.update({
            where: { id },
            data: {
                ...data,
                startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
                endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
            },
            include: { members: { include: { user: true } }, _count: { select: { tasks: true } } },
        });
        return this.format(project);
    }

    async archive(id: string, operatorId: string, options?: { archiveTasks?: boolean }) { // 归档项目
        await this.checkPermission(id, operatorId, ['owner']);
        const taskStats = await this.getProjectTaskStats(id);
        if (taskStats.total > 0 && !options?.archiveTasks) {
            return { needConfirm: true, taskCount: taskStats.total, incompleteCount: taskStats.incomplete, message: `该项目下有 ${taskStats.total} 个任务（${taskStats.incomplete} 个未完成），是否同时归档这些任务？` };
        }
        if (options?.archiveTasks) { // 同步归档项目下的所有任务
            await this.prisma.task.updateMany({ where: { projectId: id, isArchived: false }, data: { isArchived: true, archivedAt: new Date() } });
        }
        const project = await this.prisma.project.update({
            where: { id },
            data: { isArchived: true, archivedAt: new Date(), status: 'ARCHIVED' },
            include: { members: { include: { user: true } }, _count: { select: { tasks: true } } },
        });
        return this.format(project);
    }

    async restore(id: string, operatorId: string) { // 恢复项目
        await this.checkPermission(id, operatorId, ['owner']);
        const project = await this.prisma.project.update({
            where: { id },
            data: { isArchived: false, archivedAt: null, status: 'ACTIVE' },
            include: { members: { include: { user: true } }, _count: { select: { tasks: true } } },
        });
        return this.format(project);
    }

    async remove(id: string, operatorId: string, options?: { force?: boolean }) { // 删除项目
        await this.checkPermission(id, operatorId, ['owner']);
        const taskStats = await this.getProjectTaskStats(id);
        if (taskStats.total > 0 && !options?.force) {
            return { needConfirm: true, taskCount: taskStats.total, incompleteCount: taskStats.incomplete, message: `该项目下有 ${taskStats.total} 个任务，删除项目将解除这些任务与项目的关联，是否继续？` };
        }
        await this.prisma.project.delete({ where: { id } });
        return { success: true };
    }

    async addMember(projectId: string, dto: AddProjectMemberDto, operatorId: string) { // 添加成员
        await this.checkPermission(projectId, operatorId, ['owner', 'admin']);
        const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { teamId: true, name: true } });
        if (!project) throw new NotFoundException('项目不存在');
        const isTeamMember = await this.prisma.teamMember.findUnique({ where: { userId_teamId: { userId: dto.userId, teamId: project.teamId } } });
        if (!isTeamMember) throw new BadRequestException('只能添加团队成员到项目');
        const existing = await this.prisma.projectMember.findUnique({ where: { userId_projectId: { userId: dto.userId, projectId } } });
        if (existing) throw new ForbiddenException('该用户已是项目成员');
        await this.prisma.projectMember.create({ data: { userId: dto.userId, projectId, role: dto.role || 'member' } });
        const operator = await this.prisma.user.findUnique({ where: { id: operatorId } });
        await this.notifications.notifyProjectMemberAdded(project.name, dto.userId, operator?.name || '某人');
        return this.findOne(projectId, operatorId);
    }

    async updateMember(projectId: string, memberId: string, dto: UpdateProjectMemberDto, operatorId: string) { // 更新成员角色
        await this.checkPermission(projectId, operatorId, ['owner']);
        const member = await this.prisma.projectMember.findUnique({ where: { id: memberId } });
        if (!member || member.projectId !== projectId) throw new NotFoundException('成员不存在');
        if (member.role === 'owner') throw new ForbiddenException('无法修改项目所有者角色');
        await this.prisma.projectMember.update({ where: { id: memberId }, data: { role: dto.role } });
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        const operator = await this.prisma.user.findUnique({ where: { id: operatorId } });
        await this.notifications.notifyProjectRoleChanged(project?.name || '', member.userId, dto.role, operator?.name || '某人');
        return this.findOne(projectId);
    }

    async removeMember(projectId: string, memberId: string, operatorId: string) { // 移除成员
        await this.checkPermission(projectId, operatorId, ['owner', 'admin']);
        const member = await this.prisma.projectMember.findUnique({ where: { id: memberId } });
        if (!member || member.projectId !== projectId) throw new NotFoundException('成员不存在');
        if (member.role === 'owner') throw new ForbiddenException('无法移除项目所有者');
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        const operator = await this.prisma.user.findUnique({ where: { id: operatorId } });
        await this.notifications.notifyProjectMemberRemoved(project?.name || '', member.userId, operator?.name || '某人');
        // 清理被移除成员在该项目下负责的任务
        await this.prisma.$transaction([
            this.prisma.task.updateMany({ where: { projectId, assigneeId: member.userId }, data: { assigneeId: null } }),
            this.prisma.projectMember.delete({ where: { id: memberId } }),
        ]);
        return this.findOne(projectId, operatorId);
    }

    async getStats(id: string, userId?: string) { // 获取项目统计数据
        const project = await this.prisma.project.findUnique({ where: { id }, include: { tasks: { select: { status: true, priority: true } }, members: { select: { userId: true } } } });
        if (!project) throw new NotFoundException('项目不存在');
        if (userId) { // 验证权限
            const isMember = project.members.some(m => m.userId === userId);
            if (!isMember) {
                const isTeamMember = await this.prisma.teamMember.findUnique({ where: { userId_teamId: { userId, teamId: project.teamId } } });
                if (!isTeamMember) throw new ForbiddenException('无权访问此项目');
            }
        }
        const tasks = project.tasks;
        const total = tasks.length;
        const byStatus = { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 };
        const byPriority = { LOW: 0, MEDIUM: 0, HIGH: 0 };
        tasks.forEach(t => { byStatus[t.status] = (byStatus[t.status] || 0) + 1; byPriority[t.priority] = (byPriority[t.priority] || 0) + 1; });
        const progress = total > 0 ? Math.round((byStatus.DONE / total) * 100) : 0;
        return { total, byStatus, byPriority, progress };
    }

    private async checkPermission(projectId: string, userId: string, allowedRoles: string[]) { // 权限检查
        const member = await this.prisma.projectMember.findUnique({ where: { userId_projectId: { userId, projectId } } });
        if (!member || !allowedRoles.includes(member.role)) throw new ForbiddenException('无权执行此操作');
    }

    private format(project: ProjectEntity) { // 格式化输出
        return {
            ...project,
            createdAt: project.createdAt?.toISOString(),
            updatedAt: project.updatedAt?.toISOString(),
            startDate: project.startDate?.toISOString() || null,
            endDate: project.endDate?.toISOString() || null,
            archivedAt: project.archivedAt?.toISOString() || null,
            taskCount: project._count?.tasks || 0,
            members: project.members?.map(m => ({ id: m.id, role: m.role, joinedAt: m.joinedAt?.toISOString(), user: { id: m.user.id, name: m.user.name, email: m.user.email, avatar: m.user.avatar, color: m.user.color } })) || [],
        };
    }

    // ========== 项目驾驶舱 (Cockpit) 方法 ==========

    async getCockpitData(projectId: string, userId?: string): Promise<ProjectCockpitData> {
        const project = await this.prisma.project.findUnique({
            where: { id: projectId },
            include: { members: { select: { userId: true } } },
        });
        if (!project) throw new NotFoundException('项目不存在');
        await this.verifyProjectAccess(userId, project.teamId, project.members);

        const [stats, risks, teamWorkload, activities] = await Promise.all([
            this.getCockpitStats(projectId),
            this.getRiskTasks(projectId),
            this.getTeamWorkload(projectId),
            this.getRecentActivities(projectId, 20),
        ]);

        return {
            stats,
            risks,
            burndown: [],
            cumulativeFlow: [],
            teamWorkload,
            activities,
        };
    }

    private async verifyProjectAccess(userId: string | undefined, teamId: string, members: { userId: string }[]) {
        if (!userId) return;
        const isMember = members.some(m => m.userId === userId);
        if (isMember) return;
        const isTeamMember = await this.prisma.teamMember.findUnique({
            where: { userId_teamId: { userId, teamId } },
        });
        if (!isTeamMember) throw new ForbiddenException('无权访问此项目');
    }

    private async getCockpitStats(projectId: string) {
        const tasks = await this.prisma.task.findMany({
            where: { projectId, isArchived: false },
            select: { status: true, priority: true },
        });
        const total = tasks.length;
        const byStatus = { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 };
        const byPriority = { LOW: 0, MEDIUM: 0, HIGH: 0 };
        tasks.forEach(t => {
            byStatus[t.status] = (byStatus[t.status] || 0) + 1;
            byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
        });
        const progress = total > 0 ? Math.round((byStatus.DONE / total) * 100) : 0;
        return { total, byStatus, byPriority, progress };
    }

    private async getRiskTasks(projectId: string): Promise<CockpitRiskTasks> {
        const now = new Date();
        const overdue = await this.prisma.task.findMany({
            where: { projectId, isArchived: false, dueDate: { lt: now }, status: { not: 'DONE' } },
            select: { id: true, title: true, assignee: { select: { id: true, name: true, avatar: true } } },
            orderBy: { dueDate: 'asc' },
            take: 10,
        });
        const highPriority = await this.prisma.task.findMany({
            where: { projectId, isArchived: false, priority: 'HIGH', status: 'TODO' },
            select: { id: true, title: true, assignee: { select: { id: true, name: true, avatar: true } } },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });
        const blocked = await this.prisma.task.findMany({
            where: { projectId, isArchived: false, dependsOn: { isEmpty: false }, status: { not: 'DONE' } },
            select: { id: true, title: true, assignee: { select: { id: true, name: true, avatar: true } } },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });
        return { overdue, highPriority, blocked };
    }

    private async getTeamWorkload(projectId: string): Promise<TeamMemberWorkload[]> {
        const members = await this.prisma.projectMember.findMany({
            where: { projectId },
            include: { user: { select: { id: true, name: true, avatar: true } } },
        });
        const workloads: TeamMemberWorkload[] = [];
        for (const member of members) {
            const tasks = await this.prisma.task.findMany({
                where: { projectId, assigneeId: member.userId, isArchived: false },
                select: { status: true, priority: true },
            });
            const byStatus: Record<string, number> = {};
            const byPriority: Record<string, number> = {};
            tasks.forEach(t => {
                byStatus[t.status] = (byStatus[t.status] || 0) + 1;
                byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
            });
            workloads.push({
                user: member.user,
                total: tasks.length,
                byStatus,
                byPriority,
            });
        }
        return workloads;
    }

    private async getRecentActivities(projectId: string, limit: number): Promise<ProjectActivity[]> {
        const logs = await this.prisma.auditLog.findMany({
            where: { teamId: projectId },
            include: { user: { select: { id: true, name: true, avatar: true } } },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        return logs.map(l => ({
            id: l.id,
            action: l.action,
            entityType: l.entityType,
            entityId: l.entityId,
            entityName: '',
            user: l.user,
            createdAt: l.createdAt.toISOString(),
            metadata: { oldValue: l.oldValue, newValue: l.newValue },
        }));
    }
}
