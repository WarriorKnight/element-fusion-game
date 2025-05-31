import mongoose, { Schema, Document } from 'mongoose';

export interface IElement extends Document {
  name: string;
  iconUrl: string;
  description?: string;
  createdAt: Date;
  combinedFrom?: [mongoose.Types.ObjectId, mongoose.Types.ObjectId];
}

const elementSchema = new Schema<IElement>({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  iconUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  combinedFrom: [{ type: Schema.Types.ObjectId, ref: 'Element' }]
});

const Element = mongoose.models.Element || mongoose.model<IElement>('Element', elementSchema);

const MONGODB_URI = process.env.MONGODB_URI;

async function connectToDB() {
  console.log('[DB] Attempting to connect to MongoDB...');
  console.log(`[DB] MONGODB_URI: "${MONGODB_URI}"`); // Log the URI

  if (!MONGODB_URI) {
    console.error('[DB] MONGODB_URI is not defined. Cannot connect.');
    throw new Error('MONGODB_URI is not defined.');
  }

  if (mongoose.connection.readyState >= 1) {
    console.log('[DB] MongoDB connection already established.');
    return;
  }

  try {
    console.log('[DB] Calling mongoose.connect()...');
    await mongoose.connect(MONGODB_URI as string, {
      serverSelectionTimeoutMS: 5000 // Optional: Add a shorter timeout for connection attempt
    });
    console.log('[DB] Successfully connected to MongoDB.');
  } catch (e) {
    console.error('[DB] Error connecting to MongoDB:', e);
    // Consider logging the full error object if 'e' doesn't give enough detail
    // console.error('[DB] Full error object:', JSON.stringify(e, Object.getOwnPropertyNames(e)));
    throw new Error('Failed to connect to MongoDB.');
  }
  console.log('[DB] connectToDB function finished.');
}

export { connectToDB, Element };