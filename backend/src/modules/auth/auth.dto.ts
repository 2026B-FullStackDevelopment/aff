// Shapes auth requests and responses; response shaping strips password hashes and internal user fields.
import { toUserResponseDto } from '../users/user.dto.js';
import type { UserResponseDto } from '../users/user.dto.js';
import type { UserDocument } from '../users/user.model.js';

interface RegisterRecipientRequestDto {
  username: string;
  email: string;
  password: string;
  city: string;
}

interface RegisterDonorRequestDto {
  companyName: string;
  email: string;
  password: string;
  taxCode: string;
  city: string;
  addressText: string;
  location: { latitude: number; longitude: number };
}

interface LoginRequestDto {
  email: string;
  password: string;
}

interface AuthSession {
  accessToken: string;
  user: UserDocument;
}

interface AuthResponseDto {
  user: UserResponseDto | null;
  token: string;
}

function toAuthDto(session: AuthSession): AuthResponseDto {
  return {
    user: toUserResponseDto(session.user),
    token: session.accessToken,
  };
}

export { toAuthDto };
export type { RegisterRecipientRequestDto, RegisterDonorRequestDto, LoginRequestDto, AuthSession, AuthResponseDto };
