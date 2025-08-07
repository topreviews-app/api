// src/analytics/analytics.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface DashboardStats {
	totalReviews: number;
	thisMonthReviews: number;
	avgRating: number;
	totalViews: number;
	conversionRate: number;
	activeSites: number;
}

export interface SiteAnalytics {
	siteInfo: {
		id: string;
		name: string;
		domain: string;
		plan: string;
	};
	stats: {
		totalReviews: number;
		approvedReviews: number;
		pendingReviews: number;
		totalViews: number;
		conversionRate: number;
		avgRating: number;
	};
	ratingDistribution: Record<number, number>;
	monthlyTrend: Array<{
		month: string;
		reviews: number;
		views: number;
	}>;
	topCountries: Array<{
		country: string;
		views: number;
		reviews: number;
	}>;
	recentActivity: Array<{
		type: 'review' | 'view';
		date: Date;
		data: any;
	}>;
}

@Injectable()
export class AnalyticsService {
	constructor(private prisma: PrismaService) { }

	// ========================================
	// WIDGET VIEW TRACKING
	// ========================================

	async trackWidgetView(
		siteId: string,
		ipAddress: string,
		userAgent?: string,
		referrer?: string,
		country?: string
	): Promise<void> {
		try {
			await this.prisma.widgetView.create({
				data: {
					siteId,
					ipAddress,
					userAgent,
					referrer,
					country: country || this.getCountryFromIP(ipAddress),
				},
			});
		} catch (error) {
			console.error('Failed to track widget view:', error);
			// Don't throw error - analytics shouldn't break widget functionality
		}
	}

	// ========================================
	// DASHBOARD ANALYTICS
	// ========================================

	async getDashboardStats(userId: string): Promise<DashboardStats> {
		// Get user's sites
		const userSites = await this.prisma.site.findMany({
			where: { userId },
			select: { id: true, isActive: true }
		});

		const siteIds = userSites.map(site => site.id);
		const activeSiteIds = userSites.filter(site => site.isActive).map(site => site.id);

		if (siteIds.length === 0) {
			return {
				totalReviews: 0,
				thisMonthReviews: 0,
				avgRating: 0,
				totalViews: 0,
				conversionRate: 0,
				activeSites: 0,
			};
		}

		const [
			totalReviews,
			thisMonthReviews,
			avgRating,
			totalViews,
			activeSites
		] = await Promise.all([
			this.getTotalReviews(siteIds),
			this.getThisMonthReviews(siteIds),
			this.getAverageRating(siteIds),
			this.getTotalViews(siteIds),
			Promise.resolve(activeSiteIds.length)
		]);

		const conversionRate = totalViews > 0
			? Math.round((totalReviews / totalViews) * 100 * 10) / 10
			: 0;

		return {
			totalReviews,
			thisMonthReviews,
			avgRating: Math.round(avgRating * 10) / 10,
			totalViews,
			conversionRate,
			activeSites,
		};
	}

	// ========================================
	// SITE-SPECIFIC ANALYTICS
	// ========================================

	async getSiteAnalytics(siteId: string, userId: string): Promise<SiteAnalytics> {
		// Verify ownership
		const site = await this.prisma.site.findFirst({
			where: { id: siteId, userId },
			include: {
				user: { select: { plan: true } }
			}
		});

		if (!site) {
			throw new NotFoundException('Site not found');
		}

		// Check if user has analytics access
		if (site.user.plan === 'FREE') {
			throw new ForbiddenException('Analytics require PREMIUM plan');
		}

		const [
			reviewStats,
			viewStats,
			ratingDistribution,
			monthlyTrend,
			topCountries,
			recentActivity
		] = await Promise.all([
			this.getSiteReviewStats(siteId),
			this.getSiteViewStats(siteId),
			this.getRatingDistribution(siteId),
			this.getMonthlyTrend(siteId),
			this.getTopCountries(siteId),
			this.getRecentActivity(siteId)
		]);

		const conversionRate = viewStats.totalViews > 0
			? Math.round((reviewStats.totalReviews / viewStats.totalViews) * 100 * 10) / 10
			: 0;

		return {
			siteInfo: {
				id: site.id,
				name: site.name,
				domain: site.domain,
				plan: site.user.plan,
			},
			stats: {
				totalReviews: reviewStats.totalReviews,
				approvedReviews: reviewStats.approvedReviews,
				pendingReviews: reviewStats.pendingReviews,
				totalViews: viewStats.totalViews,
				conversionRate,
				avgRating: reviewStats.avgRating,
			},
			ratingDistribution,
			monthlyTrend,
			topCountries,
			recentActivity,
		};
	}

	// ========================================
	// COMPARISON ANALYTICS
	// ========================================

