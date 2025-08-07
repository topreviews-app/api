import {
	Controller,
	Get,
	Post,
	Put,
	Delete,
	Body,
	Param,
	Query,
	UseGuards,
	Request,
	Ip,
	Headers,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewStatusDto } from './dto/update-review-status.dto';
import { ReviewFiltersDto } from './dto/review-filters.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reviews')
export class ReviewsController {
	constructor(private readonly reviewsService: ReviewsService) { }

	// PUBLIC API - Get reviews for site (used by widget)
	@Get('site/:siteId')
	getPublicReviews(@Param('siteId') siteId: string) {
		return this.reviewsService.getPublicReviews(siteId);
	}

	// PUBLIC API - Submit review (used by widget)
	@Post('site/:siteId')
	createPublicReview(
		@Param('siteId') siteId: string,
		@Body() createReviewDto: CreateReviewDto,
		@Ip() ipAddress: string,
		@Headers('user-agent') userAgent: string,
	) {
		return this.reviewsService.createPublicReview(
			siteId,
			createReviewDto,
			ipAddress,
			userAgent,
		);
	}

	// ADMIN API - Get user reviews with filters
	@UseGuards(JwtAuthGuard)
	@Get('my')
	getMyReviews(@Request() req, @Query() filters: ReviewFiltersDto) {
		return this.reviewsService.getMyReviews(req.user.id, filters);
	}

	// ADMIN API - Update review status
	@UseGuards(JwtAuthGuard)
	@Put(':id/status')
	updateReviewStatus(
		@Param('id') id: string,
		@Request() req,
		@Body() updateStatusDto: UpdateReviewStatusDto,
	) {
		return this.reviewsService.updateReviewStatus(id, req.user.id, updateStatusDto);
	}

	// ADMIN API - Delete review
	@UseGuards(JwtAuthGuard)
	@Delete(':id')
	deleteReview(@Param('id') id: string, @Request() req) {
		return this.reviewsService.deleteReview(id, req.user.id);
	}

	// ADMIN API - Get site review statistics
	@UseGuards(JwtAuthGuard)
	@Get('site/:siteId/stats')
	getSiteStats(@Param('siteId') siteId: string, @Request() req) {
		return this.reviewsService.getSiteReviewStats(siteId, req.user.id);
	}
}