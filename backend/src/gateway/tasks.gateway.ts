import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:1234'], credentials: true } })
export class TasksGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(TasksGateway.name);
  @WebSocketServer() server: Server;
  private userTeams = new Map<string, string>();

  constructor(private jwt: JwtService, private prisma: PrismaService) { }

  private async verifyTeamMember(userId: string, teamId: string): Promise<boolean> {
    const member = await this.prisma.teamMember.findUnique({ where: { userId_teamId: { userId, teamId } } });
    return !!member;
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = client.handshake.auth?.token;
      if (!token) { client.disconnect(); return; }
      const payload = this.jwt.verify(token);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, isActive: true } });
      if (!user || !user.isActive) { client.disconnect(); return; } // 用户不存在或已禁用
      client.data.userId = payload.sub;
      const teamId = client.handshake.query.teamId as string;
      if (teamId) {
        const isMember = await this.verifyTeamMember(payload.sub, teamId);
        if (!isMember) { client.disconnect(); return; } // 非团队成员断开连接
        client.join(`team:${teamId}`);
        this.userTeams.set(client.id, teamId);
      }
      this.logger.debug(`Client connected: ${client.id}, team: ${teamId || 'none'}`);
    } catch { client.disconnect(); }
  }

  handleDisconnect(client: Socket): void {
    this.userTeams.delete(client.id);
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:team') // 允许动态切换团队
  async handleJoinTeam(client: Socket, teamId: string) {
    const userId = client.data.userId;
    if (!userId) return;
    const isMember = await this.verifyTeamMember(userId, teamId);
    if (!isMember) {
      client.emit('error', { message: '您不是该团队成员' });
      return;
    }
    const oldTeamId = this.userTeams.get(client.id);
    if (oldTeamId) client.leave(`team:${oldTeamId}`);
    client.join(`team:${teamId}`);
    this.userTeams.set(client.id, teamId);
  }

  // 服务端权威广播：写库成功后由 service 层调用，客户端不再有任务事件上行通道
  emitTaskCreated(teamId: string, task: unknown): void {
    this.server?.to(`team:${teamId}`).emit('task:created', task);
  }

  emitTaskUpdated(teamId: string, task: unknown): void {
    this.server?.to(`team:${teamId}`).emit('task:updated', task);
  }

  emitTaskDeleted(teamId: string, taskId: string): void {
    this.server?.to(`team:${teamId}`).emit('task:deleted', taskId);
  }

  emitCommentCreated(teamId: string, comment: unknown): void {
    this.server?.to(`team:${teamId}`).emit('comment:created', comment);
  }

  emitCommentDeleted(teamId: string, commentId: string): void {
    this.server?.to(`team:${teamId}`).emit('comment:deleted', commentId);
  }
}

