// Contains Delivery read/query operations for the Courier queue, Admin oversight table, and single-Delivery lookups.
import Delivery from './delivery.model.js';
import type { DeliveryDocument } from './delivery.types.js';
import type { ClientSession, PipelineStage, Types } from 'mongoose';
import type { AdminDeliveryFilter, DeliveryAggregationResult, DeliveryPage, QueueFilter } from './delivery.types.js';

function findDeliveryById(
  deliveryId: string | Types.ObjectId,
  session?: ClientSession,
) {
  const query = Delivery.findById(deliveryId);
  return (session ? query.session(session) : query).lean<DeliveryDocument>();
}

/**
 * Reads one page of every Delivery for the Admin oversight table. Read-only
 * by design: the Admin module has no way to assign, reassign, or force-claim
 * a Delivery, and this module exposes no operation that would let it
 * (`docs/api_design.md` §11).
 */
async function listForAdmin(filter: AdminDeliveryFilter): Promise<DeliveryPage> {
  const match: Record<string, unknown> = {};

  if (filter.stage) {
    match.stage = filter.stage;
  }

  const skip = (filter.page - 1) * filter.limit;

  const pipeline: PipelineStage[] = [
    { $match: match },

    // Newest first: an oversight table is read for current activity, not
    // history. `_id` breaks ties so paging stays stable.
    { $sort: { createdAt: -1, _id: -1 } },

    // One round trip for both the page and the total behind it.
    {
      $facet: {
        items: [{ $skip: skip }, { $limit: filter.limit }],
        metadata: [{ $count: 'total' }],
      },
    },
  ];

  const [result] = await Delivery.aggregate<DeliveryAggregationResult>(pipeline);

  return {
    items: result?.items ?? [],
    page: filter.page,
    limit: filter.limit,
    total: result?.metadata[0]?.total ?? 0,
  };
}

/**
 * Reads one page of the shared, oldest-first Courier queue.
 *
 * Ordering is by `DELIVERY.createdAt` — the moment the Order became
 * claimable — not `ORDER.createdAt`. See D1 in
 * docs/superpowers/specs/2026-08-30-courier-core-backend-design.md.
 * The sort is fixed here rather than accepted from the client so no Courier
 * can work the queue out of turn.
 */
async function findQueue(filter: QueueFilter): Promise<DeliveryPage> {
  const skip = (filter.page - 1) * filter.limit;

  const pipeline: PipelineStage[] = [
    { $match: { stage: 'AWAITING_COURIER' } },

    // `_id` breaks ties so paging stays stable when two Deliveries share a
    // millisecond.
    { $sort: { createdAt: 1, _id: 1 } },

    {
      $facet: {
        items: [{ $skip: skip }, { $limit: filter.limit }],
        metadata: [{ $count: 'total' }],
      },
    },
  ];

  const [result] = await Delivery.aggregate<DeliveryAggregationResult>(pipeline);

  return {
    items: result?.items ?? [],
    page: filter.page,
    limit: filter.limit,
    total: result?.metadata[0]?.total ?? 0,
  };
}

/**
 * Finds the Courier's one in-flight Delivery (E4). Uses the same predicate as
 * the unique partial index that enforces the rule, so the definition of
 * "active" cannot drift between the constraint and the query.
 */
function findActiveByCourier(courierId: string | Types.ObjectId) {
  return Delivery.findOne({
    courierId,
    stage: { $in: ['ASSIGNED', 'PICKED_UP'] },
  }).lean<DeliveryDocument>();
}

export { findDeliveryById, listForAdmin, findQueue, findActiveByCourier };
export type { AdminDeliveryFilter, DeliveryPage, QueueFilter } from './delivery.types.js';
