const express = require("express");
const connectDB = require("./db.js");
const TestModel = require("./models/TestModel.js");
const bodyParser = require("body-parser");
const cors = require("cors");
const {
  signupValidation,
  loginValidation,
} = require("./middlewares/AuthValidation.js");
const { signup, login } = require("./controllers/AuthController.js");
const path = require("path");
const nodemailer = require('nodemailer');
const UserModel = require("./models/UserModel.js"); // Ensure this is correctly imported

require("dotenv").config();

const PORT = process.env.PORT || 5000;

const app = express();

const _dirname = path.dirname("");
const buildpath = path.join(_dirname, "../client/build");
app.use(express.static(buildpath));

// cors is used to accept requests coming from other ports.
// backend is at port 500 but frontend 3000 se requrest bhejra,
// uske lie we need cors
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(express.json());

connectDB();

app.post("/login", loginValidation, login);
app.post("/signup", signupValidation, signup);

app.post("/createtest", (req, res) => {
  TestModel.create(req.body)
    .then((test) => {
      res.json(test);
      console.log(test);
      alert("Test created successfully!!");
    })
    .catch((err) => console.log(err));
});

app.get("/taketest", async (req, res) => {
  const code = req.query.code;

  try {
    const test = await TestModel.findOne({ testID: code });
    if (test) {
      console.log("Test found.");
      res.json(test);
    } else {
      console.log("Test not found.");
      res.status(404).json({ message: "Test not found" });
    }
  } catch (error) {
    console.error("Error fetching test:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/findcreatedtests", async (req, res) => {
  const user = req.query.user;

  try {
    const test = await TestModel.find({ createdBy: user });
    if (test) {
      console.log("Created tests found.");
      res.json(test);
    } else {
      console.log("No tests created by user.");
      res.status(404).json({ message: "No tests created by user." });
    }
  } catch (error) {
    console.error("Error fetching test:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/findtakentests", async (req, res) => {
  const user = req.query.user;

  try {
    const takenTests = await TestModel.find({
      tookBy: { $elemMatch: { $regex: new RegExp(`^${user}/`) } },
    });

    if (!takenTests.length) {
      return res.json({ message: "No tests taken by this user." });
    }

    console.log("Taken tests found.");
    res.json(takenTests);
  } catch (error) {
    console.error("Error fetching test:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/submittest", async (req, res) => {
  const code = req.query.code;

  try {
    const test = await TestModel.findOne({ testID: code });
    res.json(test.anskey);
  } catch (error) {
    console.error("Error fetching test:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Function to send email
async function sendTestResultEmail(userEmail, testDetails, result) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'testify.proctor@gmail.com',
      pass: 'cuxr iapb abey ioqo'
    }
  });

  const mailOptions = {
    from: 'testify.proctor@gmail.com',
    to: userEmail,
    subject: 'Test Result',
    text: `Hello, here are your results for the test ${testDetails.testName}:\nScore: ${result}/${testDetails.questions.length}`
  };

  console.log(`Attempting to send email to ${userEmail}`);

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully to:', userEmail);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

app.post("/submittest", async (req, res) => {
  try {
    const { testid, val } = req.body;
    const [username, score, total] = val.split("/");

    console.log(`Received submission for test ID: ${testid} from user: ${username}`);

    const testEntry = await TestModel.findOne({ testID: testid });
    testEntry.tookBy.push(val);
    await testEntry.save();

    console.log(`Test results saved for user: ${username}`);

    // Fetch user email
    const user = await UserModel.findOne({ name: username });
    if (user) {
      console.log(`Found user email: ${user.email}, sending results...`);
      await sendTestResultEmail(user.email, testEntry, score);
    } else {
      console.log(`User not found for username: ${username}`);
    }

    res.json("Taken user inserted and email sent.");
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Connected to backend on port ${PORT}.`);
});