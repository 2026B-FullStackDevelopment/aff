// Handles Courier delivery HTTP requests. See docs/api_design.md §9.
import { notImplemented } from '../../shared/http/response.js';

// None of these are wired to real logic yet — the DELIVERY schema, the atomic claim guarantee,
// and the Socket.IO tracking layer don't exist yet. See docs/blockers.md.
async function listQueue(_req, res) {
  return notImplemented(res);
}

async function claimDelivery(_req, res) {
  return notImplemented(res);
}

async function getDeliveryById(_req, res) {
  return notImplemented(res);
}

async function markPickedUp(_req, res) {
  return notImplemented(res);
}

async function markDelivered(_req, res) {
  return notImplemented(res);
}

export { listQueue, claimDelivery, getDeliveryById, markPickedUp, markDelivered };
