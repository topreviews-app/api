import { IsIn } from 'class-validator';

export class UpdateReviewStatusDto {
	@IsIn(['PENDING', 'APPROVED', 'HIDDEN', 'DELETED'])
	status: 'PENDING' | 'APPROVED' | 'HIDDEN' | 'DELETED';
}