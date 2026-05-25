import { Body, Controller, Get, Headers, Post } from '@nestjs/common';

import { AuthService } from './auth.service';

import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterAuthDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginAuthDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  me(@Headers('authorization') authorizationHeader?: string | string[]) {
    return this.authService.me(authorizationHeader);
  }

  @Post('logout')
  logout(@Headers('authorization') authorizationHeader?: string | string[]) {
    return this.authService.logout(authorizationHeader);
  }
}
