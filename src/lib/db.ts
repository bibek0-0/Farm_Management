import mongoose from 'mongoose';

// Extend globalThis to cache the connection across serverless invocations
declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: {
    conn: mongoose.Connection | null;
    promise: Promise<mongoose.Connection> | null;
  };
}

// Initialize cache on globalThis — survives hot-reloads in dev
if (!global._mongooseCache) {
  global._mongooseCache = { conn: null, promise: null };
}

async function connectDB(): Promise<mongoose.Connection> {
  // Lazy-check the URI inside the function so the module can be safely
  // imported at build time without throwing (Next.js page-data collection).
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error(
      'Missing environment variable: MONGODB_URI. ' +
      'Add it to your .env.local file or Vercel environment settings.'
    );
  }

  const cached = global._mongooseCache;

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        maxPoolSize: 10,       // stay well within Atlas M0's 500-connection limit
      })
      .then((m) => m.connection);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;   // allow retry on next invocation
    throw e;
  }

  return cached.conn;
}

export default connectDB;
