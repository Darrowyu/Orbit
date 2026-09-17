import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TasksGateway } from './tasks.gateway';
import { getJwtSecret } from '../common/jwt-config';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: getJwtSecret(config),
      }),
    }),
  ],
  providers: [TasksGateway],
  exports: [TasksGateway],
})
export class GatewayModule {}
