// Defines internal persistence and repository types for Recipient profiles.
import type mongoose from 'mongoose';
import type { Types } from 'mongoose';

type Tier = 'STANDARD' | 'PREMIUM';
interface RecipientAttrs {
  userId: mongoose.Types.ObjectId;
  tier: Tier;
  stripeCustomerId: string | null;
}
interface RecipientDocument extends RecipientAttrs, mongoose.Document {}
interface CreateRecipientInput { userId: string | Types.ObjectId }

export type { Tier, RecipientAttrs, RecipientDocument, CreateRecipientInput };
