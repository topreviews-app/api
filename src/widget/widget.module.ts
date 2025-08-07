// src/widget/widget.module.ts
import { Module } from '@nestjs/common';
import { WidgetController } from './widget.controller';
import { WidgetService } from './widget.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
	imports: [
		PrismaModule,     // For database access
		ReviewsModule,    // For review operations
		AnalyticsModule,  // For analytics tracking
	],
	controllers: [WidgetController],
	providers: [WidgetService],
	exports: [WidgetService], // Export service for use in other modules
})
export class WidgetModule { }