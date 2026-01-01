import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Task } from '../tasks/dto/task.dto';

@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:3000'], credentials: true } })
export class TasksGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(TasksGateway.name);
  @WebSocketServer() server: Server;
  private userTeams = new Map<string, string>();

  constructor(private jwt: JwtService) { }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = client.handshake.auth?.token;
      if (!token) { client.disconnect(); return; }
      const payload = this.jwt.verify(token);
      client.data.userId = payload.sub;
      const teamId = client.handshake.query.teamId as string;
      if (teamId) {
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
  handleJoinTeam(client: Socket, teamId: string) {
    const oldTeamId = this.userTeams.get(client.id);
    if (oldTeamId) client.leave(`team:${oldTeamId}`);
    client.join(`team:${teamId}`);
    this.userTeams.set(client.id, teamId);
  }

  @SubscribeMessage('task:create')
  handleCreate(client: Socket, payload: Task): void {
    const teamId = this.userTeams.get(client.id);
    if (teamId) client.to(`team:${teamId}`).emit('task:created', payload);
    else client.broadcast.emit('task:created', payload);
  }

  @SubscribeMessage('task:update')
  handleUpdate(client: Socket, payload: Task): void {
    const teamId = this.userTeams.get(client.id);
    if (teamId) client.to(`team:${teamId}`).emit('task:updated', payload);
    else client.broadcast.emit('task:updated', payload);
  }

  @SubscribeMessage('task:delete')
  handleDelete(client: Socket, payload: string): void {
    const teamId = this.userTeams.get(client.id);
    if (teamId) client.to(`team:${teamId}`).emit('task:deleted', payload);
    else client.broadcast.emit('task:deleted', payload);
  }
}

