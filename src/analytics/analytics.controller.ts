import {
	Controller,
	Get,
	Param,
	Query,
	UseGuards,
	Request,
	ParseUUIDPipe,
	BadRequestException
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
	constructor(private readonly analyticsService: AnalyticsService) { }

	// ========================================
	// DASHBOARD ANALYTICS
	// ========================================

	@Get('dashboard')
	async getDashboardStats(@Request() req) {
		try {
			const stats = await this.analyticsService.getDashboardStats(req.user.id);

			return {
				success: true,
				data: stats,
				message: 'Dashboard analytics retrieved successfully',
			};
		} catch (error) {
			console.error('Dashboard analytics error:', error);
			throw error;
		}
	}

	// ========================================
	// SITE-SPECIFIC ANALYTICS
	// ========================================

	@Get('site/:siteId')
	async getSiteAnalytics(
		@Param('siteId', ParseUUIDPipe) siteId: string,
		@Request() req
	) {
		try {
			const analytics = await this.analyticsService.getSiteAnalytics(siteId, req.user.id);

			return {
				success: true,
				data: analytics,
				message: 'Site analytics retrieved successfully',
			};
		} catch (error) {
			console.error('Site analytics error:', error);
			throw error;
		}
	}

	// ========================================
	// COMPARISON ANALYTICS
	// ========================================

	@Get('site/:siteId/comparison')
	async getComparisonData(
		@Param('siteId', ParseUUIDPipe) siteId: string,
		@Query('period') period: 'week' | 'month' = 'month',
		@Request() req
	) {
		if (!['week', 'month'].includes(period)) {
			throw new BadRequestException('Period must be either "week" or "month"');
		}

		try {
			const comparison = await this.analyticsService.getComparisonData(
				siteId,
				req.user.id,
				period
			);

			return {
				success: true,
				data: comparison,
				period,
				message: `${period} comparison data retrieved successfully`,
			};
		} catch (error) {
			console.error('Comparison analytics error:', error);
			throw error;
		}
	}

	// ========================================
	// QUICK STATS ENDPOINTS
	// ========================================

	@Get('sites/:siteId/quick-stats')
	async getQuickStats(
		@Param('siteId', ParseUUIDPipe) siteId: string,
		@Request() req
	) {
		try {
			const analytics = await this.analyticsService.getSiteAnalytics(siteId, req.user.id);

			// Return only essential stats for quick loading
			return {
				success: true,
				data: {
					totalReviews: analytics.stats.totalReviews,
					avgRating: analytics.stats.avgRating,
					conversionRate: analytics.stats.conversionRate,
					pendingReviews: analytics.stats.pendingReviews,
				},
				message: 'Quick stats retrieved successfully',
			};
		} catch (error) {
			console.error('Quick stats error:', error);
			throw error;
		}
	}

	@Get('overview')
	async getOverview(@Request() req) {
		try {
			const stats = await this.analyticsService.getDashboardStats(req.user.id);

			// Simplified overview for header/sidebar
			return {
				success: true,
				data: {
					totalReviews: stats.totalReviews,
					thisMonthReviews: stats.thisMonthReviews,
					activeSites: stats.activeSites,
					conversionRate: stats.conversionRate,
				},
				message: 'Overview retrieved successfully',
			};
		} catch (error) {
			console.error('Overview error:', error);
			throw error;
		}
	}
}