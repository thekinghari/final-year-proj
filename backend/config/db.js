const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri || mongoUri.includes('<username>') || mongoUri.includes('<password>')) {
      console.warn(`
  ⚠️  MongoDB URI not configured!
  
  Please set up your MongoDB connection:
  1. Go to https://www.mongodb.com/atlas
  2. Create a free M0 cluster
  3. Create a database user
  4. Whitelist your IP (or 0.0.0.0/0 for all)
  5. Click "Connect" → "Connect your application"
  6. Copy the connection string
  7. Paste it in backend/.env as MONGO_URI
  
  Example: MONGO_URI=mongodb+srv://myuser:mypass@cluster0.xxxxx.mongodb.net/blue-carbon-registry?retryWrites=true&w=majority
      `);
      return false;
    }

    const conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.warn('⚠️  Server will start but database operations will fail.');
    return false;
  }
};

module.exports = connectDB;
