import { createServer, type Server as HttpServer } from 'node:http';
import {
  io as createSocketClient,
  type Socket as ClientSocket,
} from 'socket.io-client';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  emitToOrder,
  emitToUser,
  initializeSocketServer,
} from '../../../src/realtime/socket.js';

// Create two fake functions for the tests
const {
  verifyAccessTokenMock,
  verifyOrderOwnershipMock,
  recordCourierLocationMock,
} = vi.hoisted(() => ({
  // Pretends to check whether a login token is valid.
  verifyAccessTokenMock: vi.fn(),

  // Pretends to check whether a user owns an order.
  verifyOrderOwnershipMock: vi.fn(),

  // Pretends to record a Courier's GPS position.
  recordCourierLocationMock: vi.fn(),
}));

// Replace the real login checker with our fake, avoids using real login information during the tests.
vi.mock('../../../src/modules/auth/auth.interface.js', () => ({
  authInterface: {
    verifyAccessToken: verifyAccessTokenMock,
  },
}));

// Replace the real order ownership checker with fake
vi.mock('../../../src/modules/orders/order.interface.js', () => ({
  orderInterface: {
    verifyOrderOwnership: verifyOrderOwnershipMock,
  },
}));

// Replace the real delivery module with fake, avoids pulling in Mongoose
vi.mock('../../../src/modules/delivery/delivery.interface.js', () => ({
  deliveryInterface: {
    recordCourierLocation: recordCourierLocationMock,
  },
}));

// Give the test a temporary instead of real frontend address
vi.mock('../../../src/config/env.js', () => ({
  env: {
    clientUrl: 'http://localhost:5173',
  },
}));

// Ids for testing
const RECIPIENT_ID = '507f191e810c19729de860ea';
const OTHER_RECIPIENT_ID = '507f191e810c19729de860eb';
const COURIER_ID = '507f191e810c19729de860ec';
const ORDER_ID = '507f191e810c19729de86001';
const OTHER_ORDER_ID = '507f191e810c19729de86002';
const NONEXISTENT_ORDER_ID = '507f191e810c19729de86003';

type UserRole = 'RECIPIENT' | 'DONOR' | 'ADMIN' | 'COURIER';

