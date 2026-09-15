// Defines internal service inputs for media upload workflows.
import type { Role } from '../users/user.types.js';
import type { UploadUrlRequest } from './media.schemas.js';

interface RequestUploadUrlInput extends UploadUrlRequest { userId: string; role: Role }
export type { RequestUploadUrlInput };
