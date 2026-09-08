import {
    io,
    type Socket,
} from 'socket.io-client';
import type { DeliveryStage } from '@/types/api';

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

interface OrderServerToClientEvents {
    'payment:success': (
        event: PaymentSuccessEvent,
    ) => void;
    'payment:refunded': (
        event: PaymentRefundedEvent,
    ) => void;
    'order:status_changed': (
        event: OrderStageChangedEvent,
    ) => void;
    'delivery:location': (
        event: DeliveryLocationEvent,
    ) => void;
    'delivery:delivered': (
        event: DeliveryDeliveredEvent,
    ) => void;
}

interface OrderClientToServerEvents {
    'order:join': (orderId: string) => void;
    'order:leave': (orderId: string) => void;
}

type OrderSocket = Socket<
    OrderServerToClientEvents,
    OrderClientToServerEvents
>;

type PaymentSuccessListener = (
    event: PaymentSuccessEvent,
) => void;

type PaymentRefundedListener = (
    event: PaymentRefundedEvent,
) => void;

type OrderStageChangedListener = (
    event: OrderStageChangedEvent,
) => void;

type DeliveryLocationListener = (
    event: DeliveryLocationEvent,
) => void;

type DeliveryDeliveredListener = (
    event: DeliveryDeliveredEvent,
) => void;

const paymentSuccessListeners =
    new Set<PaymentSuccessListener>();

const paymentRefundedListeners =
    new Set<PaymentRefundedListener>();

const orderStageChangedListeners =
    new Set<OrderStageChangedListener>();

const deliveryLocationListeners =
    new Set<DeliveryLocationListener>();

const deliveryDeliveredListeners =
    new Set<DeliveryDeliveredListener>();

let activeSocket: OrderSocket | null =
    null;

let activeToken: string | null =
    null;

function resolveSocketServerUrl(): string {
    const explicitSocketUrl =
        import.meta.env.VITE_SOCKET_URL;

    if (explicitSocketUrl) {
        return explicitSocketUrl;
    }

    const apiBaseUrl =
        import.meta.env.VITE_API_BASE_URL
        || 'http://localhost:5000/api';

    const serverUrl =
        apiBaseUrl.replace(/\/api\/?$/, '');

    return serverUrl || window.location.origin;
}

function isPaymentSuccessEvent(
    payload: unknown,
): payload is PaymentSuccessEvent {
    return (
        typeof payload === 'object'
        && payload !== null
        && 'orderId' in payload
        && typeof payload.orderId === 'string'
    );
}

function isPaymentRefundedEvent(
    payload: unknown,
): payload is PaymentRefundedEvent {
    return (
        typeof payload === 'object'
        && payload !== null
        && 'orderId' in payload
        && typeof payload.orderId === 'string'
    );
}

function isOrderStageChangedEvent(
    payload: unknown,
): payload is OrderStageChangedEvent {
    return (
        typeof payload === 'object'
        && payload !== null
        && 'orderId' in payload
        && typeof payload.orderId === 'string'
        && 'stage' in payload
        && typeof payload.stage === 'string'
    );
}

function isDeliveryLocationEvent(
    payload: unknown,
): payload is DeliveryLocationEvent {
    return (
        typeof payload === 'object'
        && payload !== null
        && 'orderId' in payload
        && typeof payload.orderId === 'string'
        && 'latitude' in payload
        && typeof payload.latitude === 'number'
        && 'longitude' in payload
        && typeof payload.longitude === 'number'
    );
}

function isDeliveryDeliveredEvent(
    payload: unknown,
): payload is DeliveryDeliveredEvent {
    return (
        typeof payload === 'object'
        && payload !== null
        && 'orderId' in payload
        && typeof payload.orderId === 'string'
        && 'deliveredAt' in payload
    );
}

function notifyPaymentSuccessListeners(
    payload: PaymentSuccessEvent,
) {
    paymentSuccessListeners.forEach(
        (listener) => {
            listener(payload);
        },
    );
}

function notifyPaymentRefundedListeners(
    payload: PaymentRefundedEvent,
) {
    paymentRefundedListeners.forEach(
        (listener) => {
            listener(payload);
        },
    );
}

function notifyOrderStageChangedListeners(
    payload: OrderStageChangedEvent,
) {
    orderStageChangedListeners.forEach(
        (listener) => {
            listener(payload);
        },
    );
}

function notifyDeliveryLocationListeners(
    payload: DeliveryLocationEvent,
) {
    deliveryLocationListeners.forEach(
        (listener) => {
            listener(payload);
        },
    );
}

