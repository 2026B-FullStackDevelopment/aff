import type { DeliveryStage } from '@/types/api';
import { realtimeSocket } from '@/shared/services/realtimeSocket';

export interface PaymentSuccessEvent {
  orderId: string;
}

export interface PaymentRefundedEvent {
  orderId: string;
}

export interface OrderStageChangedEvent {
  orderId: string;
  stage: DeliveryStage;
}

export interface DeliveryLocationEvent {
  orderId: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
}

export interface DeliveryDeliveredEvent {
  orderId: string;
  deliveredAt: string;
}

type PaymentSuccessListener = (event: PaymentSuccessEvent) => void;
type PaymentRefundedListener = (event: PaymentRefundedEvent) => void;
type OrderStageChangedListener = (event: OrderStageChangedEvent) => void;
type DeliveryLocationListener = (event: DeliveryLocationEvent) => void;
type DeliveryDeliveredListener = (event: DeliveryDeliveredEvent) => void;

const paymentSuccessListeners = new Set<PaymentSuccessListener>();
const paymentRefundedListeners = new Set<PaymentRefundedListener>();
const orderStageChangedListeners = new Set<OrderStageChangedListener>();
const deliveryLocationListeners = new Set<DeliveryLocationListener>();
const deliveryDeliveredListeners = new Set<DeliveryDeliveredListener>();

// I2 — Socket.IO room membership does not survive a reconnect (a reconnect
// gets a new socket id server-side), so a transient network drop silently
// and permanently ends delivery:location/delivery:delivered delivery for
// the rest of the page view unless we rejoin on every reconnect. Only one
// order room is ever needed at a time (a Recipient views one order's
// tracking page at a time), so a single tracked value is enough.
let joinedOrderId: string | null = null;

function isPaymentSuccessEvent(payload: unknown): payload is PaymentSuccessEvent {
  return typeof payload === 'object' && payload !== null && 'orderId' in payload && typeof payload.orderId === 'string';
}

function isPaymentRefundedEvent(payload: unknown): payload is PaymentRefundedEvent {
  return typeof payload === 'object' && payload !== null && 'orderId' in payload && typeof payload.orderId === 'string';
}

function isOrderStageChangedEvent(payload: unknown): payload is OrderStageChangedEvent {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'orderId' in payload &&
    typeof payload.orderId === 'string' &&
    'stage' in payload &&
    typeof payload.stage === 'string'
  );
}

function isDeliveryLocationEvent(payload: unknown): payload is DeliveryLocationEvent {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'orderId' in payload &&
    typeof payload.orderId === 'string' &&
    'latitude' in payload &&
    typeof payload.latitude === 'number' &&
    'longitude' in payload &&
    typeof payload.longitude === 'number'
  );
}

function isDeliveryDeliveredEvent(payload: unknown): payload is DeliveryDeliveredEvent {
  return typeof payload === 'object' && payload !== null && 'orderId' in payload && typeof payload.orderId === 'string' && 'deliveredAt' in payload;
}

realtimeSocket.on<unknown>('payment:success', (payload) => {
  if (isPaymentSuccessEvent(payload)) paymentSuccessListeners.forEach((listener) => listener(payload));
});

realtimeSocket.on<unknown>('payment:refunded', (payload) => {
  if (isPaymentRefundedEvent(payload)) paymentRefundedListeners.forEach((listener) => listener(payload));
});

realtimeSocket.on<unknown>('order:status_changed', (payload) => {
  if (isOrderStageChangedEvent(payload)) orderStageChangedListeners.forEach((listener) => listener(payload));
});

realtimeSocket.on<unknown>('delivery:location', (payload) => {
  if (isDeliveryLocationEvent(payload)) deliveryLocationListeners.forEach((listener) => listener(payload));
});

realtimeSocket.on<unknown>('delivery:delivered', (payload) => {
  if (isDeliveryDeliveredEvent(payload)) deliveryDeliveredListeners.forEach((listener) => listener(payload));
});

// Re-emit order:join for the tracked room on every reconnect, since Socket.IO
// room membership does not survive a reconnect (a new socket id is issued
// server-side) — see the I2 comment above.
realtimeSocket.on<unknown>('connect', () => {
  if (joinedOrderId) {
    realtimeSocket.emit('order:join', joinedOrderId);
  }
});

function joinOrder(orderId: string) {
  joinedOrderId = orderId;
  realtimeSocket.emit('order:join', orderId);
}

function leaveOrder(orderId: string) {
  if (joinedOrderId === orderId) {
    joinedOrderId = null;
  }
  realtimeSocket.emit('order:leave', orderId);
}

function subscribeToPaymentSuccess(listener: PaymentSuccessListener): () => void {
  paymentSuccessListeners.add(listener);
  return () => paymentSuccessListeners.delete(listener);
}

function subscribeToPaymentRefunded(listener: PaymentRefundedListener): () => void {
  paymentRefundedListeners.add(listener);
  return () => paymentRefundedListeners.delete(listener);
}

function subscribeToStageChanged(listener: OrderStageChangedListener): () => void {
  orderStageChangedListeners.add(listener);
  return () => orderStageChangedListeners.delete(listener);
}

function subscribeToLocationUpdate(listener: DeliveryLocationListener): () => void {
  deliveryLocationListeners.add(listener);
  return () => deliveryLocationListeners.delete(listener);
}

function subscribeToDelivered(listener: DeliveryDeliveredListener): () => void {
  deliveryDeliveredListeners.add(listener);
  return () => deliveryDeliveredListeners.delete(listener);
}

export const orderRealtimeService = {
  joinOrder,
  leaveOrder,
  subscribeToPaymentSuccess,
  subscribeToPaymentRefunded,
  subscribeToStageChanged,
  subscribeToLocationUpdate,
  subscribeToDelivered,
};
