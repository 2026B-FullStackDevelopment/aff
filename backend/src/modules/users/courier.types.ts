// Defines internal persistence and repository types for Courier profiles.
import type mongoose from 'mongoose';
import type { Types } from 'mongoose';

interface CourierAttrs { userId: mongoose.Types.ObjectId; fullName: string }
interface CourierDocument extends CourierAttrs, mongoose.Document {}
interface CreateCourierInput { userId: string | Types.ObjectId; fullName: string }

export type { CourierAttrs, CourierDocument, CreateCourierInput };
