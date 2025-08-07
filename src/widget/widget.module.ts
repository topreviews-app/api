import { Module } from '@nestjs/common';
import { WidgetController } from './widget.controller';
import { WidgetService } from './widget.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ReviewsModule } from '../reviews/reviews.module';

@Module({
	imports: [PrismaModule, ReviewsModule],
	controllers: [WidgetController],
	providers: [WidgetService],
	exports: [WidgetService],
})
export class WidgetModule { }