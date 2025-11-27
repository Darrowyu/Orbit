import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: { origin: ['http://localhost:3000'], credentials: true } })
export class TasksGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(private jwt: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) { client.disconnect(); return; }
      this.jwt.verify(token);
      console.log(`Client connected: ${client.id}`);
    } catch { client.disconnect(); }
  }

  handleDisconnect(client: Socket) { console.log(`Client disconnected: ${client.id}`); }

  @SubscribeMessage('task:create')
  handleCreate(client: Socket, payload: any) { client.broadcast.emit('task:created', payload); }

  @SubscribeMessage('task:update')
  handleUpdate(client: Socket, payload: any) { client.broadcast.emit('task:updated', payload); }

  @SubscribeMessage('task:delete')
  handleDelete(client: Socket, payload: string) { client.broadcast.emit('task:deleted', payload); }
}
