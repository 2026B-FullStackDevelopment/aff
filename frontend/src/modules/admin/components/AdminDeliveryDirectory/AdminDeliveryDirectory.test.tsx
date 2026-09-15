import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminDeliveryDTO } from '@/types/api';

const { changeStageMock, useAdminDeliveriesMock } = vi.hoisted(() => ({
  changeStageMock: vi.fn(),
  useAdminDeliveriesMock: vi.fn(),
}));

vi.mock('../../hooks/useAdminDeliveries', () => ({
  useAdminDeliveries: useAdminDeliveriesMock,
}));

import { AdminDeliveryDirectory } from './AdminDeliveryDirectory';

const delivery: AdminDeliveryDTO = {
  id: '507f1f77bcf86cd799439021',
  orderId: '507f1f77bcf86cd799439022',
  courierId: '507f1f77bcf86cd799439023',
  stage: 'PICKED_UP',
  pickupAddressText: null,
  pickupAddressLocation: null,
  deliveryAddressText: '12 Nguyen Hue, Ho Chi Minh City',
  deliveryLocation: null,
  requiresCashCollection: false,
  amount: 15000,
  pickedUpAt: '2026-09-12T09:00:00.000Z',
  deliveredAt: null,
  courierLastLocation: null,
  createdAt: '2026-09-12T08:30:00.000Z',
  courier: { id: '507f1f77bcf86cd799439023', fullName: 'Nguyen Van Courier' },
  order: {
    id: '507f1f77bcf86cd799439022',
    recipientId: '507f1f77bcf86cd799439024',
  },
};

describe('AdminDeliveryDirectory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAdminDeliveriesMock.mockReturnValue({
      items: [delivery],
      page: 1,
      total: 1,
      pageSize: 20,
      stage: '',
      isLoading: false,
      error: null,
      changeStage: changeStageMock,
      goToPage: vi.fn(),
      retry: vi.fn(),
    });
  });

  it('shows delivery oversight fields and exposes no assignment controls', () => {
    render(<AdminDeliveryDirectory />);

    expect(screen.getByRole('heading', { name: 'Delivery oversight' })).toBeInTheDocument();
    expect(screen.getAllByText('Nguyen Van Courier').length).toBeGreaterThan(0);
    expect(screen.getAllByText('PICKED UP').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /assign|reassign|force.claim/i })).not.toBeInTheDocument();
  });

  it('passes a selected stage to the read-only directory hook', async () => {
    const user = userEvent.setup();
    render(<AdminDeliveryDirectory />);

    await user.selectOptions(screen.getByLabelText('Delivery stage'), 'PICKED_UP');

    expect(changeStageMock).toHaveBeenCalledOnce();
    expect(changeStageMock).toHaveBeenCalledWith('PICKED_UP');
  });
});
