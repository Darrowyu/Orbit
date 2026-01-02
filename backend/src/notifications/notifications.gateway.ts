import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable } from '@nestjs/common';

@Injectable()
@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:3000'], credentials: true } })
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private userSockets = new Map<string, Set<string>>(); // userId -> socketIds

  constructor(private jwt: JwtService) { }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) { client.disconnect(); return; }
      const payload = this.jwt.verify(token);
      const userId = payload.sub;
      client.data.userId = userId;
      if (!this.userSockets.has(userId)) this.userSockets.set(userId, new Set());
      this.userSockets.get(userId)!.add(client.id);
      client.join(`user:${userId}`);
    } catch { client.disconnect(); }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(client.id);
      if (this.userSockets.get(userId)!.size === 0) this.userSockets.delete(userId);
    }
  }

  sendToUser(userId: string, notification: Record<string, unknown>) {
    this.server?.to(`user:${userId}`).emit('notification', notification);
  }
}
