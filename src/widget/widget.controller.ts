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

	// Get HTML widget
	@Get(':siteId')
	async getWidget(@Param('siteId') siteId: string, @Res() res: any): Promise<void> {
		try {
			const html = await this.widgetService.generateWidgetHtml(siteId);

			// Set headers for widget embedding
			res.setHeader('Content-Type', 'text/html');
			res.setHeader('X-Frame-Options', 'ALLOWALL');
			res.setHeader('Access-Control-Allow-Origin', '*');
			res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
			res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

			res.send(html);
		} catch (error) {
			res.status(404).send(`
			<html>
			  <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
				 <h2>Widget Not Found</h2>
				 <p>The requested reviews widget could not be found.</p>
			  </body>
			</html>
		 `);
		}
	}

	// Get reviews JSON for widget
	@Get(':siteId/reviews')
	getWidgetReviews(@Param('siteId') siteId: string) {
		return this.widgetService.getWidgetReviews(siteId);
	}

	// Submit review through widget
	@Post(':siteId/reviews')
	submitWidgetReview(
		@Param('siteId') siteId: string,
		@Body() createReviewDto: CreateReviewDto,
		@Ip() ipAddress: string,
		@Headers('user-agent') userAgent: string,
	) {
		return this.widgetService.submitWidgetReview(
			siteId,
			createReviewDto,
			ipAddress,
			userAgent,
		);
	}

	// Get widget design settings
	@Get(':siteId/settings')
	getWidgetSettings(@Param('siteId') siteId: string) {
		return this.widgetService.getWidgetSettings(siteId);
	}

	// Get embed code (useful for admin panel)
	@Get(':siteId/embed')
	getEmbedCode(
		@Param('siteId') siteId: string,
		@Query('width') width?: number,
		@Query('height') height?: number,
	) {
		return this.widgetService.generateEmbedCode(
			siteId,
			width || 400,
			height || 500,
		);
	}
}