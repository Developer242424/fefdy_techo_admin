let publicURL = "http://localhost:5001/";
// const choose_questions = [
//     {
//         "questionid": 1,
//         "question": "Which of these is a wild animal?",
//         "options": [
//             { "primary_text": "Lion", "secondary_text": "It lives in the forest and roars loudly.", "image": "/choose/lion.jpg" },
//             { "primary_text": "Cow", "secondary_text": "It lives on the farm and gives us milk.", "image": "/choose/cow.jpg" },
//             { "primary_text": "Dog", "secondary_text": "It stays with us at home as a pet.", "image": "/choose/dog.jpg" },
//             { "primary_text": "Rabbit", "secondary_text": "It is a small pet animal that loves to eat carrots.", "image": "/choose/rabbit.jpg" }
//         ],
//         "correct": [0]
//     },
//     {
//         "questionid": 2,
//         "question": "Which of these animals gives us eggs?",
//         "options": [
//             { "primary_text": "Cat", "secondary_text": "It likes to drink milk.", "image": "/choose/cat.jpg" },
//             { "primary_text": "Hen", "secondary_text": "It lays eggs on the farm.", "image": "/choose/hen.jpg" },
//             { "primary_text": "Cow", "secondary_text": "It gives us milk to drink.", "image": "/choose/cow.jpg" },
//             { "primary_text": "Elephant", "secondary_text": "It lives in the forest and has a long trunk.", "image": "/choose/elephant.jpg" }
//         ],
//         "correct": [1]
//     },
//     {
//         "questionid": 3,
//         "question": "Which animal lives in water?",
//         "options": [
//             { "primary_text": "Lion", "secondary_text": "Lives in the forest.", "image": "/choose/lion.jpg" },
//             { "primary_text": "Dog", "secondary_text": "Lives in a kennel.", "image": "/choose/dog.jpg" },
//             { "primary_text": "Cow", "secondary_text": "It gives us milk to drink.", "image": "/choose/cow.jpg" },
//             { "primary_text": "Fish", "secondary_text": "Swims in water.", "image": "/choose/fish.jpg" }
//         ],
//         "correct": [3]
//     },
//     // {
//     //     "questionid": 4,
//     //     "question": "Which animal helps people to carry loads?",
//     //     "options": [
//     //         { "primary_text": "Cat", "secondary_text": "Plays at home.", "image": "/choose/cat.jpg" },
//     //         { "primary_text": "Hen", "secondary_text": "It lays eggs on the farm.", "image": "/choose/hen.jpg" },
//     //         { "primary_text": "Cow", "secondary_text": "It gives us milk to drink.", "image": "/choose/cow.jpg" },
//     //         { "primary_text": "Elephant", "secondary_text": "Carries heavy loads.", "image": "/choose/elephant.jpg" }
//     //     ],
//     //     "correct": [3]
//     // },
//     // {
//     //     "questionid": 5,
//     //     "question": "Which animal gives us wool?",
//     //     "options": [
//     //         { "primary_text": "Cat", "secondary_text": "It likes to drink milk.", "image": "/choose/cat.jpg" },
//     //         { "primary_text": "Hen", "secondary_text": "It lays eggs on the farm.", "image": "/choose/hen.jpg" },
//     //         { "primary_text": "Sheep", "secondary_text": "Its wool keeps us warm.", "image": "/choose/sheep.jpg" },
//     //         { "primary_text": "Elephant", "secondary_text": "Lives in the jungle.", "image": "/choose/elephant.jpg" }
//     //     ],
//     //     "correct": [2]
//     // },

// ];

let choose_questions = [];
let questionsLoaded = false;
let questionIds = "";

function fetchQuestions(callback) {
  const params = new URLSearchParams(window.location.search);
  const sid = params.get("sid");
  const tid = params.get("tid");
  const lid = params.get("lid");
  const stid = params.get("stid");
  const qid = params.get("qid");
  const ust = params.get("ust");

  const data = {
    sid,
    tid,
    lid,
    stid,
    qid,
    ust,
  };
  $.ajax({
    url: "/admin/activity/questions/get",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify(data),
    success: function (res) {
      if (Array.isArray(res)) {
        choose_questions = res;
        questionsLoaded = true;
        // console.log("✅ Questions loaded:", questions);

        userAnswers = new Array(questions.length).fill(null);
        userAnswers[0] = [];

        if (typeof callback === "function") {
          callback();
        }
        questionIds = questions.map((q) => q.questionid);
      } else {
        console.warn("⚠️ Invalid question data received.");
      }
    },
    error: function (xhr) {
      let errorMessage = "An error occurred.";
      if (xhr.responseJSON && xhr.responseJSON.message) {
        errorMessage = xhr.responseJSON.message;
      }
      console.warn("⚠️", errorMessage);
    },
  });
}

window.onload = function () {
  fetchQuestions(() => {
    loadQuestion();
  });
};

let currentQuestion = 0;
let timerInterval;
let elapsedTime = 0;
let score = 0;
let final_score = 0;

