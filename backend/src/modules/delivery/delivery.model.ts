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

export default mongoose.model<DeliveryDocument>('Delivery', deliverySchema);
export type { DeliveryStage, DeliveryDocument };