	async getComparisonData(siteId: string, userId: string, period: 'week' | 'month' = 'month') {
		const site = await this.prisma.site.findFirst({
			where: { id: siteId, userId }
		});

		if (!site) {
			throw new NotFoundException('Site not found');
		}

		const now = new Date();
		const periodStart = new Date();
		const previousPeriodStart = new Date();

		if (period === 'week') {
			periodStart.setDate(now.getDate() - 7);
			previousPeriodStart.setDate(now.getDate() - 14);
		} else {
			periodStart.setMonth(now.getMonth() - 1);
			previousPeriodStart.setMonth(now.getMonth() - 2);
		}

		const [currentPeriod, previousPeriod] = await Promise.all([
			this.getPeriodStats(siteId, periodStart, now),
			this.getPeriodStats(siteId, previousPeriodStart, periodStart)
		]);

		return {
			current: currentPeriod,
			previous: previousPeriod,
			changes: {
				reviewsChange: this.calculatePercentageChange(
					previousPeriod.reviews,
					currentPeriod.reviews
				),
				viewsChange: this.calculatePercentageChange(
					previousPeriod.views,
					currentPeriod.views
				),
				conversionChange: this.calculatePercentageChange(
					previousPeriod.conversionRate,
					currentPeriod.conversionRate
				),
				ratingChange: this.calculatePercentageChange(
					previousPeriod.avgRating,
					currentPeriod.avgRating
				),
			}
		};
	}

	// ========================================
	// PRIVATE HELPER METHODS
	// ========================================

	private async getTotalReviews(siteIds: string[]): Promise<number> {
		return this.prisma.review.count({
			where: {
				siteId: { in: siteIds },
				status: { in: ['APPROVED', 'PENDING'] }
			}
		});
	}

	private async getThisMonthReviews(siteIds: string[]): Promise<number> {
		const startOfMonth = new Date();
		startOfMonth.setDate(1);
		startOfMonth.setHours(0, 0, 0, 0);

		return this.prisma.review.count({
			where: {
				siteId: { in: siteIds },
				status: { in: ['APPROVED', 'PENDING'] },
				createdAt: { gte: startOfMonth }
			}
		});
	}

	private async getAverageRating(siteIds: string[]): Promise<number> {
		const result = await this.prisma.review.aggregate({
			where: {
				siteId: { in: siteIds },
				status: 'APPROVED'
			},
			_avg: { rating: true }
		});

		return result._avg.rating || 0;
	}

	private async getTotalViews(siteIds: string[]): Promise<number> {
		return this.prisma.widgetView.count({
			where: { siteId: { in: siteIds } }
		});
	}

	private async getSiteReviewStats(siteId: string) {
		const [totalReviews, approvedReviews, pendingReviews, avgRatingResult] = await Promise.all([
			this.prisma.review.count({
				where: { siteId, status: { not: 'DELETED' } }
			}),
			this.prisma.review.count({
				where: { siteId, status: 'APPROVED' }
			}),
			this.prisma.review.count({
				where: { siteId, status: 'PENDING' }
			}),
			this.prisma.review.aggregate({
				where: { siteId, status: 'APPROVED' },
				_avg: { rating: true }
			})
		]);

		return {
			totalReviews,
			approvedReviews,
			pendingReviews,
			avgRating: Math.round((avgRatingResult._avg.rating || 0) * 10) / 10,
		};
	}

	private async getSiteViewStats(siteId: string) {
		const totalViews = await this.prisma.widgetView.count({
			where: { siteId }
		});

		return { totalViews };
	}

	private async getRatingDistribution(siteId: string): Promise<Record<number, number>> {
		const ratings = await this.prisma.review.groupBy({
			by: ['rating'],
			where: { siteId, status: 'APPROVED' },
			_count: { rating: true }
		});

		const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
		ratings.forEach(item => {
			distribution[item.rating] = item._count.rating;
		});

		return distribution;
	}

	private async getMonthlyTrend(siteId: string) {
		const sixMonthsAgo = new Date();
		sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

		const [reviewsByMonth, viewsByMonth] = await Promise.all([
			this.prisma.$queryRaw`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
          COUNT(*)::int as count
        FROM "reviews" 
        WHERE "siteId" = ${siteId} 
          AND "status" IN ('APPROVED', 'PENDING')
          AND "createdAt" >= ${sixMonthsAgo}
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month
      `,
			this.prisma.$queryRaw`
        SELECT 
          TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
          COUNT(*)::int as count
        FROM "widget_views" 
        WHERE "siteId" = ${siteId}
          AND "createdAt" >= ${sixMonthsAgo}
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month
      `
		]) as Array<Array<{ month: string; count: number }>>;

		// Merge reviews and views data
		const monthlyData = new Map();

		reviewsByMonth.forEach(item => {
			monthlyData.set(item.month, { month: item.month, reviews: item.count, views: 0 });
		});

		viewsByMonth.forEach(item => {
			const existing = monthlyData.get(item.month) || { month: item.month, reviews: 0, views: 0 };
			existing.views = item.count;
			monthlyData.set(item.month, existing);
		});

		return Array.from(monthlyData.values()).sort((a, b) => a.month.localeCompare(b.month));
	}

