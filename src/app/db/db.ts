import mongoose, { Schema, Document } from 'mongoose';

interface IElement extends Document {
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

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local or provide a default'
  );
}


async function connectToDB() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Successfully connected to MongoDB.');
  } catch (e) {
    console.error('Error connecting to MongoDB:', e);
    throw new Error('Failed to connect to MongoDB.');
  }
}

export { connectToDB, Element };