// Group all Socket.IO login tests together.
describe('Socket.IO authentication', () => {
    // The temporary web server used by the tests.
    let httpServer: HttpServer;
    let socketServer: ReturnType<typeof initializeSocketServer>;
    let serverUrl: string;
    // Keep track of every test client to disconnect later.
    let clients: ClientSocket[] = [];
    // Records successful connections.
    const connectionHandler = vi.fn((_socket: unknown) => {});
    
    // Run before every test.
    beforeEach(async () => {
        verifyAccessTokenMock.mockReset();
        verifyOrderOwnershipMock.mockReset();

        clients = [];
        connectionHandler.mockClear();

        // Every test receives its own temporary server.
        httpServer = createServer();
        socketServer = initializeSocketServer(httpServer);
        socketServer.on('connection', connectionHandler);

        await new Promise<void>((resolve) => {
            httpServer.listen(0, '127.0.0.1', resolve);
        });

        const address = httpServer.address();

        if (!address || typeof address === 'string') {
            throw new Error('Could not determine the test server port.');
        }

        serverUrl = `http://127.0.0.1:${address.port}`;
    });

    // Run after every test.
    afterEach(async () => {
        // Disconnect every test client.
        for (const client of clients) {
            client.removeAllListeners();
            client.disconnect();
        }

        // Close Socket.IO after every test.
        await new Promise<void>((resolve) => {
            socketServer.close(() => resolve());
        });

        // Socket.IO normally closes this server, but check to be safe.
        if (httpServer.listening) {
            await new Promise<void>((resolve, reject) => {
            httpServer.close((error) => {
                if (error) reject(error);
                else resolve();
            });
            });
        }
    });

    // Try to connect and wait for the connection to fail.
    function waitForConnectError(client: ClientSocket): Promise<Error> {
        return new Promise((resolve, reject) => {
        // Fail the test if no answer is received within two seconds.
        const timeout = setTimeout(() => {
            reject(new Error('Timed out waiting for connect_error.'));
        }, 2000);

        // Run this when the server rejects the connection.
        client.once('connect_error', (error) => {
            clearTimeout(timeout);
            resolve(error);
        });

        // Begin connecting to the server.
        client.connect();
        });
    }

    // Check that a person cannot connect without a login token.
    it('rejects a connection with no token before the connection handler runs', async () => {
        // Create a client without a token.
        const client = makeClient();

        // Wait for the server to reject it.
        const error = await waitForConnectError(client);

        // Check that the correct message was returned.
        expect(error.message).toBe('Authentication is required.');

        // The token-checking function should not run because no token was supplied.
        expect(verifyAccessTokenMock).not.toHaveBeenCalled();

        // The successful connection section must not run.
        expect(connectionHandler).not.toHaveBeenCalled();
    });

    // Check that a person cannot connect with a bad token.
    it('rejects an invalid token', async () => {
        // Make the fake token checker reject the token.
        verifyAccessTokenMock.mockRejectedValue(
        new Error('Invalid access token.')
        );

        // Create a client with a bad token.
        const client = makeClient('invalid-token');

        // Wait for the server to reject it.
        const error = await waitForConnectError(client);

        // Check the message sent back to the client.
        expect(error.message).toBe('Authentication failed.');

        // Check that the correct token was examined.
        expect(verifyAccessTokenMock).toHaveBeenCalledWith('invalid-token');

        // The successful connection section must not run.
        expect(connectionHandler).not.toHaveBeenCalled();
    });

    // Check that a logged-out token cannot be used again.
    it('rejects a revoked token through the shared auth interface', async () => {
        // Create the error returned when a login session is no longer valid.
        const revokedError = new Error(
        'Your session is no longer valid. Please log in again.'
        );

        // Make the fake token checker reject the old token.
        verifyAccessTokenMock.mockRejectedValue(revokedError);

        // Create a client using the old token.
        const client = makeClient('revoked-token');

        // Wait for the server to reject it.
        const error = await waitForConnectError(client);

        // Check the message sent back to the client.
        expect(error.message).toBe('Authentication failed.');

        // Check that the old token was passed to the login checker.
        expect(verifyAccessTokenMock).toHaveBeenCalledWith('revoked-token');

        // The successful connection section must not run.
        expect(connectionHandler).not.toHaveBeenCalled();
    });

    // Check that a person can connect with a valid token.
    it('accepts a valid token through the shared auth interface', async () => {
        // Make the fake token checker return valid user information.
        verifyAccessTokenMock.mockResolvedValue({
        userId: '507f191e810c19729de860ea',
        role: 'RECIPIENT',
        jti: 'test-jti',
        expiresAt: new Date('2026-08-16T00:00:00.000Z'),
        });

        // Create a client with a valid token.
        const client = makeClient('valid-token');

        // Wait for the connection to succeed.
        await connect(client);

        // Confirm that the client is connected.
        expect(client.connected).toBe(true);

        // Confirm that the token was checked.
        expect(verifyAccessTokenMock).toHaveBeenCalledWith('valid-token');

        // Confirm that the successful connection section ran once.
        expect(connectionHandler).toHaveBeenCalledOnce();
    });

    // Choose which pretend login tokens should be accepted.
    function mockTokens(
        users: Record<string, { userId: string; role: UserRole }>
    ): void {
        verifyAccessTokenMock.mockImplementation(async (token: string) => {
            const user = users[token];

            if (!user) {
            throw new Error('Invalid access token.');
            }

            return {
            ...user,
            jti: `test-${token}`,
            expiresAt: new Date(Date.now() + 60_000),
            };
        });
    }

    // Create a test client with or without a login token.
    function makeClient(token?: string): ClientSocket {
        const client = createSocketClient(serverUrl, {
            autoConnect: false,
            forceNew: true,
            reconnection: false,
            transports: ['websocket'],
            auth: token ? { token } : {},
        });

        // Remember the connection so it can be closed after the test.
        clients.push(client);
        return client;
    }

    // Start a connection and wait until it succeeds or fails.
    function connect(client: ClientSocket): Promise<void> {
        return new Promise((resolve, reject) => {
        // Stop waiting if the connection takes too long.
        const timeout = setTimeout(
            () => reject(new Error('Connection timed out.')),
            2000
        );

        client.once('connect', () => {
            clearTimeout(timeout);
            resolve();
        });

        client.once('connect_error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });

        client.connect();
        });
    }

    // Wait until an expected change happens.
    async function waitUntil(
    condition: () => boolean,
    message: string
    ): Promise<void> {
    const deadline = Date.now() + 2000;

    while (!condition()) {
        if (Date.now() >= deadline) {
        throw new Error(message);
        }

        await new Promise((resolve) => setTimeout(resolve, 10));
    }
    }

    // Find the server's copy of a browser connection.
    function serverSocket(client: ClientSocket) {
    if (!client.id) {
        throw new Error('Client is not connected.');
    }

    const socket = socketServer.sockets.sockets.get(client.id);

    if (!socket) {
        throw new Error('Server connection was not found.');
    }

    return socket;
    }

    // Prepare a pretend user and connect them to the server.
    async function connectUser(
    token: string,
    userId: string,
    role: UserRole = 'RECIPIENT'
    ): Promise<ClientSocket> {
    mockTokens({ [token]: { userId, role } });

    const client = makeClient(token);
    await connect(client);

    return client;
    }

    // Ask to watch an order and wait until its room has been joined.
    async function joinOrder(
        client: ClientSocket,
        orderId: string
    ): Promise<void> {
        client.emit('order:join', orderId);

        await waitUntil(
            () => serverSocket(client).rooms.has(`order:${orderId}`),
            `Did not join order:${orderId}.`
        );
    }

    // Confirm that a logged-in user automatically enters their private room.
    it('joins the personal room from the verified token', async () => {
        // Connect using a test Recipient's token 
        const client = await connectUser('valid-token', RECIPIENT_ID);

        // Wait for private room to be ready.
        await waitUntil(
            () => serverSocket(client).rooms.has(`user:${RECIPIENT_ID}`),
            'Did not join the personal room.'
        );

        // Confirm token checked and correct room
        expect(verifyAccessTokenMock).toHaveBeenCalledWith('valid-token');
        expect(serverSocket(client).rooms).toContain(`user:${RECIPIENT_ID}`);
        expect(serverSocket(client).rooms).not.toContain(
            `user:${OTHER_RECIPIENT_ID}`
        );
    });

    // Confirm Recipient can watch their own order
    it('allows a Recipient to join their own order room', async () => {
        // Pretend that the ownership check succeeds.
        verifyOrderOwnershipMock.mockResolvedValue(true);

        const client = await connectUser('owner-token', RECIPIENT_ID);
        await joinOrder(client, ORDER_ID);

        // Confirm the order and authenticated user checked.
        expect(verifyOrderOwnershipMock).toHaveBeenCalledWith(
            ORDER_ID,
            RECIPIENT_ID
        );
        expect(serverSocket(client).rooms).toContain(`order:${ORDER_ID}`);
    });

    // Try several orders the Recipient cannot watch
    it.each([
        ["another Recipient's order", OTHER_ORDER_ID],
        ['a nonexistent order', NONEXISTENT_ORDER_ID],
        ['an invalid order ID', 'invalid-id'],
        ])('rejects %s', async (_description, orderId) => {
        
        // Set Recipient to not owning orders
        verifyOrderOwnershipMock.mockResolvedValue(false);

        const client = await connectUser('recipient-token', RECIPIENT_ID);

        // Ask the server to join the unauthorized order room.
        client.emit('order:join', orderId);

        // Wait until the ownership check has happened.
        await waitUntil(
            () => verifyOrderOwnershipMock.mock.calls.length === 1,
            'Ownership was not checked.'
        );

        // Confirm the correct details were checked and the room was not joined.
        expect(verifyOrderOwnershipMock).toHaveBeenCalledWith(
            orderId,
            RECIPIENT_ID
        );
        expect(serverSocket(client).rooms).not.toContain(`order:${orderId}`);
    });

    // Confirm non-Recipient cannot join order rooms.
    it.each<UserRole>(['DONOR', 'ADMIN', 'COURIER'])(
        'rejects a %s order-room join',
        async (role) => {
            const client = await connectUser('role-token', RECIPIENT_ID, role);
            const socket = serverSocket(client);

            // Wait until the request reaches the server.
            const requestReceived = new Promise<void>((resolve) => {
            socket.once('order:join', () => resolve());
            });

            // Ask to join the room and wait for the server to receive the request.
            client.emit('order:join', ORDER_ID);
            await requestReceived;

            // The role is rejected before an ownership lookup is needed.
            expect(verifyOrderOwnershipMock).not.toHaveBeenCalled();
            expect(socket.rooms).not.toContain(`order:${ORDER_ID}`);
        }
    );

    // Confirm that a connection can stop watching an order.
    it('leaves an order room', async () => {
        // First allow Recipient join their order room.
        verifyOrderOwnershipMock.mockResolvedValue(true);

        const client = await connectUser('owner-token', RECIPIENT_ID);
        await joinOrder(client, ORDER_ID);

        // Ask the connection to leave the room.
        client.emit('order:leave', ORDER_ID);

        // Wait until the connection is no longer in the room.
        await waitUntil(
            () => !serverSocket(client).rooms.has(`order:${ORDER_ID}`),
            `Did not leave order:${ORDER_ID}.`
        );

        expect(serverSocket(client).rooms).not.toContain(`order:${ORDER_ID}`);
    });

    // Confirm that a user event reaches only all connections of user.
    it('emitToUser reaches only the target user connections', async () => {
        // Prepare two connections for one user and one connection for another user.
        mockTokens({
            first: { userId: RECIPIENT_ID, role: 'RECIPIENT' },
            second: { userId: RECIPIENT_ID, role: 'RECIPIENT' },
            other: { userId: OTHER_RECIPIENT_ID, role: 'RECIPIENT' },
        });

        const first = makeClient('first');
        const second = makeClient('second');
        const other = makeClient('other');

        // Connect all three pretend browsers.
        await Promise.all([connect(first), connect(second), connect(other)]);

        // Wait until their private rooms are ready.
        await waitUntil(
            () =>
            serverSocket(first).rooms.has(`user:${RECIPIENT_ID}`) &&
            serverSocket(second).rooms.has(`user:${RECIPIENT_ID}`) &&
            serverSocket(other).rooms.has(`user:${OTHER_RECIPIENT_ID}`),
            'Personal rooms were not ready.'
        );

        // Record which connections receive the test message.
        const firstHandler = vi.fn();
        const secondHandler = vi.fn();
        const otherHandler = vi.fn();
        const payload = { message: 'private' };

        first.on('test:user', firstHandler);
        second.on('test:user', secondHandler);
        other.on('test:user', otherHandler);

        // Send the message only to the selected user.
        emitToUser(RECIPIENT_ID, 'test:user', payload);

        // Wait until both connections belonging to that user receive it.
        await waitUntil(
            () =>
            firstHandler.mock.calls.length === 1 &&
            secondHandler.mock.calls.length === 1,
            'Target user did not receive the event.'
        );

        // Allow time for an incorrectly broadcast event to appear.
        await new Promise((resolve) => setTimeout(resolve, 50));

        // The other user must not receive the private message.
        expect(firstHandler).toHaveBeenCalledWith(payload);
        expect(secondHandler).toHaveBeenCalledWith(payload);
        expect(otherHandler).not.toHaveBeenCalled();
    });

    // Confirm that an order event reaches only connections watching that order.
    it('emitToOrder reaches only the target order room', async () => {
        // Prepare one tracking connection, one non-tracking connection for the same user, and one connection watching a different order.
        mockTokens({
            tracking: { userId: RECIPIENT_ID, role: 'RECIPIENT' },
            notTracking: { userId: RECIPIENT_ID, role: 'RECIPIENT' },
            otherOrder: { userId: OTHER_RECIPIENT_ID, role: 'RECIPIENT' },
        });

        // Accept only the matching user and order combinations.
        verifyOrderOwnershipMock.mockImplementation(
            async (orderId: string, recipientId: string) =>
            (orderId === ORDER_ID && recipientId === RECIPIENT_ID) ||
            (orderId === OTHER_ORDER_ID &&
                recipientId === OTHER_RECIPIENT_ID)
        );

        const tracking = makeClient('tracking');
        const notTracking = makeClient('notTracking');
        const otherOrder = makeClient('otherOrder');

        // Connect all three pretend browsers.
        await Promise.all([
            connect(tracking),
            connect(notTracking),
            connect(otherOrder),
        ]);

        // Join the target order and a separate order room.
        await Promise.all([
            joinOrder(tracking, ORDER_ID),
            joinOrder(otherOrder, OTHER_ORDER_ID),
        ]);

        // Record which connections receive the test order message.
        const trackingHandler = vi.fn();
        const notTrackingHandler = vi.fn();
        const otherOrderHandler = vi.fn();
        const payload = { orderId: ORDER_ID };

        tracking.on('test:order', trackingHandler);
        notTracking.on('test:order', notTrackingHandler);
        otherOrder.on('test:order', otherOrderHandler);

        // Send the message only to connections watching the target order.
        emitToOrder(ORDER_ID, 'test:order', payload);

        // Wait for the correct tracking connection to receive it.
        await waitUntil(
            () => trackingHandler.mock.calls.length === 1,
            'Tracking connection did not receive the event.'
        );

        // Allow time for an incorrectly broadcast event to appear.
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Neither the non-tracking connection nor the other order should receive it.
        expect(trackingHandler).toHaveBeenCalledWith(payload);
        expect(notTrackingHandler).not.toHaveBeenCalled();
        expect(otherOrderHandler).not.toHaveBeenCalled();
    });

    describe('delivery:ping', () => {
        beforeEach(() => {
            recordCourierLocationMock.mockReset();
        });

        it('broadcasts a Courier position to the watchers of that order', async () => {
            recordCourierLocationMock.mockResolvedValue({
                _id: 'd1',
                orderId: ORDER_ID,
                stage: 'PICKED_UP',
                courierLastLocation: {
                    latitude: 10.8,
                    longitude: 106.6,
                    updatedAt: new Date('2026-09-07T10:00:00.000Z'),
                },
            });

            const recipient = await connectUser('recipient-token', RECIPIENT_ID);
            verifyOrderOwnershipMock.mockResolvedValue(true);
            await joinOrder(recipient, ORDER_ID);

            const received = vi.fn();
            recipient.on('delivery:location', received);

            const courier = await connectUser('courier-token', COURIER_ID, 'COURIER');
            courier.emit('delivery:ping', { latitude: 10.8, longitude: 106.6 });

            await waitUntil(
                () => received.mock.calls.length > 0,
                'Recipient never received delivery:location.',
            );

            expect(recordCourierLocationMock).toHaveBeenCalledWith(COURIER_ID, {
                latitude: 10.8,
                longitude: 106.6,
            });
            expect(received).toHaveBeenCalledWith(
                expect.objectContaining({
                    orderId: ORDER_ID,
                    latitude: 10.8,
                    longitude: 106.6,
                }),
            );
        });

        it('ignores a ping from a non-Courier', async () => {
            const recipient = await connectUser('recipient-token', RECIPIENT_ID);

            recipient.emit('delivery:ping', { latitude: 10.8, longitude: 106.6 });

            await new Promise((resolve) => setTimeout(resolve, 50));
            expect(recordCourierLocationMock).not.toHaveBeenCalled();
        });

        it('ignores a ping with coordinates outside the valid range', async () => {
            const courier = await connectUser('courier-token', COURIER_ID, 'COURIER');

            courier.emit('delivery:ping', { latitude: 999, longitude: 106.6 });

            await new Promise((resolve) => setTimeout(resolve, 50));
            expect(recordCourierLocationMock).not.toHaveBeenCalled();
        });

        it('emits nothing when the Courier has no picked-up Delivery', async () => {
            recordCourierLocationMock.mockResolvedValue(null);

            const recipient = await connectUser('recipient-token', RECIPIENT_ID);
            verifyOrderOwnershipMock.mockResolvedValue(true);
            await joinOrder(recipient, ORDER_ID);

            const received = vi.fn();
            recipient.on('delivery:location', received);

            const courier = await connectUser('courier-token', COURIER_ID, 'COURIER');
            courier.emit('delivery:ping', { latitude: 10.8, longitude: 106.6 });

            await new Promise((resolve) => setTimeout(resolve, 50));
            expect(recordCourierLocationMock).toHaveBeenCalled();
            expect(received).not.toHaveBeenCalled();
        });
    });

});

