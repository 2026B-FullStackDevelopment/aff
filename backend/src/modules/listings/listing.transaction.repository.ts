// Owns the Mongoose transaction boundary used by Listing business workflows.
import mongoose, { type ClientSession } from 'mongoose';

/** Runs an operation in a transaction and always releases its session. */
async function withTransaction<T>(
  operation: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const session = await mongoose.startSession();

  try {
    let result!: T;

    await session.withTransaction(async () => {
      result = await operation(session);
    });

    return result;
  } finally {
    await session.endSession();
  }
}

export { withTransaction };
