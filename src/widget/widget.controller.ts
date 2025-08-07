// src/widget/widget.controller.ts
import {
	Controller,
	Get,
	Post,
	Param,
	Body,
	Ip,
	Headers,
	Res,
	Query,
} from '@nestjs/common';
import { WidgetService } from './widget.service';
import { CreateReviewDto } from '../reviews/dto/create-review.dto';

@Controller('widget')
export class WidgetController {
	constructor(private readonly widgetService: WidgetService) { }

	// Get HTML widget with analytics tracking
	@Get(':siteId')
	async getWidget(
		@Param('siteId') siteId: string,
		@Res() res: any,
		@Ip() ipAddress: string,
		@Headers('user-agent') userAgent?: string,
		@Headers('referer') referrer?: string
	): Promise<void> {
		try {
			// Generate HTML with analytics tracking
			const html = await this.widgetService.generateWidgetHtml(
				siteId,
				ipAddress,
				userAgent,
				referrer
			);

			// Set headers for widget embedding
			res.setHeader('Content-Type', 'text/html');
			res.setHeader('X-Frame-Options', 'ALLOWALL');
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
			res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

			// Cache headers for better performance
			res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes cache

			res.send(html);
		} catch (error) {
			console.error('❌ Widget Controller Error:', error);

			// Enhanced error page with retry functionality
			res.status(404).send(`
				<!DOCTYPE html>
				<html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<title>Widget Not Found</title>
					<style>
						body { 
							font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
							text-align: center; 
							padding: 50px 20px; 
							color: #666; 
							background: #f8f9fa;
						}
						.error-container { 
							max-width: 400px; 
							margin: 0 auto; 
							padding: 30px; 
							background: white; 
							border-radius: 8px; 
							box-shadow: 0 2px 10px rgba(0,0,0,0.1);
						}
						h2 { color: #e74c3c; margin-bottom: 10px; }
						p { margin-bottom: 20px; line-height: 1.5; }
						.retry-btn { 
							background: #3498db; 
							color: white; 
							border: none; 
							padding: 10px 20px; 
							border-radius: 4px; 
							cursor: pointer;
							font-size: 14px;
						}
						.retry-btn:hover { background: #2980b9; }
					</style>
				</head>
				<body>
					<div class="error-container">
						<h2>Widget Not Found</h2>
						<p>The requested reviews widget could not be found or is temporarily unavailable.</p>
						<button class="retry-btn" onclick="window.location.reload()">Try Again</button>
					</div>
				</body>
				</html>
			`);
		}
	}

	// Get reviews JSON for widget
	@Get(':siteId/reviews')
	async getWidgetReviews(@Param('siteId') siteId: string) {
		try {
			const reviews = await this.widgetService.getWidgetReviews(siteId);

			return {
				success: true,
				...reviews,
				message: 'Reviews retrieved successfully'
			};
		} catch (error) {
			console.error('❌ Widget Reviews Error:', error);
			return {
				success: false,
				reviews: [],
				total: 0,
				message: 'Failed to load reviews'
			};
		}
	}

	// Submit review through widget
	@Post(':siteId/reviews')
	async submitWidgetReview(
		@Param('siteId') siteId: string,
		@Body() createReviewDto: CreateReviewDto,
		@Ip() ipAddress: string,
		@Headers('user-agent') userAgent: string,
		@Headers('referer') referrer?: string
	) {
		try {
			const result = await this.widgetService.submitWidgetReview(
				siteId,
				createReviewDto,
				ipAddress,
				userAgent,
				referrer
			);

			return {
				success: true,
				...result,
				message: 'Review submitted successfully'
			};
		} catch (error) {
			console.error('❌ Widget Submit Review Error:', error);

			// Return user-friendly error messages
			let message = 'Failed to submit review';
			if (error.message.includes('rate limited')) {
				message = 'Too many reviews from your location. Please try again later.';
			} else if (error.message.includes('duplicate')) {
				message = 'You have already submitted a review recently.';
			} else if (error.message.includes('inappropriate')) {
				message = 'Review contains inappropriate content.';
			}

			return {
				success: false,
				message,
				error: error.message
			};
		}
	}

	// Get widget design settings
	@Get(':siteId/settings')
	async getWidgetSettings(@Param('siteId') siteId: string) {
		try {
			const settings = await this.widgetService.getWidgetSettings(siteId);

			return {
				success: true,
				...settings,
				message: 'Settings retrieved successfully'
			};
		} catch (error) {
			console.error('❌ Widget Settings Error:', error);
			return {
				success: false,
				site: null,
				settings: null,
				message: 'Failed to load widget settings'
			};
		}
	}

	// Get embed code (useful for admin panel)
	@Get(':siteId/embed')
	async getEmbedCode(
		@Param('siteId') siteId: string,
		@Query('width') width?: number,
		@Query('height') height?: number,
	) {
		try {
			const embedCode = await this.widgetService.generateEmbedCode(
				siteId,
				width || 400,
				height || 500,
			);

			return {
				success: true,
				...embedCode,
				message: 'Embed code generated successfully'
			};
		} catch (error) {
			console.error('❌ Widget Embed Code Error:', error);
			return {
				success: false,
				iframe: '',
				javascript: '',
				instructions: null,
				message: 'Failed to generate embed code'
			};
		}
	}

	// Health check for widget endpoint
	@Get(':siteId/health')
	async getWidgetHealth(@Param('siteId') siteId: string) {
		try {
			const { site } = await this.widgetService.getWidgetSettings(siteId);

			return {
				success: true,
				status: 'healthy',
				siteId: site.id,
				siteName: site.name,
				timestamp: new Date().toISOString(),
				message: 'Widget is operational'
			};
		} catch (error) {
			return {
				success: false,
				status: 'error',
				siteId,
				error: error.message,
				timestamp: new Date().toISOString(),
				message: 'Widget health check failed'
			};
		}
	}

	// Get widget statistics (public, limited info)
	@Get(':siteId/stats')
	async getWidgetStats(@Param('siteId') siteId: string) {
		try {
			const stats = await this.widgetService.getPublicStats(siteId);

			return {
				success: true,
				...stats,
				message: 'Public statistics retrieved successfully'
			};
		} catch (error) {
			console.error('❌ Widget Stats Error:', error);
			return {
				success: false,
				totalReviews: 0,
				averageRating: 0,
				message: 'Failed to load statistics'
			};
		}
	}
}