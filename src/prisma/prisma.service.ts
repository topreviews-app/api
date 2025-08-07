import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
	async onModuleInit() {
		await this.$connect();
		console.log('✅ Connected to database');
	}

	async onModuleDestroy() {
		await this.$disconnect();
		console.log('❌ Disconnected from database');
	}

	async cleanDatabase() {
		if (process.env.NODE_ENV === 'production') return;

		const tablenames = await this.$queryRaw<
			Array<{ tablename: string }>
		>`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

		for (const { tablename } of tablenames) {
			if (tablename !== '_prisma_migrations') {
				try {
					await this.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
				} catch (error) {
					console.log({ error });
				}
			}
		}
	}

	async findUserById(id: string) {
		return this.user.findUnique({
			where: { id },
			select: {
				id: true,
				email: true,
				name: true,
				createdAt: true,
				updatedAt: true,
			},
		});
	}

	async findUserByEmail(email: string) {
		return this.user.findUnique({
			where: { email },
		});
	}

	async findUserSites(userId: string) {
		return this.site.findMany({
			where: { userId },
			include: {
				_count: {
					select: { reviews: true },
				},
			},
		});
	}

	async findSiteReviews(siteId: string, status?: 'PENDING' | 'APPROVED' | 'HIDDEN' | 'DELETED') {
		return this.review.findMany({
			where: {
				siteId,
				...(status && { status }),
			},
			orderBy: {
				createdAt: 'desc',
			},
		});
	}
}