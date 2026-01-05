import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto, AddProjectMemberDto, UpdateProjectMemberDto } from './dto/project.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedRequest } from '../common/types';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService, private prisma: PrismaService) { }

    private async getUserInfo(req: AuthenticatedRequest) { // 获取用户信息（userId 和 currentTeamId）
        const user = await this.prisma.user.findUnique({ where: { id: req.user.sub } });
        if (!user?.currentTeamId) throw new ForbiddenException('请先加入或创建团队');
        return { userId: user.id, teamId: user.currentTeamId };
    }

    @Get()
    async findAll(@Req() req, @Query('archived') archived: string) { // 获取当前团队的所有项目
        const { teamId } = await this.getUserInfo(req);
        return this.projectsService.findAll(teamId, archived === 'true');
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @Req() req) { // 获取项目详情
        const { userId } = await this.getUserInfo(req);
        return this.projectsService.findOne(id, userId);
    }

    @Get(':id/stats')
    async getStats(@Param('id') id: string, @Req() req) { // 获取项目统计
        const { userId } = await this.getUserInfo(req);
        return this.projectsService.getStats(id, userId);
    }

    @Post()
    async create(@Body() dto: CreateProjectDto, @Req() req) { // 创建项目
        const { userId, teamId } = await this.getUserInfo(req);
        return this.projectsService.create(dto, teamId, userId);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateProjectDto, @Req() req) { // 更新项目
        const { userId } = await this.getUserInfo(req);
        return this.projectsService.update(id, dto, userId);
    }

    @Post(':id/archive')
    async archive(@Param('id') id: string, @Body() body: { archiveTasks?: boolean }, @Req() req) { // 归档项目
        const { userId } = await this.getUserInfo(req);
        return this.projectsService.archive(id, userId, { archiveTasks: body?.archiveTasks });
    }

    @Post(':id/restore')
    async restore(@Param('id') id: string, @Req() req) { // 恢复项目
        const { userId } = await this.getUserInfo(req);
        return this.projectsService.restore(id, userId);
    }

    @Delete(':id')
    async remove(@Param('id') id: string, @Query('force') force: string, @Req() req) { // 删除项目
        const { userId } = await this.getUserInfo(req);
        return this.projectsService.remove(id, userId, { force: force === 'true' });
    }

    @Post(':id/members')
    async addMember(@Param('id') id: string, @Body() dto: AddProjectMemberDto, @Req() req) { // 添加成员
        const { userId } = await this.getUserInfo(req);
        return this.projectsService.addMember(id, dto, userId);
    }

    @Put(':id/members/:memberId')
    async updateMember(@Param('id') id: string, @Param('memberId') memberId: string, @Body() dto: UpdateProjectMemberDto, @Req() req) { // 更新成员角色
        const { userId } = await this.getUserInfo(req);
        return this.projectsService.updateMember(id, memberId, dto, userId);
    }

    @Delete(':id/members/:memberId')
    async removeMember(@Param('id') id: string, @Param('memberId') memberId: string, @Req() req) { // 移除成员
        const { userId } = await this.getUserInfo(req);
        return this.projectsService.removeMember(id, memberId, userId);
    }
}
