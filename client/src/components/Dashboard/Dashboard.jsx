import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { handleError, handleSuccess } from "../../utils";
import { ToastContainer } from "react-toastify";
import { FaChalkboardTeacher, FaReact, FaJava, FaJs } from "react-icons/fa";
import "./Dashboard.css";

const Dashboard = () => {
  const [testCode, setTestCode] = useState("");
  const [loggedInUser, setLoggedInUser] = useState("");
  const [createdTests, setCreatedTests] = useState([]);
  const [foundCreatedTests, setFoundCreatedTests] = useState(false);
  const [takenTests, setTakenTests] = useState([]);
  const [foundTakenTests, setFoundTakenTests] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setLoggedInUser(localStorage.getItem("loggedInUser"));
  }, []);

  useEffect(() => {
    const fetchCreatedTests = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/findcreatedtests?user=${loggedInUser}`
        );
        if (!response.data.message) setCreatedTests(response.data);
        setFoundCreatedTests(true);
      } catch (error) {
        console.error("Error fetching created tests:", error);
      }
    };

    const fetchTakenTests = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/findtakentests?user=${loggedInUser}`
        );
        if (!response.data.message) setTakenTests(response.data);
        setFoundTakenTests(true);
      } catch (error) {
        console.error("Error fetching taken tests:", error);
      }
    };

    if (loggedInUser) {
      fetchCreatedTests();
      fetchTakenTests();
    }
  }, [loggedInUser]);

  const getTest = async (code) => {
    try {
      const response = await axios.get(
        `http://localhost:5000/taketest?code=${code}`
      );
      const testData = response.data;
      navigate(`/taketest/${code}`, {
        state: [testData, loggedInUser],
      });
    } catch (error) {
      handleError("Invalid Test Code.");
      console.error("Error fetching test:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("loggedInUser");
    handleSuccess("User Logged Out.");
    setTimeout(() => {
      navigate("/login");
    }, 1000);
  };

  const handleTestClick = (code) => {
    getTest(code);
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="logo">
          <FaChalkboardTeacher className="logo-icon" />
          <h1 className="platform-name">Testify</h1>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <div className="action-buttons">
        <button className="create-test-btn" onClick={() => navigate("/createtest")}>
          Create Test
        </button>

        <div className="take-test">
          <input
            className="test-code-input"
            type="text"
            placeholder="Enter valid test code"
            value={testCode}
            onChange={(e) => setTestCode(e.target.value)}
          />
          <button className="get-test-btn" onClick={() => getTest(testCode)}>
            Get Test
          </button>
        </div>
      </div>

      {/* Sample Tests Section */}
      <div className="sample-tests-section">
        <h2>Sample Tests</h2>
        <div className="sample-tests-grid">
          <div
            className="sample-test-card"
            onClick={() => handleTestClick("FRptTijP")}
          >
            <FaReact size={40} color="#61DBFB" />
            <h3>Basic Reacts</h3>
          </div>
          <div
            className="sample-test-card"
            onClick={() => handleTestClick("XJByX07P")}
          >
            <FaJava size={40} color="#007396" />
            <h3>Advanced Java</h3>
          </div>
          <div
            className="sample-test-card"
            onClick={() => handleTestClick("F8Q8pnYL")}
          >
            <FaJs size={40} color="#F7DF1E" />
            <h3>Know Javascript</h3>
          </div>
        </div>
      </div>

      <div className="tests-container">
        <div className="tests-section">
          <h2>Created Tests</h2>
          {foundCreatedTests ? (
            createdTests.length > 0 ? (
              <div className="tests-grid">
                {createdTests.map((test, index) => (
                  <div key={index} className="test-card">
                    <h3>{test.testName}</h3>
                    <p>Duration: {test.testDuration}</p>
                    <p>ID: {test.testID}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p>No tests created yet.</p>
            )
          ) : (
            <p>Loading...</p>
          )}
        </div>

        <div className="tests-section">
          <h2>Taken Tests</h2>
          {foundTakenTests ? (
            takenTests.length > 0 ? (
              <div className="tests-grid">
                {takenTests.map((test, index) => (
                  <div key={index} className="test-card">
                    <h3>{test.testName}</h3>
                    <p>Duration: {test.testDuration}</p>
                    <p>ID: {test.testID}</p>
                    <p>Attempted by: {test.tookBy}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p>No tests taken yet.</p>
            )
          ) : (
            <p>Loading...</p>
          )}
        </div>
      </div>

      <ToastContainer />
    </div>
  );
};

export default Dashboard;
