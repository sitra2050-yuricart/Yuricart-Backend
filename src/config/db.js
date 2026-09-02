const mongoose = require("mongoose");
const { env } = require("./env");

let connectPromise = null;

async function connectDatabase() {
  mongoose.set("strictQuery", true);

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectPromise) {
    connectPromise = mongoose
      .connect(env.MONGODB_URI, {
        maxPoolSize: env.NODE_ENV === "production" ? 5 : 10,
        serverSelectionTimeoutMS: 10000,
      })
      .then((connection) => {
        console.log(`MongoDB connected: ${connection.connection.name}`);
        return connection;
      })
      .catch((error) => {
        connectPromise = null;
        throw error;
      });
  }

  return connectPromise;
}

async function disconnectDatabase() {
  connectPromise = null;
  await mongoose.disconnect();
}

module.exports = { connectDatabase, disconnectDatabase };
