import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
	@IsEmail({}, { message: 'Invalid email format' })
	email: string;

	@IsString()
	@MinLength(8, { message: 'Password must be at least 8 characters long' })
	@MaxLength(50, { message: 'Password must not exceed 50 characters' })
	password: string;

	@IsString()
	@MinLength(2, { message: 'Name must be at least 2 characters long' })
	@MaxLength(50, { message: 'Name must not exceed 50 characters' })
	name: string;
}