import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
	sub: string;
	email: string;
	iat?: number;
	exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(private prisma: PrismaService) {
		const jwtSecret = process.env.JWT_SECRET;

		if (!jwtSecret) {
			throw new Error('JWT_SECRET is not defined in environment variables');
		}

		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: jwtSecret, // Тепер TypeScript знає що це string
		});
	}

	async validate(payload: JwtPayload) {
		const user = await this.prisma.user.findUnique({
			where: { id: payload.sub },
			select: { id: true, email: true, name: true },
		});

		if (!user) {
			throw new UnauthorizedException('User not found');
		}

		return user;
	}
}