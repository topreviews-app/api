import { IsString, IsEmail, IsInt, IsOptional, Min, Max, MinLength, MaxLength } from 'class-validator';

export class CreateReviewDto {
	@IsString()
	@MinLength(2, { message: 'Author name must be at least 2 characters' })
	@MaxLength(50, { message: 'Author name must not exceed 50 characters' })
	authorName: string;

	@IsOptional()
	@IsEmail({}, { message: 'Invalid email format' })
	authorEmail?: string;

	@IsInt({ message: 'Rating must be a number' })
	@Min(1, { message: 'Rating must be at least 1' })
	@Max(5, { message: 'Rating must not exceed 5' })
	rating: number;

	@IsString()
	@MinLength(10, { message: 'Comment must be at least 10 characters' })
	@MaxLength(1000, { message: 'Comment must not exceed 1000 characters' })
	comment: string;
}
