import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewStatusDto } from './dto/update-review-status.dto';
import { ReviewFiltersDto } from './dto/review-filters.dto';

// Plan limitations from TZ
const PLAN_LIMITS = {
	FREE: {
		reviewsPerMonth: 50,
		moderationEnabled: false, // auto-approve
		analyticsEnabled: false,
	},
	PREMIUM: {
		reviewsPerMonth: -1, // unlimited
		moderationEnabled: true, // manual moderation
		analyticsEnabled: true,
	}
};

@Injectable()
export class ReviewsService {
	constructor(private prisma: PrismaService) { }

	// PUBLIC API - Get reviews for site (for widget)
	async getPublicReviews(siteId: string) {
		// Verify site exists
		const site = await this.prisma.site.findUnique({
			where: { id: siteId },
			select: { id: true, name: true, plan: true }
		});

		if (!site) {
			throw new NotFoundException('Site not found');
		}

		const reviews = await this.prisma.review.findMany({
			where: {
				siteId,
				status: 'APPROVED', // Only approved reviews for public
			},
			select: {
				id: true,
				authorName: true,
				rating: true,
				comment: true,
				createdAt: true,
			},
			orderBy: { createdAt: 'desc' },
			take: 50, // Limit for performance
		});

		return {
			site: {
				id: site.id,
				name: site.name,
			},
			reviews,
			total: reviews.length,
		};
	}

	// PUBLIC API - Submit review (for widget)
	async createPublicReview(
		siteId: string,
		createReviewDto: CreateReviewDto,
		ipAddress?: string,
		userAgent?: string
	) {
		// Verify site exists
		const site = await this.prisma.site.findUnique({
			where: { id: siteId },
			include: { user: true }
		});

		if (!site) {
			throw new NotFoundException('Site not found');
		}

		// Check for duplicates (same IP + email within 24h)
		if (ipAddress && createReviewDto.authorEmail) {
			const yesterday = new Date();
			yesterday.setHours(yesterday.getHours() - 24);

			const existingReview = await this.prisma.review.findFirst({
				where: {
					siteId,
					ipAddress,
					authorEmail: createReviewDto.authorEmail,
					createdAt: {
						gte: yesterday,
					},
				},
			});

			if (existingReview) {
				throw new BadRequestException('You have already left a review recently');
			}
		}

		// Check monthly limits
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		const reviewsThisMonth = await this.prisma.review.count({
			where: {
				siteId,
				createdAt: {
					gte: startOfMonth,
				},
			},
		});

		if (site.plan === 'FREE' && reviewsThisMonth >= PLAN_LIMITS.FREE.reviewsPerMonth) {
			throw new BadRequestException('Monthly review limit reached for this site');
		}

		// Determine status based on plan
		const status = PLAN_LIMITS[site.plan].moderationEnabled ? 'PENDING' : 'APPROVED';

		// Create review
		const review = await this.prisma.review.create({
			data: {
				siteId,
				authorName: createReviewDto.authorName,
				authorEmail: createReviewDto.authorEmail,
				rating: createReviewDto.rating,
				comment: createReviewDto.comment,
				status,
				ipAddress,
				userAgent,
			},
			select: {
				id: true,
				authorName: true,
				rating: true,
				comment: true,
				status: true,
				createdAt: true,
			},
		});

		return review;
	}

