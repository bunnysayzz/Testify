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
      user: process.env.EMAIL_USER, // Use environment variable for email user
      pass: process.env.EMAIL_PASS  // Use environment variable for email password
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER, // Use environment variable for email user
    to: userEmail,
    subject: 'Test Result',
    html: `
      <div style="font-family: 'Arial', sans-serif; color: #333; background-color: #f4f4f4; padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
        <h1 style="color: #4A90E2; text-align: center;">Test Result</h1>
        <p style="font-size: 16px;">Hello,</p>
        <p style="font-size: 16px;">Here are your results for the test <strong>${testDetails.testName}</strong>:</p>
        <div style="margin: 20px 0; padding: 15px; background-color: #fff; border-left: 5px solid #4A90E2; border-radius: 5px;">
          <h2 style="font-size: 22px; color: #333;">Score: <span style="font-weight: bold; color: #e74c3c; font-size: 28px;">${result}</span> out of <span style="font-weight: bold; color: #2ecc71; font-size: 28px;">${testDetails.questions.length}</span></h2>
        </div>
        <p style="font-size: 16px;">Thank you for using our testing service. We hope to see you again soon!</p>
        <p style="font-size: 16px;">Best Regards,<br/>The Testify Team</p>
        <hr style="border-top: 1px solid #ccc;"/>
        <footer style="font-size: 12px; text-align: center;">
          <p>Created by <a href="https://imazhar.vercel.app" style="color: #4A90E2; text-decoration: none;">imazhar</a> | Follow us on 
          <a href="https://www.twitter.com/apt_azhar" style="color: #4A90E2; text-decoration: none;">Twitter</a></p>
        </footer>
      </div>
    `
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