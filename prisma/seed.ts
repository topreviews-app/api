// Fixed seed.ts 
// prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Starting database seeding...\n');

	// ==================================
	// USERS CREATION
	// ==================================

	const hashedPassword = await bcrypt.hash('password123', 12);

	// Create FREE user
	const freeUser = await prisma.user.upsert({
		where: { email: 'test@example.com' },
		update: {},
		create: {
			email: 'test@example.com',
			password: hashedPassword,
			name: 'John Smith',
			plan: 'FREE',
		},
	});

	// Create PREMIUM user
	const premiumUser = await prisma.user.upsert({
		where: { email: 'premium@example.com' },
		update: {},
		create: {
			email: 'premium@example.com',
			password: hashedPassword,
			name: 'Sarah Johnson',
			plan: 'PREMIUM',
		},
	});

	console.log('✅ Created users:', { freeUser: freeUser.email, premiumUser: premiumUser.email });

	// ==================================
	// SITES CREATION
	// ==================================

	// FREE user sites (1 site max)
	const restaurantSite = await prisma.site.upsert({
		where: { id: 'test-restaurant-id' },
		update: {},
		create: {
			id: 'test-restaurant-id',
			name: 'Mama Mia Pizzeria',
			domain: 'mama-mia-pizza.com',
			userId: freeUser.id,
			settings: {
				theme: 'light',
				primaryColor: '#e74c3c',
				backgroundColor: '#ffffff',
				textColor: '#333333',
				borderRadius: '8px',
				showAvatar: true,
				showDate: true,
				layout: 'cards',
				maxReviews: 10,
				showRating: true,
				showSubmitForm: true,
			},
		},
	});

	// PREMIUM user sites (multiple sites)
	const ecommerceSite = await prisma.site.create({
		data: {
			name: 'Fashion Store',
			domain: 'fashion-store.com',
			userId: premiumUser.id,
			settings: {
				theme: 'dark',
				primaryColor: '#3498db',
				backgroundColor: '#2c3e50',
				textColor: '#ffffff',
				borderRadius: '12px',
				showAvatar: false,
				showDate: true,
				layout: 'list',
				maxReviews: 15,
				showRating: true,
				showSubmitForm: true,
			},
		},
	});

	const serviceSite = await prisma.site.create({
		data: {
			name: 'City Barber Shop',
			domain: 'city-barber.com',
			userId: premiumUser.id,
			settings: {
				theme: 'light',
				primaryColor: '#27ae60',
				backgroundColor: '#f8f9fa',
				textColor: '#2c3e50',
				borderRadius: '6px',
				showAvatar: true,
				showDate: false,
				layout: 'cards',
				maxReviews: 8,
				showRating: true,
				showSubmitForm: true,
			},
		},
	});

	console.log('✅ Created sites:', {
		restaurant: restaurantSite.name,
		ecommerce: ecommerceSite.name,
		service: serviceSite.name
	});

	// ==================================
	// REVIEWS CREATION - FIXED
	// ==================================

	const reviewsData = [
		// Restaurant reviews
		{
			siteId: restaurantSite.id,
			authorName: 'Maria Garcia',
			authorEmail: 'maria@example.com',
			rating: 5,
			comment: 'Amazing Margherita pizza! The crust was perfect and ingredients fresh. Delivery was super fast too. Will definitely order again! 🍕',
			status: 'APPROVED' as const,
			ipAddress: '192.168.1.101',
			userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
			country: 'Ukraine',
		},
		{
			siteId: restaurantSite.id,
			authorName: 'Alex Petrov',
			authorEmail: 'alex@example.com',
			rating: 4,
			comment: 'Good pizza, reasonable prices. The Quattro Stagioni was delicious. Only issue was the delivery time - took about 45 minutes.',
			status: 'APPROVED' as const,
			ipAddress: '192.168.1.102',
			userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
			country: 'Ukraine',
		},
		{
			siteId: restaurantSite.id,
			authorName: 'Viktor Shevchenko',
			authorEmail: 'viktor@example.com',
			rating: 3,
			comment: 'Pizza was okay, but not outstanding. Service could be improved.',
			status: 'PENDING' as const,
			ipAddress: '192.168.1.103',
			userAgent: 'Mozilla/5.0 (Android 11; Mobile; rv:68.0)',
			country: 'Ukraine',
		},
		{
			siteId: restaurantSite.id,
			authorName: 'Anna Kovalenko',
			authorEmail: 'anna@example.com',
			rating: 5,
			comment: 'Найкраща піца в місті! Швидка доставка, гарячі страви. Дуже рекомендую Діабло - остра але смачна!',
			status: 'APPROVED' as const,
			ipAddress: '192.168.1.104',
			userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
			country: 'Ukraine',
		},

		// Fashion store reviews
		{
			siteId: ecommerceSite.id,
			authorName: 'Emma Wilson',
			authorEmail: 'emma@example.com',
			rating: 4,
			comment: 'Love the quality of the jeans I ordered. Fit perfectly and arrived quickly. Great online shopping experience!',
			status: 'APPROVED' as const,
			ipAddress: '10.0.0.201',
			userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
			country: 'Poland',
		},
		{
			siteId: ecommerceSite.id,
			authorName: 'Michael Brown',
			authorEmail: 'michael@example.com',
			rating: 5,
			comment: 'Excellent customer service! Had an issue with sizing and they resolved it immediately. The shirts are high quality.',
			status: 'APPROVED' as const,
			ipAddress: '10.0.0.202',
			userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)',
			country: 'Germany',
		},

		// Barber shop reviews
		{
			siteId: serviceSite.id,
			authorName: 'David Kim',
			authorEmail: 'david@example.com',
			rating: 5,
			comment: 'Best haircut I\'ve had in years! Professional service, clean environment. Master Sergiy knows his craft perfectly.',
			status: 'APPROVED' as const,
			ipAddress: '172.16.0.301',
			userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
			country: 'Ukraine',
		},
		{
			siteId: serviceSite.id,
			authorName: 'James Rodriguez',
			authorEmail: 'james@example.com',
			rating: 4,
			comment: 'Great atmosphere and skilled barbers. Booking online was easy. Price is fair for the quality.',
			status: 'APPROVED' as const,
			ipAddress: '172.16.0.302',
			userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
			country: 'Spain',
		},
	];

	// Create reviews with realistic timestamps
	const reviews = [];
	for (let i = 0; i < reviewsData.length; i++) {
		const reviewData = reviewsData[i];
		const daysAgo = Math.floor(Math.random() * 30) + 1; // Random date within last 30 days
		const createdAt = new Date();
		createdAt.setDate(createdAt.getDate() - daysAgo);
		createdAt.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

		const review = await prisma.review.create({
			data: {
				...reviewData,
				createdAt,
			},
		});
		reviews.push(review);
	}

	console.log(`✅ Created ${reviews.length} reviews`);

	// ==================================
	// ANALYTICS DATA CREATION
	// ==================================

	// Generate widget views for the last 30 days
	const widgetViews = [];
	const siteIds = [restaurantSite.id, ecommerceSite.id, serviceSite.id];
	const countries = ['Ukraine', 'Poland', 'Germany', 'Spain', 'USA'];
	const userAgents = [
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
		'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
		'Mozilla/5.0 (Android 11; Mobile; rv:68.0)',
		'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)',
	];

	for (let day = 0; day < 30; day++) {
		const viewsForDay = Math.floor(Math.random() * 50) + 10; // 10-60 views per day per site

		for (let view = 0; view < viewsForDay; view++) {
			const siteId = siteIds[Math.floor(Math.random() * siteIds.length)];
			const country = countries[Math.floor(Math.random() * countries.length)];
			const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

			const viewTime = new Date();
			viewTime.setDate(viewTime.getDate() - day);
			viewTime.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

			const widgetView = await prisma.widgetView.create({
				data: {
					siteId,
					ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
					userAgent,
					referrer: Math.random() > 0.5 ? 'https://google.com' : 'https://facebook.com',
					country,
					createdAt: viewTime,
				},
			});
			widgetViews.push(widgetView);
		}
	}

	console.log(`✅ Created ${widgetViews.length} widget views`);

	// ==================================
	// NOTIFICATION LOGS
	// ==================================

	// Create some notification logs
	const notifications = await Promise.all([
		prisma.notificationLog.create({
			data: {
				userId: freeUser.id,
				type: 'NEW_REVIEW',
				status: 'SENT',
				data: {
					reviewId: reviews[0].id,
					subject: 'New review received',
					email: freeUser.email,
				},
				sentAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
			},
		}),
		prisma.notificationLog.create({
			data: {
				userId: premiumUser.id,
				type: 'WEEKLY_DIGEST',
				status: 'SENT',
				data: {
					subject: 'Your weekly reviews summary',
					email: premiumUser.email,
					reviewsCount: 5,
				},
				sentAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
			},
		}),
	]);

	console.log(`✅ Created ${notifications.length} notification logs`);

	// ==================================
	// FINAL STATISTICS
	// ==================================

	const stats = await Promise.all([
		prisma.user.count(),
		prisma.site.count(),
		prisma.review.count(),
		prisma.widgetView.count(),
		prisma.notificationLog.count(),
	]);-

	console.log('\n📊 Database seeding completed!');
	console.log('=================================');
	console.log(`👥 Users: ${stats[0]}`);
	console.log(`🏢 Sites: ${stats[1]}`);
	console.log(`⭐ Reviews: ${stats[2]}`);
	console.log(`📈 Widget Views: ${stats[3]}`);
	console.log(`📧 Notifications: ${stats[4]}`);

	console.log('\n🔑 Test Credentials:');
	console.log('FREE User: test@example.com / password123');
	console.log('PREMIUM User: premium@example.com / password123');

	console.log('\n🎨 Test Widget URLs:');
	console.log(`🍕 Restaurant: http://localhost:3001/widget/${restaurantSite.id}`);
	console.log(`👕 Fashion Store: http://localhost:3001/widget/${ecommerceSite.id}`);
	console.log(`✂️ Barber Shop: http://localhost:3001/widget/${serviceSite.id}`);
}

main()
	.catch((e) => {
		console.error('❌ Seeding failed:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
		console.log('\n🔌 Database connection closed');
	});