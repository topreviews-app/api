import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
	constructor(private authService: AuthService) { }

	@Post('register')
	async register(@Body() registerDto: RegisterDto) {
		return this.authService.register(registerDto);
	}

	@Post('login')
	async login(@Body() loginDto: LoginDto) {
		return this.authService.login(loginDto);
	}

	@Post('refresh')
	async refresh(@Body('refreshToken') refreshToken: string) {
		return this.authService.refreshToken(refreshToken);
	}

	@UseGuards(JwtAuthGuard)
	@Get('profile')
	async getProfile(@Request() req) {
		return {
			user: req.user,
			message: 'Profile retrieved successfully',
		};
	}
}