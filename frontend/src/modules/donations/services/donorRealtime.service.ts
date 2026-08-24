import {
    io,
    type Socket,
} from 'socket.io-client';
import type {
    SoldOutEvent,
} from '../types';

interface DonorServerToClientEvents {
    'listing:sold_out': (
        event: SoldOutEvent,
    ) => void;
}

interface DonorClientToServerEvents { }

type DonorSocket = Socket<
    DonorServerToClientEvents,
    DonorClientToServerEvents
>;

type SoldOutListener = (
    event: SoldOutEvent,
) => void;

const soldOutListeners =
    new Set<SoldOutListener>();

let activeSocket: DonorSocket | null =
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

function isSoldOutEvent(
    payload: unknown,
): payload is SoldOutEvent {
    return (
        typeof payload === 'object'
        && payload !== null
        && 'listingId' in payload
        && typeof payload.listingId === 'string'
        && 'name' in payload
        && typeof payload.name === 'string'
    );
}

function notifySoldOutListeners(
    payload: SoldOutEvent,
) {
    soldOutListeners.forEach(
        (listener) => {
            listener(payload);
        },
    );
}

function handleSoldOutEvent(
    payload: SoldOutEvent,
) {
    if (!isSoldOutEvent(payload)) {
        return;
    }

    notifySoldOutListeners(payload);
}

function disconnect() {
    if (activeSocket) {
        activeSocket.off(
            'listing:sold_out',
            handleSoldOutEvent,
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
    ) as DonorSocket;

    activeSocket.on(
        'listing:sold_out',
        handleSoldOutEvent,
    );
}

function subscribeToSoldOut(
    listener: SoldOutListener,
): () => void {
    soldOutListeners.add(listener);

    return () => {
        soldOutListeners.delete(listener);
    };
}

export const donorRealtimeService = {
    connect,
    disconnect,
    subscribeToSoldOut,
};