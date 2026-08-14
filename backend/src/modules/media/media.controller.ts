// Handles the shared media upload-url HTTP request and returns the signed URL DTO.
import type { Request, Response, NextFunction } from 'express';
import * as mediaService from './media.service.js';
import { parseBody } from '../../shared/validation/parse-body.js';
import { uploadUrlRequestSchema } from './media.schemas.js';
import { ok } from '../../shared/http/response.js';

/**
 * `POST /media/upload-url` — any authenticated role; the per-`purpose` role
 * check (Donor-only for `LISTING_IMAGE`) happens in `media.service.ts`, not
 * here. Validates the body, resolves the caller's bucket/path via the
 * service, and returns a signed Supabase Storage upload URL plus the
 * eventual public `mediaUrl`.
 */
async function createUploadUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = parseBody(uploadUrlRequestSchema, req.body);
    const result = await mediaService.requestUploadUrl({
      ...payload,
      userId: req.user!.id,
      role: req.user!.role,
    });

    return ok(res, result);
  } catch (error) {
    return next(error);
  }
}

export { createUploadUrl };
