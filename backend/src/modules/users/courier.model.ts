// separate courier model, repo for this specific user role

import mongoose, { Schema } from "mongoose";

// TS needs an interface to desc the fields stored in a Courier document

interface CourierAttrs {
    userId: mongoose.Types.ObjectId;
    fullName: string; 
}

interface CourierDocument
  extends CourierAttrs,
    mongoose.Document {}

// TS new Schema<>()
// <> is TS generic type, gives a name to indentify the document
const courierSchema = new Schema<CourierDocument> ({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true},
    fullName: { type: String, required: true}
})

export default mongoose.model<CourierDocument>('Courier', courierSchema);
export type { CourierDocument };

