// Shapes user data before sending it to the frontend or another module.
import type { UserDocument, Role, AccountStatus } from './user.model.js';

interface UserResponseDto {
  id: string;
  username: string;
  email: string;
  role: Role;
  country: string | undefined;
  city: string | undefined;
  status: AccountStatus;
  avatarUrl: string | null;
  createdAt: Date;
}

interface CreateUserRequestDto {
  username: string;
  email: string;
  password?: string;
  role?: Role;
  country?: string;
  city?: string;
}

function toUserResponseDto(user: UserDocument | null): UserResponseDto | null {
  if (!user) return null;

  return {
    id: String(user._id),
    username: user.username,
    email: user.email,
    role: user.role,
    country: user.country,
    city: user.city,
    status: user.status,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

export { toUserResponseDto };
export type { UserResponseDto, CreateUserRequestDto };
