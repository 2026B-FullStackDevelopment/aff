// Handles admin HTTP requests and returns admin DTOs.
import type { Request, Response } from 'express';
import { notImplemented } from '../../shared/http/response.js';

// None of these are wired to real logic yet — Courier accounts, the Delivery module, and the
// admin listing/user-management business logic don't exist yet. See docs/api_design.md §11 and docs/blockers.md.
async function createCourier(_req: Request, res: Response) {
  return notImplemented(res);
}

async function listCouriers(_req: Request, res: Response) {
  return notImplemented(res);
}

async function listDeliveries(_req: Request, res: Response) {
  return notImplemented(res);
}

async function listUsers(_req: Request, res: Response) {
  return notImplemented(res);
}

async function updateUserStatus(_req: Request, res: Response) {
  return notImplemented(res);
}

async function cancelListing(_req: Request, res: Response) {
  return notImplemented(res);
}

async function listAllListings(_req: Request, res: Response) {
  return notImplemented(res);
}

export {
  createCourier,
  listCouriers,
  listDeliveries,
  listUsers,
  updateUserStatus,
  cancelListing,
  listAllListings,
};
