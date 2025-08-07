import { IsOptional, IsIn, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class ReviewFiltersDto {
	@IsOptional()
	@IsString()
	siteId?: string;

	@IsOptional()
	@IsIn(['PENDING', 'APPROVED', 'HIDDEN', 'DELETED'])
	status?: 'PENDING' | 'APPROVED' | 'HIDDEN' | 'DELETED';

	@IsOptional()
	@Transform(({ value }) => parseInt(value))
	page?: number = 1;

	@IsOptional()
	@Transform(({ value }) => parseInt(value))
	limit?: number = 20;
}