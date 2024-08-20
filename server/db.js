const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Use environment variable for MongoDB URI
    const dbURI = process.env.MONGO_URI;
    await mongoose.connect(dbURI);
    console.log("MongoDB Connected.");
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

module.exports = connectDB;