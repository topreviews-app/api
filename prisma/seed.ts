import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
	// Хешуємо пароль для тестового користувача
	const hashedPassword = await bcrypt.hash('password123', 12);

	// Створюємо тестового користувача
	const user = await prisma.user.upsert({
		where: { email: 'test@example.com' },
		update: {},
		create: {
			email: 'test@example.com',
			password: hashedPassword,
			name: 'Test User',
		},
	});

	console.log('Created user:', user);

	// Створюємо тестовий сайт
	const site = await prisma.site.upsert({
		where: { id: 'test-site-id' },
		update: {},
		create: {
			id: 'test-site-id',
			name: 'Test Restaurant',
			domain: 'test-restaurant.com',
			userId: user.id,
			plan: 'FREE',
			settings: {
				theme: 'light',
				primaryColor: '#007bff',
				backgroundColor: '#ffffff',
				textColor: '#333333',
			},
		},
	});

	console.log('Created site:', site);

	// Створюємо тестові відгуки
	const reviews = await Promise.all([
		prisma.review.create({
			data: {
				siteId: site.id,
				authorName: 'John Doe',
				authorEmail: 'john@example.com',
				rating: 5,
				comment: 'Amazing food and excellent service! Will definitely come back.',
				status: 'APPROVED',
				ipAddress: '192.168.1.1',
				userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
			},
		}),
		prisma.review.create({
			data: {
				siteId: site.id,
				authorName: 'Jane Smith',
				authorEmail: 'jane@example.com',
				rating: 4,
				comment: 'Good food, but delivery was a bit slow.',
				status: 'PENDING',
				ipAddress: '192.168.1.2',
				userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
			},
		}),
		prisma.review.create({
			data: {
				siteId: site.id,
				authorName: 'Bob Wilson',
				authorEmail: 'bob@example.com',
				rating: 5,
				comment: 'Best pizza in town! Fresh ingredients and perfect crust.',
				status: 'APPROVED',
				ipAddress: '192.168.1.3',
				userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
			},
		}),
	]);

	console.log('Created reviews:', reviews.length);

	// Статистика
	const userCount = await prisma.user.count();
	const siteCount = await prisma.site.count();
	const reviewCount = await prisma.review.count();

	console.log('\n📊 Database Statistics:');
	console.log(`Users: ${userCount}`);
	console.log(`Sites: ${siteCount}`);
	console.log(`Reviews: ${reviewCount}`);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});