function notifyDeliveryDeliveredListeners(
    payload: DeliveryDeliveredEvent,
) {
    deliveryDeliveredListeners.forEach(
        (listener) => {
            listener(payload);
        },
    );
}

function handlePaymentSuccessEvent(
    payload: PaymentSuccessEvent,
) {
    if (!isPaymentSuccessEvent(payload)) {
        return;
    }

    notifyPaymentSuccessListeners(payload);
}

function handlePaymentRefundedEvent(
    payload: PaymentRefundedEvent,
) {
    if (!isPaymentRefundedEvent(payload)) {
        return;
    }

    notifyPaymentRefundedListeners(payload);
}

function handleOrderStageChangedEvent(
    payload: OrderStageChangedEvent,
) {
    if (!isOrderStageChangedEvent(payload)) {
        return;
    }

    notifyOrderStageChangedListeners(payload);
}

function handleDeliveryLocationEvent(
    payload: DeliveryLocationEvent,
) {
    if (!isDeliveryLocationEvent(payload)) {
        return;
    }

    notifyDeliveryLocationListeners(payload);
}

function handleDeliveryDeliveredEvent(
    payload: DeliveryDeliveredEvent,
) {
    if (!isDeliveryDeliveredEvent(payload)) {
        return;
    }

    notifyDeliveryDeliveredListeners(payload);
}

function disconnect() {
    if (activeSocket) {
        activeSocket.off(
            'payment:success',
            handlePaymentSuccessEvent,
        );

        activeSocket.off(
            'payment:refunded',
            handlePaymentRefundedEvent,
        );

        activeSocket.off(
            'order:status_changed',
            handleOrderStageChangedEvent,
        );

        activeSocket.off(
            'delivery:location',
            handleDeliveryLocationEvent,
        );

        activeSocket.off(
            'delivery:delivered',
            handleDeliveryDeliveredEvent,
        );

        activeSocket.disconnect();
    }

    activeSocket = null;
    activeToken = null;
}

function connect(token: string) {
    if (
        activeSocket
        && activeToken === token
    ) {
        if (!activeSocket.connected) {
            activeSocket.connect();
        }

        return;
    }

    disconnect();

    activeToken = token;

    activeSocket = io(
        resolveSocketServerUrl(),
        {
            auth: { token },
            transports: [
                'websocket',
                'polling',
            ],
        },
    ) as OrderSocket;

    activeSocket.on(
        'payment:success',
        handlePaymentSuccessEvent,
    );

    activeSocket.on(
        'payment:refunded',
        handlePaymentRefundedEvent,
    );

    activeSocket.on(
        'order:status_changed',
        handleOrderStageChangedEvent,
    );

    activeSocket.on(
        'delivery:location',
        handleDeliveryLocationEvent,
    );

    activeSocket.on(
        'delivery:delivered',
        handleDeliveryDeliveredEvent,
    );
}

function joinOrder(
    orderId: string,
) {
    activeSocket?.emit(
        'order:join',
        orderId,
    );
}

function leaveOrder(
    orderId: string,
) {
    activeSocket?.emit(
        'order:leave',
        orderId,
    );
}

function subscribeToPaymentSuccess(
    listener: PaymentSuccessListener,
): () => void {
    paymentSuccessListeners.add(listener);

    return () => {
        paymentSuccessListeners.delete(listener);
    };
}

function subscribeToPaymentRefunded(
    listener: PaymentRefundedListener,
): () => void {
    paymentRefundedListeners.add(listener);

    return () => {
        paymentRefundedListeners.delete(listener);
    };
}

function subscribeToStageChanged(
    listener: OrderStageChangedListener,
): () => void {
    orderStageChangedListeners.add(listener);

    return () => {
        orderStageChangedListeners.delete(listener);
    };
}

function subscribeToLocationUpdate(
    listener: DeliveryLocationListener,
): () => void {
    deliveryLocationListeners.add(listener);

    return () => {
        deliveryLocationListeners.delete(listener);
    };
}

function subscribeToDelivered(
    listener: DeliveryDeliveredListener,
): () => void {
    deliveryDeliveredListeners.add(listener);

    return () => {
        deliveryDeliveredListeners.delete(listener);
    };
}

export const orderRealtimeService = {
    connect,
    disconnect,
    joinOrder,
    leaveOrder,
    subscribeToPaymentSuccess,
    subscribeToPaymentRefunded,
    subscribeToStageChanged,
    subscribeToLocationUpdate,
    subscribeToDelivered,
};
