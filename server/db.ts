import mongoose from "mongoose";

function getMongoUri() {
  const mongodbUri = process.env.MONGODB_URI;

  if (!mongodbUri) {
    throw new Error("MONGODB_URI is not set. Add it to your .env file.");
  }

  return mongodbUri;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseConnectionPromise: Promise<typeof mongoose> | undefined;
}

export async function connectToDatabase() {
  if (!global.mongooseConnectionPromise) {
    global.mongooseConnectionPromise = mongoose.connect(getMongoUri(), {
      dbName: process.env.MONGODB_DB || "neoconnect"
    });
  }

  return global.mongooseConnectionPromise;
}