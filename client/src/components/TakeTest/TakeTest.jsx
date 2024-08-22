import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./TakeTest.css";
import { ToastContainer } from "react-toastify";
import { handleError, handleSuccess } from "../../utils";
import axios from "axios";
import Webcam from 'react-webcam';

const TakeTest = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [loggedInUser, setLoggedInUser] = useState(""); // Add this line

  useEffect(() => {
    // Fetch the logged-in user from local storage
    const user = localStorage.getItem("loggedInUser");
    if (user) {
      setLoggedInUser(user);
    } else {
      // Redirect or handle the case where no user is logged in
      handleError("You must be logged in to take the test.");
      navigate("/login");
    }
  }, [navigate]);

  const timeParts = state[0].testDuration.split(":");
  const totalTime =
    parseInt(timeParts[0], 10) * 3600 +
    parseInt(timeParts[1], 10) * 60 +
    parseInt(timeParts[2], 10);

  const totalQuestions = state[0].questions.length;
  let tempKey = Array(totalQuestions).fill("?").join("");

  const [time, setTime] = useState(totalTime * 1000);
  const [startTest, setStartTest] = useState(0);
  const [finishTest, setFinishTest] = useState(false);
  const [answers, setAnswers] = useState(tempKey);
  const [result, setResult] = useState(0);
  const [resok, setResOk] = useState(false);
  const [permissions, setPermissions] = useState([false, false, false]);
  const [fullscreen, setFullscreen] = useState(false);
  const [showCamera, setShowCamera] = useState(true); // Set to true to show the webcam by default
  const webcamRef = useRef(null);

  // State to track the current question index
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const toggleCamera = () => {
    setShowCamera(!showCamera);
  };

  const handleStartTest = () => {
    handleSuccess("Test Started.");
    setTimeout(() => {
      setStartTest(1);
    }, 500);
  };

  useEffect(() => {
    if (startTest === 0) {
      const secop = state[0].security;

      if (secop[0] === true) {
        const cameraPerm = async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true,
            });

            setPermissions((prevperm) => {
              const newperm = [...prevperm];
              newperm[0] = true;
              return newperm;
            });
          } catch (error) {
            console.error("Error accessing media devices:", error);
            setPermissions((prevperm) => {
              const newperm = [...prevperm];
              newperm[0] = false;
              return newperm;
            });
          }
        };

        cameraPerm();
      }

      if (secop[1] === true) {
        setPermissions((prevperm) => {
          const newperm = [...prevperm];
          newperm[1] = true;
          return newperm;
        });
      }

      if (secop[2] === true) {
        setPermissions((prevperm) => {
          const newperm = [...prevperm];
          newperm[2] = true;
          return newperm;
        });
      }
    }
  }, [startTest]);

  const handleFullScreen = () => {
    const element = document.getElementById("containerr");
    const isFullScreen = document.fullscreenElement;

    if (isFullScreen) {
      document.exitFullscreen();
      setFullscreen(false);
    } else {
      element.requestFullscreen();
      setFullscreen(true);
    }
  };

  useEffect(() => {
    window
      .matchMedia("(display-mode: fullscreen)")
      .addListener(({ matches }) => {
        if (!matches) setFullscreen(false);
        else setFullscreen(true);
      });
  }, []);

  useEffect(() => {
    const handleBlur = () => {
      if (startTest === 1 && permissions[2] === true) {
        handleError(
          `Tab switching detected!
          Refrain from it else test will be terminated!`
        );
      }
    };

    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("blur", handleBlur);
    };
  }, [permissions, startTest]);

  // useEffect(() => {
  //   if (startTest === 1 && permissions[1] === true) {
  //     window
  //       .matchMedia("(display-mode: fullscreen)")
  //       .addListener(({ matches }) => {
  //         if (!matches) {
  //           if (
  //             window.confirm(
  //               "Enable full screen mode else test will be terminated."
  //             )
  //           ) {
  //             const element = document.getElementById("containerr");
  //             element.requestFullscreen();
  //             setFullscreen(true);
  //           }
  //         } else setFullscreen(true);
  //       });
  //   }
  // }, [startTest, permissions]);

  useEffect(() => {
    if (startTest === 1 && time > 0) {
      const timer = setInterval(() => {
        setTime(time - 1000);
      }, 1000);

      return () => clearInterval(timer);
    } else if (time === 0) {
      handleFinishTest();
    }
  }, [startTest, time]);

  const getFormattedTime = (milliseconds) => {
    let total_seconds = parseInt(Math.floor(milliseconds / 1000));
    let total_minutes = parseInt(Math.floor(total_seconds / 60));
    let total_hours = parseInt(Math.floor(total_minutes / 60));

    let seconds = parseInt(total_seconds % 60);
    let minutes = parseInt(total_minutes % 60);
    let hours = parseInt(total_hours % 24);

    return `${hours} : ${minutes} : ${seconds}`;
  };

  const handleOptionChange = (e, quesIndex, optionIndex) => {
    let updatedAnswers = answers.split("");

    if (e.target.checked === false) updatedAnswers[quesIndex] = "?";
    else updatedAnswers[quesIndex] = String.fromCharCode(optionIndex + 1 + 48);

    updatedAnswers = updatedAnswers.join("");
    setAnswers(updatedAnswers);
  };

  const handleFinishTest = () => {
    // Check if all questions have been answered
    const allAnswered = !answers.includes("?");

    if (!allAnswered) {
      if (window.confirm("Not all questions have been answered. Are you sure you want to finish the test?")) {
        finishTestProcedure();
      }
    } else {
      if (window.confirm("Are you sure you want to submit the test?")) {
        finishTestProcedure();
      }
    }
  };

  const finishTestProcedure = () => {
    console.log(answers);
    setFinishTest(true);
    setStartTest(2);
    handleSuccess("Test Submitted.");
  };

  useEffect(() => {
    const postSubmit = async () => {
      try {
        await axios
          .get(`${process.env.REACT_APP_API_URL}/submittest?code=${state[0].testID}`)
          .then((response) => {
            const origanswers = response.data;

            let count = 0;
            for (let i = 0; i < answers.length; i++) {
              if (origanswers[i] === answers[i]) count++;
            }
            setResult(count);
            setResOk(true);
          })
          .catch((err) => console.log(err));
      } catch (error) {
        console.log(error);
      }
    };

    if (finishTest === true && startTest === 2) postSubmit();
  }, [finishTest, startTest]);

  useEffect(() => {
    const sendData = () => {
      const str = state[1] + "/" + result + "/" + answers.length;
      const data = { testid: state[0].testID, val: str };

      console.log(data);

      axios
        .post(`${process.env.REACT_APP_API_URL}/submittest`, data)
        .then((result) => {
          console.log(result.data);
        })
        .catch((err) => console.log(err));
    };

    if (resok === true) sendData();
  }, [resok]);

  const handleSubmitTest = async () => {
    const testResults = {
      testid: state[0].testID, // Assuming state[0] contains test details
      val: `${loggedInUser}/${result}/${totalQuestions}` // Format: username/score/total
    };

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/submittest`, testResults);
      console.log(response.data);
      handleSuccess("Test submitted successfully!");
    } catch (error) {
      handleError("Failed to submit test.");
    }
  };

  // Function to jump to a specific question
  const handleJumpToQuestion = (index) => {
    setCurrentQuestionIndex(index);
  };

  return (
    <div className="containerr" id="containerr">
      <div className="opening">
        <h1>Test Name: {state[0].testName}</h1>
        <button
          className="backbtn"
          onClick={() => {
            navigate("/dashboard");
          }}
        >
          Go to Dashboard
        </button>
      </div>

      <div className="test-body">
        <div className="intro">
          <div className="intro1">
            <p>Created by: {state[0].createdBy}</p>
            <p>Test Code: {state[0].testID}</p>
            <p>Time Remaining: {getFormattedTime(time)}</p>

            <button
              className="startbtn"
              onClick={() => handleStartTest()}
              disabled={!(startTest === 0)}
            >
              Start Test
            </button>

            <button
              className="finishbtn"
              onClick={() => handleFinishTest()}
              disabled={!(startTest === 1)}
            >
              Finish Test
            </button>
          </div>

          <div className="intro2">
            <h2 className="instructions-heading">Instructions:</h2>
            {permissions[0] === true && (
              <div>
                <ul>
                  <li>
                    <p>
                      This test has camera and audio proctoring. Kindly refrain
                      from cheating or making any unnecessary movements else test
                      will be terminated.
                    </p>
                  </li>
                </ul>
                <button className="camera-toggle" onClick={toggleCamera}>
                  {showCamera ? 'Hide Camera' : 'Show Camera'}
                </button>
                {showCamera && <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="webcam-view" />}
              </div>
            )}

            {permissions[1] === true && (
              <div>
                <ul>
                  <li>
                    <p>
                      Kindly keep full screen mode else test will be terminated.
                    </p>
                    <button className="fullscreenbtn" onClick={handleFullScreen}>
                      {fullscreen === false
                        ? "Enable Full Screen"
                        : "Disable Full Screen"}
                    </button>
                  </li>
                </ul>
              </div>
            )}

            {permissions[2] === true && (
              <div>
                <ul>
                  <li>
                    <p>
                      Kindly refrain from switching tabs or using other
                      applications while taking the test. If any such activity is
                      detected, your test will be terminated.
                    </p>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {startTest === 1 && (
          <div className="sidebar">
            {state[0].questions.map((_, index) => (
              <button key={index} onClick={() => handleJumpToQuestion(index)} className={`nav-button ${index === currentQuestionIndex ? "active" : ""}`}>
                {index + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      <br />

      {startTest === 2 && resok === true && (
        <div className="result">
          <img src="https://res.cloudinary.com/dxecoctrm/image/upload/v1724122178/qptqp5nltosmuhrylcp3.png" alt="Success Icon" className="result-icon" />
          <div className="result-text">
            Your score is: {result}/{answers.length}
          </div>
          <div className="result-bar">
            <div
              className="result-progress"
              style={{ width: `${(result / answers.length) * 100}%` }}
            >
              {Math.round((result / answers.length) * 100)}%
            </div>
          </div>
        </div>
      )}

      <br />
      <br />

      {startTest === 1 && finishTest === false && (
        <div className="question-display">
          <div className="question-container">
            <div className="question-text">
              Question {currentQuestionIndex + 1}: {state[0].questions[currentQuestionIndex].quesText}
            </div>
            <div>
              Options:
              {state[0].questions[currentQuestionIndex].options.map((option, optionIndex) => {
                return (
                  <div className="option-text">
                    <input
                      type="checkbox"
                      checked={answers[currentQuestionIndex] === "?" || answers[currentQuestionIndex].charCodeAt(0) - 48 - 1 !== optionIndex ? false : true}
                      id={`option-${currentQuestionIndex}-${optionIndex}`}
                      onChange={(e) => handleOptionChange(e, currentQuestionIndex, optionIndex)}
                    />
                    <label htmlFor={`option-${currentQuestionIndex}-${optionIndex}`}>
                      {typeof option === "string" ? option : (
                        <img src={option.file} alt="" width="100px" height="100px" />
                      )}
                    </label>
                  </div>
                );
              })}
            </div>
            <br />
          </div>
          <button onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)} disabled={currentQuestionIndex === 0}>Previous</button>
          <button onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)} disabled={currentQuestionIndex === state[0].questions.length - 1}>Next</button>
        </div>
      )}

      <ToastContainer />
    </div>
  );
};

export default TakeTest;