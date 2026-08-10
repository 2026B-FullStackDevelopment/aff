// Defines the MongoDB shape for a Recipient's order on a listing (docs/database_design.md § ORDER).
import mongoose, { Schema } from 'mongoose';
import type { GeoLocation } from '../../shared/dtos/geo-location.dto.js';

type IntakePath = 'RESERVATION' | 'DONOR_INITIATED';
type PaymentMethod = 'STRIPE' | 'CASH';
type PaymentStatus = 'FREE' | 'PAYMENT_PENDING' | 'PAID';
type OrderStatus = 'PENDING_PAYMENT' | 'PREPARING' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

interface OrderFeedback {
  comment: string;
  createdAt: Date;
}

interface OrderAttrs {
  recipientId: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  intakePath: IntakePath;
  quantity: number;
  amount: number;
  paymentMethod?: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  deliveryAddressText: string;
  deliveryLocation: GeoLocation;
  cancelledByUserId?: mongoose.Types.ObjectId;
  feedback?: OrderFeedback;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt?: Date;
}

interface OrderDocument extends OrderAttrs, mongoose.Document {}

const orderSchema = new Schema<OrderDocument>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    intakePath: { type: String, enum: ['RESERVATION', 'DONOR_INITIATED'], required: true },
    quantity: { type: Number, required: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['STRIPE', 'CASH'] },
    paymentStatus: { type: String, enum: ['FREE', 'PAYMENT_PENDING', 'PAID'], required: true },
    orderStatus: {
      type: String,
      enum: ['PENDING_PAYMENT', 'PREPARING', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
      default: 'PENDING_PAYMENT',
    },
    deliveryAddressText: { type: String, required: true },
    deliveryLocation: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      updatedAt: { type: Date, required: true },
    },
    cancelledByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    feedback: {
      comment: { type: String },
      createdAt: { type: Date },
    },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<OrderDocument>('Order', orderSchema);
export type { IntakePath, PaymentMethod, PaymentStatus, OrderStatus, OrderFeedback, OrderDocument };
