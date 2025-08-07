import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateSiteDto {
	@IsOptional()
	@IsString()
	@MinLength(2)
	@MaxLength(100)
	name?: string;

	@IsOptional()
	@IsString()
	@MinLength(2)
	@MaxLength(255)
	domain?: string;
}