	private async getTopCountries(siteId: string, limit: number = 10) {
		const [reviewsByCountry, viewsByCountry] = await Promise.all([
			this.prisma.review.groupBy({
				by: ['country'],
				where: {
					siteId,
					status: 'APPROVED',
					country: { not: null }
				},
				_count: { country: true },
				orderBy: { _count: { country: 'desc' } },
				take: limit
			}),
			this.prisma.widgetView.groupBy({
				by: ['country'],
				where: {
					siteId,
					country: { not: null }
				},
				_count: { country: true },
				orderBy: { _count: { country: 'desc' } },
				take: limit
			})
		]);

		const countriesMap = new Map();

		viewsByCountry.forEach(item => {
			if (item.country) {
				countriesMap.set(item.country, {
					country: item.country,
					views: item._count.country,
					reviews: 0
				});
			}
		});

		reviewsByCountry.forEach(item => {
			if (item.country) {
				const existing = countriesMap.get(item.country) || {
					country: item.country,
					views: 0,
					reviews: 0
				};
				existing.reviews = item._count.country;
				countriesMap.set(item.country, existing);
			}
		});

		return Array.from(countriesMap.values())
			.sort((a, b) => (b.views + b.reviews) - (a.views + a.reviews))
			.slice(0, limit);
	}

	private async getRecentActivity(siteId: string, limit: number = 20) {
		const [recentReviews, recentViews] = await Promise.all([
			this.prisma.review.findMany({
				where: { siteId },
				select: {
					id: true,
					authorName: true,
					rating: true,
					status: true,
					country: true,
					createdAt: true,
				},
				orderBy: { createdAt: 'desc' },
				take: Math.floor(limit / 2),
			}),
			this.prisma.widgetView.findMany({
				where: { siteId },
				select: {
					id: true,
					country: true,
					referrer: true,
					createdAt: true,
				},
				orderBy: { createdAt: 'desc' },
				take: Math.floor(limit / 2),
			})
		]);

		const activity = [
			...recentReviews.map(review => ({
				type: 'review' as const,
				date: review.createdAt,
				data: {
					id: review.id,
					author: review.authorName,
					rating: review.rating,
					status: review.status,
					country: review.country,
				}
			})),
			...recentViews.map(view => ({
				type: 'view' as const,
				date: view.createdAt,
				data: {
					id: view.id,
					country: view.country,
					referrer: view.referrer,
				}
			}))
		];

		return activity
			.sort((a, b) => b.date.getTime() - a.date.getTime())
			.slice(0, limit);
	}

	private async getPeriodStats(siteId: string, startDate: Date, endDate: Date) {
		const [reviews, views, avgRatingResult] = await Promise.all([
			this.prisma.review.count({
				where: {
					siteId,
					status: { in: ['APPROVED', 'PENDING'] },
					createdAt: { gte: startDate, lte: endDate }
				}
			}),
			this.prisma.widgetView.count({
				where: {
					siteId,
					createdAt: { gte: startDate, lte: endDate }
				}
			}),
			this.prisma.review.aggregate({
				where: {
					siteId,
					status: 'APPROVED',
					createdAt: { gte: startDate, lte: endDate }
				},
				_avg: { rating: true }
			})
		]);

		const avgRating = avgRatingResult._avg.rating || 0;
		const conversionRate = views > 0 ? (reviews / views) * 100 : 0;

		return {
			reviews,
			views,
			avgRating: Math.round(avgRating * 10) / 10,
			conversionRate: Math.round(conversionRate * 10) / 10,
		};
	}

	private calculatePercentageChange(oldValue: number, newValue: number): number {
		if (oldValue === 0) {
			return newValue > 0 ? 100 : 0;
		}
		return Math.round(((newValue - oldValue) / oldValue) * 100 * 10) / 10;
	}

	private getCountryFromIP(ipAddress: string): string {
		// Simple IP to country mapping - in production use proper GeoIP service
		if (ipAddress.startsWith('192.168.1.')) return 'Ukraine';
		if (ipAddress.startsWith('10.0.0.')) return 'Poland';
		if (ipAddress.startsWith('172.16.0.')) return 'Spain';
		return 'Unknown';
	}
}