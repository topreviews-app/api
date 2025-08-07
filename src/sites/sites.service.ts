import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

// Plan limits from specification
const PLAN_LIMITS = {
	FREE: {
		sitesCount: 1,
		reviewsPerMonth: 50,
		moderationEnabled: false,
		analyticsEnabled: false,
		customBranding: false
	},
	PREMIUM: {
		sitesCount: 5,
		reviewsPerMonth: -1, // unlimited
		moderationEnabled: true,
		analyticsEnabled: true,
		customBranding: true
	}
};

@Injectable()
export class SitesService {
	constructor(private prisma: PrismaService) { }

	async create(userId: string, createSiteDto: CreateSiteDto) {
		// Check plan limits
		const existingSites = await this.prisma.site.findMany({
			where: { userId },
		});

		// Default plan is FREE for new users
		const userPlan = existingSites.length > 0 ? existingSites[0].plan : 'FREE';

		if (existingSites.length >= PLAN_LIMITS[userPlan].sitesCount) {
			throw new ForbiddenException(
				`Your ${userPlan} plan allows only ${PLAN_LIMITS[userPlan].sitesCount} site(s). Please upgrade to add more sites.`
			);
		}

		// Default widget design settings
		const defaultSettings = {
			theme: 'light',
			primaryColor: '#007bff',
			backgroundColor: '#ffffff',
			textColor: '#333333',
			borderRadius: '8px',
			showAvatar: true,
			showDate: true,
			layout: 'cards',
			maxReviews: 10,
			...createSiteDto.settings
		};

		const site = await this.prisma.site.create({
			data: {
				name: createSiteDto.name,
				domain: createSiteDto.domain,
				userId,
				plan: userPlan,
				settings: defaultSettings,
			},
			include: {
				_count: {
					select: { reviews: true }
				}
			}
		});

		return site;
	}

	async findAllByUser(userId: string) {
		return await this.prisma.site.findMany({
			where: { userId },
			include: {
				_count: {
					select: { reviews: true }
				}
			},
			orderBy: { createdAt: 'desc' }
		});
	}

	async findOne(id: string, userId: string) {
		const site = await this.prisma.site.findUnique({
			where: { id },
			include: {
				_count: {
					select: { reviews: true }
				}
			}
		});

		if (!site) {
			throw new NotFoundException('Site not found');
		}

		if (site.userId !== userId) {
			throw new ForbiddenException('You do not have access to this site');
		}

		return site;
	}

	async update(id: string, userId: string, updateSiteDto: UpdateSiteDto) {
		// Verify site ownership
		await this.findOne(id, userId);

		const updatedSite = await this.prisma.site.update({
			where: { id },
			data: updateSiteDto,
			include: {
				_count: {
					select: { reviews: true }
				}
			}
		});

		return updatedSite;
	}

	async updateSettings(id: string, userId: string, updateSettingsDto: UpdateSettingsDto) {
		// Verify site ownership
		const site = await this.findOne(id, userId);

		// Merge settings
		const currentSettings = site.settings as Record<string, any>;
		const newSettings = { ...currentSettings, ...updateSettingsDto.settings };

		const updatedSite = await this.prisma.site.update({
			where: { id },
			data: { settings: newSettings },
			include: {
				_count: {
					select: { reviews: true }
				}
			}
		});

		return updatedSite;
	}

	async remove(id: string, userId: string) {
		// Verify site ownership
		await this.findOne(id, userId);

		// Delete site (cascade will delete all related reviews)
		await this.prisma.site.delete({
			where: { id }
		});

		return { message: 'Site deleted successfully' };
	}
}