	// ADMIN API - Get user reviews with filters and pagination
	async getMyReviews(userId: string, filters: ReviewFiltersDto) {
		// Get user sites
		const userSites = await this.prisma.site.findMany({
			where: { userId },
			select: { id: true, name: true },
		});

		const siteIds = userSites.map(site => site.id);

		if (siteIds.length === 0) {
			return {
				reviews: [],
				total: 0,
				page: filters.page,
				limit: filters.limit,
				totalPages: 0,
			};
		}

		// Build where clause
		const where: any = {
			siteId: { in: siteIds },
		};

		if (filters.siteId) {
			// Verify user owns this site
			if (!siteIds.includes(filters.siteId)) {
				throw new ForbiddenException('Access denied to this site');
			}
			where.siteId = filters.siteId;
		}

		if (filters.status) {
			where.status = filters.status;
		}

		// Count total
		const total = await this.prisma.review.count({ where });

		// Calculate pagination
		const limit = Math.min(filters.limit || 20, 100); // Max 100 per page
		const page = filters.page || 1;
		const skip = (page - 1) * limit;
		const totalPages = Math.ceil(total / limit);

		// Get reviews
		const reviews = await this.prisma.review.findMany({
			where,
			include: {
				site: {
					select: {
						id: true,
						name: true,
						domain: true,
					},
				},
			},
			orderBy: { createdAt: 'desc' },
			skip,
			take: limit,
		});

		return {
			reviews,
			total,
			page,
			limit,
			totalPages,
			sites: userSites, // For filtering dropdown
		};
	}

	// ADMIN API - Update review status
	async updateReviewStatus(reviewId: string, userId: string, updateStatusDto: UpdateReviewStatusDto) {
		// Find review and verify ownership
		const review = await this.prisma.review.findUnique({
			where: { id: reviewId },
			include: {
				site: {
					select: {
						userId: true,
						plan: true,
						name: true,
					},
				},
			},
		});

		if (!review) {
			throw new NotFoundException('Review not found');
		}

		if (review.site.userId !== userId) {
			throw new ForbiddenException('You do not have access to this review');
		}

		// Check if user plan allows moderation
		if (review.site.plan === 'FREE' && !PLAN_LIMITS.FREE.moderationEnabled) {
			throw new ForbiddenException('Review moderation is not available on FREE plan');
		}

		// Update status
		const updatedReview = await this.prisma.review.update({
			where: { id: reviewId },
			data: { status: updateStatusDto.status },
			include: {
				site: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		});

		return updatedReview;
	}

	// ADMIN API - Delete review
	async deleteReview(reviewId: string, userId: string) {
		// Find review and verify ownership
		const review = await this.prisma.review.findUnique({
			where: { id: reviewId },
			include: {
				site: {
					select: { userId: true, name: true },
				},
			},
		});

		if (!review) {
			throw new NotFoundException('Review not found');
		}

		if (review.site.userId !== userId) {
			throw new ForbiddenException('You do not have access to this review');
		}

		// Delete review
		await this.prisma.review.delete({
			where: { id: reviewId },
		});

		return { message: 'Review deleted successfully' };
	}

	// Get review statistics for site
	async getSiteReviewStats(siteId: string, userId: string) {
		// Verify site ownership
		const site = await this.prisma.site.findUnique({
			where: { id: siteId },
		});

		if (!site) {
			throw new NotFoundException('Site not found');
		}

		if (site.userId !== userId) {
			throw new ForbiddenException('You do not have access to this site');
		}

		const [
			total,
			approved,
			pending,
			hidden,
			averageRating,
			ratingDistribution
		] = await Promise.all([
			this.prisma.review.count({ where: { siteId } }),
			this.prisma.review.count({ where: { siteId, status: 'APPROVED' } }),
			this.prisma.review.count({ where: { siteId, status: 'PENDING' } }),
			this.prisma.review.count({ where: { siteId, status: 'HIDDEN' } }),
			this.prisma.review.aggregate({
				where: { siteId, status: 'APPROVED' },
				_avg: { rating: true },
			}),
			this.prisma.review.groupBy({
				by: ['rating'],
				where: { siteId, status: 'APPROVED' },
				_count: { rating: true },
			}),
		]);

		return {
			site: {
				id: site.id,
				name: site.name,
				domain: site.domain,
			},
			stats: {
				total,
				approved,
				pending,
				hidden,
				averageRating: averageRating._avg.rating ? Math.round(averageRating._avg.rating * 10) / 10 : 0,
				ratingDistribution: ratingDistribution.reduce((acc, item) => {
					acc[item.rating] = item._count.rating;
					return acc;
				}, {} as Record<number, number>),
			},
		};
	}
}