import { Module, ValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';

@Module({
	imports: [
		// Додати ConfigModule для environment variables
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		PrismaModule,
	],
	controllers: [AppController],
	providers: [
		{
			provide: APP_PIPE,
			useClass: ValidationPipe,
		},
	],
})
export class AppModule { }