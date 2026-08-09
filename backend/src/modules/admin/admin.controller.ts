// Handles admin HTTP requests and returns admin DTOs.
import { notImplemented } from '../../shared/http/response.js';

// None of these are wired to real logic yet — Courier accounts, the Delivery module, and the
// admin listing/user-management DTOs don't exist yet. See docs/api_design.md §11 and docs/blockers.md.
async function createCourier(_req, res) {
  return notImplemented(res);
}

async function listCouriers(_req, res) {
  return notImplemented(res);
}

async function listDeliveries(_req, res) {
  return notImplemented(res);
}

async function listUsers(_req, res) {
  return notImplemented(res);
}

async function updateUserStatus(_req, res) {
  return notImplemented(res);
}

async function cancelListing(_req, res) {
  return notImplemented(res);
}

async function listAllListings(_req, res) {
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
