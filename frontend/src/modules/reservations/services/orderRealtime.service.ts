import {
    io,
    type Socket,
} from 'socket.io-client';

export interface PaymentSuccessEvent {
    orderId: string;
}

interface OrderServerToClientEvents {
    'payment:success': (
        event: PaymentSuccessEvent,
    ) => void;
}

interface OrderClientToServerEvents { }

type OrderSocket = Socket<
    OrderServerToClientEvents,
    OrderClientToServerEvents
>;

type PaymentSuccessListener = (
    event: PaymentSuccessEvent,
) => void;

const paymentSuccessListeners =
    new Set<PaymentSuccessListener>();

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

function notifyPaymentSuccessListeners(
    payload: PaymentSuccessEvent,
) {
    paymentSuccessListeners.forEach(
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

function disconnect() {
    if (activeSocket) {
        activeSocket.off(
            'payment:success',
            handlePaymentSuccessEvent,
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
}

function subscribeToPaymentSuccess(
    listener: PaymentSuccessListener,
): () => void {
    paymentSuccessListeners.add(listener);

    return () => {
        paymentSuccessListeners.delete(listener);
    };
}

export const orderRealtimeService = {
    connect,
    disconnect,
    subscribeToPaymentSuccess,
};
