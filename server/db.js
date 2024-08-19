const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb+srv://azharsayzz:Azhar70@testify.gfybw.mongodb.net/?retryWrites=true&w=majority&appName=Testify");
    console.log("MongoDB Connected.");
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

module.exports = connectDB;
