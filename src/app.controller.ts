import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
	constructor(private readonly prisma: PrismaService) { }

	@Get()
	getHello(): string {
		return 'Reviews Widget API is running! 🚀';
	}

	@Get('health')
	async getHealth() {
		try {
			await this.prisma.$queryRaw`SELECT 1`;
			return {
				status: 'OK',
				database: 'Connected',
				timestamp: new Date().toISOString(),
				environment: process.env.NODE_ENV || 'development',
			};
		} catch (error) {
			return {
				status: 'ERROR',
				database: 'Disconnected',
				error: error.message,
				timestamp: new Date().toISOString(),
			};
		}
	}

	@Get('test-data')
	async getTestData() {
		try {
			const users = await this.prisma.user.findMany({
				select: {
					id: true,
					email: true,
					name: true,
					createdAt: true,
				},
			});

			const sites = await this.prisma.site.findMany({
				include: {
					user: {
						select: { name: true, email: true },
					},
					_count: {
						select: { reviews: true },
					},
				},
			});

			const reviews = await this.prisma.review.findMany({
				include: {
					site: {
						select: { name: true, domain: true },
					},
				},
				take: 10,
				orderBy: {
					createdAt: 'desc',
				},
			});

			return {
				summary: {
					users: users.length,
					sites: sites.length,
					reviews: reviews.length,
				},
				data: {
					users,
					sites,
					recent_reviews: reviews,
				},
			};
		} catch (error) {
			return {
				error: error.message,
				details: 'Make sure database is running and migrations are applied',
			};
		}
	}

	@Get('db-status')
	async getDatabaseStatus() {
		try {
			const [users, sites, reviews] = await Promise.all([
				this.prisma.user.count(),
				this.prisma.site.count(),
				this.prisma.review.count(),
			]);

			await this.prisma.$queryRaw`SELECT version()`;

			return {
				status: 'healthy',
				counts: { users, sites, reviews },
				connection: 'active',
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			return {
				status: 'error',
				error: error.message,
				suggestion: 'Check if PostgreSQL is running and Prisma migrations are applied',
			};
		}
	}
}