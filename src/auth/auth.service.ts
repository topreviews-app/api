import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
	constructor(
		private prisma: PrismaService,
		private jwtService: JwtService,
	) { }

	async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
		const { email, password, name } = registerDto;

		const existingUser = await this.prisma.user.findUnique({
			where: { email },
		});

		if (existingUser) {
			throw new ConflictException('User with this email already exists');
		}

		const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
		const hashedPassword = await bcrypt.hash(password, bcryptRounds);

		const user = await this.prisma.user.create({
			data: {
				email,
				password: hashedPassword,
				name,
			},
			select: {
				id: true,
				email: true,
				name: true,
			},
		});

		const tokens = await this.generateTokens(user.id, user.email);

		return {
			...tokens,
			user: {
				id: user.id,
				email: user.email,
				name: user.name || '',
			},
		};
	}

	async login(loginDto: LoginDto): Promise<AuthResponseDto> {
		const { email, password } = loginDto;

		const user = await this.prisma.user.findUnique({
			where: { email },
		});

		if (!user) {
			throw new UnauthorizedException('Invalid credentials');
		}

		const isPasswordValid = await bcrypt.compare(password, user.password);
		if (!isPasswordValid) {
			throw new UnauthorizedException('Invalid credentials');
		}

		const tokens = await this.generateTokens(user.id, user.email);

		return {
			...tokens,
			user: {
				id: user.id,
				email: user.email,
				name: user.name || '',
			},
		};
	}

	async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
		try {
			const refreshSecret = process.env.JWT_REFRESH_SECRET;
			if (!refreshSecret) {
				throw new Error('JWT_REFRESH_SECRET is not defined');
			}

			const payload = this.jwtService.verify(refreshToken, {
				secret: refreshSecret,
			});

			const user = await this.prisma.user.findUnique({
				where: { id: payload.sub },
			});

			if (!user) {
				throw new UnauthorizedException('User not found');
			}

			const expiresIn = process.env.JWT_EXPIRES_IN || '15m';
			const accessToken = this.jwtService.sign(
				{ sub: user.id, email: user.email },
				{ expiresIn },
			);

			return { accessToken };
		} catch (error) {
			throw new UnauthorizedException('Invalid refresh token');
		}
	}

	private async generateTokens(userId: string, email: string) {
		const payload = { sub: userId, email };

		const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
		const refreshSecret = process.env.JWT_REFRESH_SECRET;
		const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

		if (!refreshSecret) {
			throw new Error('JWT_REFRESH_SECRET is not defined');
		}

		const [accessToken, refreshToken] = await Promise.all([
			this.jwtService.signAsync(payload, {
				expiresIn: jwtExpiresIn,
			}),
			this.jwtService.signAsync(payload, {
				secret: refreshSecret,
				expiresIn: refreshExpiresIn,
			}),
		]);

		return {
			accessToken,
			refreshToken,
		};
	}
}