// ===================== TIMER =====================
function startTimer() {
  clearInterval(timerInterval);
  const timerDisplay = document.getElementById("timer");
  elapsedTime = 0;
  timerDisplay.textContent = "00:00";

  timerInterval = setInterval(() => {
    elapsedTime++;
    timerDisplay.textContent = formatTime(elapsedTime);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  console.log("Timer stopped at:", formatTime(elapsedTime));
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

// ===================== QUIZ =====================
function loadQuestion() {
  const questionContainer = document.querySelector(".question-choose");
  const optionsContainer = document.querySelector(".choose-options");
  const questionData = choose_questions[currentQuestion];

  questionContainer.textContent = questionData.question;
  optionsContainer.innerHTML = "";

  questionData.options.forEach((opt, index) => {
    const card = document.createElement("div");
    card.classList.add("option-card");

    card.innerHTML = `
      <div class="choose-number">${String(index + 1).padStart(2, "0")}</div>
      <img src="${publicURL}${opt.image}" alt="${opt.primary_text}">
      <hr class="divider">
      <div class="primary-text">${opt.primary_text}</div>
      <div class="secondary-text">${opt.secondary_text}</div>
    `;

    card.addEventListener("click", () => checkAnswer(index, card));
    optionsContainer.appendChild(card);
  });

  updateProgressBar();
}

function checkAnswer(selectedIndex, cardElement) {
  const correctIndexes = choose_questions[currentQuestion].correct;

  if (correctIndexes.includes(selectedIndex)) {
    showCorrectCard(cardElement);
    score++;
    final_score = score;
    setTimeout(() => {
      currentQuestion++;

      if (currentQuestion < choose_questions.length) {
        loadQuestion();
      } else {
        stopTimer();
        updateProgressBar();
        showSuccessModal();
        currentQuestion = 0;
        loadQuestion();
      }
    }, 2000);
  } else {
    showShakeAndRetry(cardElement);
    score--;
  }
}

function showSuccessModal() {
  const modal = document.getElementById("success-modal");
  const scoreDisplay = document.getElementById("score-display");
  const timeDisplay = document.getElementById("time-display");

  scoreDisplay.textContent = `${final_score}/${currentQuestion} points`;
  timeDisplay.textContent = `Time taken: ${formatTime(elapsedTime)}`;

  modal.classList.add("show");

  document.getElementById("replay-btn").onclick = () => {
    modal.classList.remove("show");
    score = 0;
    final_score = 0;
    currentQuestion = 0;
    loadQuestion();
  };

  document.getElementById("next-btn").onclick = () => {
    alert("Yet to add");
  };
}

function showShakeAndRetry(cardElement) {
  cardElement.classList.add("shake");
  const originalContent = cardElement.innerHTML;
  cardElement.innerHTML = '<div class="try-again-message">Try Again!</div>';
  setTimeout(() => {
    cardElement.classList.remove("shake");
    cardElement.innerHTML = originalContent;
  }, 700);
}

function showCorrectCard(cardElement) {
  const optionsContainer = document.querySelector(".choose-options");

  optionsContainer.querySelectorAll(".option-card").forEach((card) => {
    if (card !== cardElement) {
      card.style.display = "none";
      card.style.pointerEvents = "none";
    } else {
      card.classList.add("correct-answer");
    }
  });
}

// ===================== IFRAME SCALING =====================
function adjustScaleForIframe() {
  const wrapper = document.querySelector(".iframe-scale-wrapper");
  if (!wrapper) {
    console.warn(".iframe-scale-wrapper not found!");
    return;
  }

  const insideIframe = window.self !== window.top;

  if (insideIframe) {
    const width = window.innerWidth;
    let scaleValue = 1;

    if (width < 400) scaleValue = 0.5;
    else if (width < 600) scaleValue = 0.65;
    else if (width < 900) scaleValue = 0.8;
    else if (width < 1200) scaleValue = 0.85;
    else scaleValue = 1;

    wrapper.style.transform = `scale(${scaleValue})`;
    wrapper.style.transformOrigin = "top center";

    console.log(" Inside iframe detected");
    console.log("Viewport width:", width);
    console.log("Applied scale value:", scaleValue);
  } else {
    wrapper.style.transform = "scale(1)";
    console.log("Not in iframe — full scale (1x).");
  }
}

window.addEventListener("load", adjustScaleForIframe);
window.addEventListener("resize", adjustScaleForIframe);

// progress bar

function updateProgressBar() {
  const progressBar = document.getElementById("progress-bar");
  const totalQuestions = choose_questions.length;
  const progressPercent = (currentQuestion / totalQuestions) * 100;
  progressBar.style.width = `${progressPercent}%`;
}

// clock

// const secondHand = document.querySelector('.second-hand');
// const minsHand = document.querySelector('.min-hand');
// const hourHand = document.querySelector('.hour-hand');

// function setDate() {
//     const now = new Date();

//     const seconds = now.getSeconds();
//     const secondsDegrees = ((seconds / 60) * 360) + 90;
//     secondHand.style.transform = `rotate(${secondsDegrees}deg)`;

//     const mins = now.getMinutes();
//     const minsDegrees = ((mins / 60) * 360) + ((seconds / 60) * 6) + 90;
//     minsHand.style.transform = `rotate(${minsDegrees}deg)`;

//     const hour = now.getHours();
//     const hourDegrees = ((hour / 12) * 360) + ((mins / 60) * 30) + 90;
//     hourHand.style.transform = `rotate(${hourDegrees}deg)`;
// }

// setInterval(setDate, 1000);

// setDate();

function startGame() {
  document.getElementById("start-modal").style.display = "none";

  document.getElementById("main-container").style.display = "flex";

  startTimer();
  loadQuestion();
}
