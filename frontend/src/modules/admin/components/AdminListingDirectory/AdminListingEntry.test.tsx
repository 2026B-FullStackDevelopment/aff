import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AdminListingDTO } from '@/types/api';
import { AdminListingCard } from './AdminListingEntry';

const listing: AdminListingDTO = {
  id: 'listing-128',
  donor: {
    id: 'donor-42',
    companyName: 'Khang Community Kitchen',
    city: 'Ho Chi Minh City',
    location: {
      latitude: 10.77689,
      longitude: 106.70081,
      updatedAt: '2026-09-12T08:00:00.000Z',
    },
  },
  name: 'Vegetable meal boxes',
  description: 'Fresh meals prepared for collection today.',
  imageUrl: null,
  unit: 'UNIT',
  category: 'COOKED_DISH',
  isVegetarian: true,
  price: 15000,
  city: 'Thu Duc City',
  status: 'ACTIVE',
  donationLimit: 30,
  rationLimitPerPerson: 2,
  quantityRemaining: 18,
  pendingOrderCount: 3,
  createdAt: '2026-09-12T08:30:00.000Z',
};

describe('AdminListingCard', () => {
  it('renders the full listing detail using Vietnamese currency', () => {
    render(<AdminListingCard listing={listing} onCancel={vi.fn()} />);

    expect(screen.getByText('Vegetable meal boxes')).toBeInTheDocument();
    expect(screen.getByText('Fresh meals prepared for collection today.')).toBeInTheDocument();
    expect(screen.getByText('Khang Community Kitchen')).toBeInTheDocument();
    expect(screen.getByText('donor-42')).toBeInTheDocument();
    expect(screen.getByText('Ho Chi Minh City')).toBeInTheDocument();
    expect(screen.getByText('10.77689, 106.70081')).toBeInTheDocument();
    expect(screen.getByText('Thu Duc City')).toBeInTheDocument();
    expect(screen.getByText('Cooked Dish')).toBeInTheDocument();
    expect(screen.getByText('Vegetarian')).toBeInTheDocument();
    expect(screen.getByText('18 / 30 units')).toBeInTheDocument();
    expect(screen.getByText('15,000 VND')).toBeInTheDocument();
    expect(screen.getByText('2 per Recipient')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
  });
});
