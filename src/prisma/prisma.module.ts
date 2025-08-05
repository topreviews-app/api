import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Робимо модуль глобальним, щоб не імпортувати в кожному модулі
@Module({
	providers: [PrismaService],
	exports: [PrismaService],
})
export class PrismaModule { }