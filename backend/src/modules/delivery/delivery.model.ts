import mongoose, { Schema } from 'mongoose';
import type { GeoLocation } from '../../shared/dtos/geo-location.dto.js';

type DeliveryStage = 'AWAITING_COURIER' | 'ASSIGNED' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';

interface DeliveryAttrs {
  orderId: mongoose.Types.ObjectId;
  courierId?: mongoose.Types.ObjectId;
  stage: DeliveryStage;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  courierLastLocation?: GeoLocation;
  createdAt: Date;
  cancelledAt?: Date;
}

interface DeliveryDocument extends DeliveryAttrs, mongoose.Document {}

const deliverySchema = new Schema<DeliveryDocument>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    courierId: { type: Schema.Types.ObjectId, ref: 'User' },
    stage: {
      type: String,
      enum: ['AWAITING_COURIER', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED'],
      default: 'AWAITING_COURIER',
    },
    pickedUpAt: { type: Date },
    deliveredAt: { type: Date },
    courierLastLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      updatedAt: { type: Date },
    },
    cancelledAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// An Order can have at most one Delivery. This is the final concurrency
// guard for DeliveryService.createForOrder.
deliverySchema.index({ orderId: 1 }, { unique: true });

// Queue read path (E2): AWAITING_COURIER rows, oldest first.
deliverySchema.index({ stage: 1, createdAt: 1 });

// One active Delivery per Courier (E3/E4), enforced by the database rather
// than by application logic. A Courier holds at most one row in ASSIGNED or
// PICKED_UP; completing or cancelling moves the row out of this partial
// filter and releases the slot automatically, so nothing needs unsetting.
//
// Requires MongoDB >= 6.1 — partialFilterExpression did not accept $in before.
deliverySchema.index(
  { courierId: 1 },
  {
    unique: true,
    partialFilterExpression: { stage: { $in: ['ASSIGNED', 'PICKED_UP'] } },
  },
);

export default mongoose.model<DeliveryDocument>('Delivery', deliverySchema);
export type { DeliveryStage, DeliveryDocument };
