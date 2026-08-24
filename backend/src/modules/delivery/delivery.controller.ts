// Handles Courier delivery HTTP requests. See docs/api_design.md §9.
import type { Request, Response } from 'express';
import { notImplemented } from '../../shared/http/response.js';

// None of these are wired to real logic yet — the atomic claim guarantee and the Socket.IO
// tracking layer don't exist yet. See docs/blockers.md.
async function listQueue(_req: Request, res: Response) {
  return notImplemented(res);
}

async function getActiveDelivery(_req: Request, res: Response) {
  return notImplemented(res);
}

async function claimDelivery(_req: Request, res: Response) {
  return notImplemented(res);
}

async function getDeliveryById(_req: Request, res: Response) {
  return notImplemented(res);
}

async function markPickedUp(_req: Request, res: Response) {
  return notImplemented(res);
}

async function markDelivered(_req: Request, res: Response) {
  return notImplemented(res);
}

export { listQueue, getActiveDelivery, claimDelivery, getDeliveryById, markPickedUp, markDelivered };
