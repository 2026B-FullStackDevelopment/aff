// Defines the request and response shapes owned by Admin account management.
import type {
  CourierResponseDto,
  UserResponseDto,
} from '../users/user.dto.js';

interface CreateCourierRequestDto {
  username: string;
  email: string;
  tempPassword: string;
  fullName: string;
}

interface AdminUsersResponseDto {
  items: UserResponseDto[];
  page: number;
  limit: number;
  total: number;
}

interface AdminCouriersResponseDto {
  items: CourierResponseDto[];
  page: number;
  limit: number;
  total: number;
}

interface UpdateUserStatusRequestDto {
  status: 'ACTIVE' | 'DEACTIVATED';
}

export type {
  CreateCourierRequestDto,
  AdminUsersResponseDto,
  AdminCouriersResponseDto,
  UpdateUserStatusRequestDto,
};
