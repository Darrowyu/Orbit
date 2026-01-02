import { Controller, Post, Body, Get, UseGuards, Request, Ip, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService, private users: UsersService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) { return this.auth.register(dto); }

  @Post('login')
  login(@Body() dto: LoginDto, @Ip() ip: string, @Headers('user-agent') ua: string) { return this.auth.login(dto, ip, ua); }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Request() req) {
    const user = await this.users.findById(req.user.sub);
    if (!user) return null;
    return this.auth.sanitize(user);
  }
}
