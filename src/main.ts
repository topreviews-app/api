// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);

	// Enable CORS for all origins (needed for widgets)
	app.enableCors({
		origin: true, // Allow all origins
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
		credentials: true,
	});

	// Global validation pipe
	app.useGlobalPipes(
		new ValidationPipe({
			transform: true,
			whitelist: true,
			forbidNonWhitelisted: true,
		}),
	);

	const port = process.env.PORT || 3001;
	await app.listen(port);

	console.log(`🚀 Application is running on: http://localhost:${port}`);
	console.log(`🎨 Widget example: http://localhost:${port}/widget/test-site-id`);
}

bootstrap();