import { IsString, IsOptional, MinLength, MaxLength, IsObject } from 'class-validator';

export class CreateSiteDto {
	@IsString()
	@MinLength(2, { message: 'Site name must be at least 2 characters' })
	@MaxLength(100, { message: 'Site name must not exceed 100 characters' })
	name: string;

	@IsString()
	@MinLength(2, { message: 'Domain must be at least 2 characters' })
	@MaxLength(255, { message: 'Domain must not exceed 255 characters' })
	domain: string;

	@IsOptional()
	@IsObject()
	settings?: Record<string, any>;
}