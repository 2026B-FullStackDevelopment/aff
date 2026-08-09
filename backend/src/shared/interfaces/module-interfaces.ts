// Collects module interfaces when a feature needs to depend on another module safely.
import { userInterface } from '../../modules/users/user.interface.js';
import { listingInterface } from '../../modules/listings/listing.interface.js';
import { subscriptionInterface } from '../../modules/subscriptions/subscription.interface.js';
import { deliveryInterface } from '../../modules/delivery/delivery.interface.js';

export { userInterface, listingInterface, subscriptionInterface, deliveryInterface };
