import mongoose, { Schema, Document } from 'mongoose';

/**
 * IElement interface defines the structure for an element document in MongoDB.
 *
 * @property {string} name - The unique name of the element.
 * @property {string} iconUrl - The URL for the element's icon image.
 * @property {string} [description] - An optional description of the element.
 * @property {Date} createdAt - The timestamp when the element was created.
 * @property {[mongoose.Types.ObjectId, mongoose.Types.ObjectId]} [combinedFrom] - An optional array of two ObjectIds representing the elements that were fused to create this element.
 */
export interface IElement extends Document {
  name: string;
  iconUrl: string;
  description?: string;
  createdAt: Date;
  combinedFrom?: [mongoose.Types.ObjectId, mongoose.Types.ObjectId];
}

/**
 * Mongoose schema definition for an element.
 */
const elementSchema = new Schema<IElement>({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  iconUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  combinedFrom: [{ type: Schema.Types.ObjectId, ref: 'Element' }]
});

/**
 * The Element model is either retrieved from the existing Mongoose models or is created from the schema.
 */
const Element = mongoose.models.Element || mongoose.model<IElement>('Element', elementSchema);

/**
 * Retrieve the MongoDB connection URI from environment variables.
 */
const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Establishes a connection to MongoDB.
 *
 * This function checks if a connection is already active. If not, it attempts to connect using the provided
 * MongoDB URI. If the URI is not defined or if the connection fails, it throws an error.
 *
 * @throws {Error} If MONGODB_URI is not defined or if the connection fails.
 */
async function connectToDB() {
  if (!MONGODB_URI) {
    console.error('[DB] MONGODB_URI is not defined. Cannot connect.');
    throw new Error('MONGODB_URI is not defined.');
  }

  // If already connected, exit early.
  if (mongoose.connection.readyState >= 1) {
    console.log('[DB] MongoDB connection already established.');
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI as string, {});
    console.log('[DB] Successfully connected to MongoDB.');
  } catch {
    throw new Error('Failed to connect to MongoDB.');
  }
  console.log('[DB] connectToDB function finished.');
}

export { connectToDB, Element };