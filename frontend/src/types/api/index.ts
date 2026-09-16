// Barrel re-export of all domain-specific API type files.
// Import from here OR from the specific domain file directly:
//   import type { ListingDTO } from '@/types/api';            // still works
//   import type { ListingDTO } from '@/types/api/listings';   // preferred for new code

export * from './common';
export * from './users';
export * from './auth';
export * from './media';
export * from './listings';
export * from './delivery';
export * from './orders';
export * from './subscriptions';
export * from './notifications';
export * from './legacy';
