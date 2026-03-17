// const choose_questions = [
//     {
//         "questionid": 1,
//         "question": "Which of these is a wild animal?",
//         "image": "/choose/lion.jpg",
//         "options": [
//             { "primary_text": "Lion", "secondary_text": "It lives in the forest and roars loudly.",  },
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
//         "correct": [3, 0]
//     },
//     // {
//     //     "questionid": 4,
//     //     "question": "Which of these are farm animals?",
//     //     "options": [
//     //         { "primary_text": "Cat", "secondary_text": "Plays at home.", "image": "/choose/cat.jpg" },
//     //         { "primary_text": "Hen", "secondary_text": "It lays eggs on the farm.", "image": "/choose/hen.jpg" },
//     //         { "primary_text": "Cow", "secondary_text": "It gives us milk to drink.", "image": "/choose/cow.jpg" },
//     //         { "primary_text": "Elephant", "secondary_text": "Carries heavy loads.", "image": "/choose/elephant.jpg" }
//     //     ],
//     //     "correct": [1, 2,]
//     // },
// ];

let publicURL = "http://localhost:5001/";

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

        userAnswers = new Array(choose_questions.length).fill(null);
        userAnswers[0] = [];

        if (typeof callback === "function") {
          callback();
        }
        questionIds = choose_questions.map((q) => q.questionid);
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
let wrong_answer = 0;
let selectedCorrectAnswers = new Set();

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
  isEligibleForMark = true;
  const questionContainer = document.querySelector(".question-choose");
  const optionsContainer = document.querySelector(".choose-options");
  const questionData = choose_questions[currentQuestion];

  questionContainer.innerHTML = "";
  optionsContainer.innerHTML = "";
  selectedCorrectAnswers.clear();

  const correctCount = questionData.correct.length;

  if (correctCount > 1) {
    const infoDiv = document.createElement("div");
    infoDiv.classList.add("two-options");
    infoDiv.textContent = `There are ${correctCount} correct answers`;
    questionContainer.appendChild(infoDiv);
  }

  const questionText = document.createElement("div");
  questionText.classList.add("question-text");
  questionText.onmouseover = () => playSpeech(questionData.question);
  questionText.textContent = questionData.question;
  questionContainer.appendChild(questionText);

  if (questionData.image) {
    const questionBanner = document.createElement("img");
    questionBanner.classList.add("question-banner");
    questionBanner.src = publicURL + questionData.image;
    questionBanner.alt = "Question Banner";
    questionContainer.appendChild(questionBanner);
  }

  questionData.options.forEach((opt, index) => {
    const card = document.createElement("div");
    card.classList.add("option-card");

    const hasImage = !!opt.image;

    card.innerHTML = `
        <div class="choose-number">${String(index + 1).padStart(2, "0")}</div>
        <img class="choose-img" src="${publicURL}${opt.image}" alt="${
      opt.primary_text
    }">
        <hr class="divider">
        <div class="primary-text" onmouseover="playSpeech('${opt.primary_text.replace(/'/g, "\\'")}')">${opt.primary_text}</div>
        <div class="secondary-text" onmouseover="playSpeech('${opt.secondary_text.replace(/'/g, "\\'")}')">${opt.secondary_text}</div>
        `;

    if (!hasImage) card.classList.add("no-image");

    card.addEventListener("click", () => checkAnswer(index, card));
    optionsContainer.appendChild(card);
  });

  updateProgressBar();
}

function checkAnswer(selectedIndex, cardElement) {
  const questionData = choose_questions[currentQuestion];
  //   console.log("questionData", questionData);
  const correctIndexes = questionData.correct;
  const correctCount = correctIndexes.length;

  if (correctIndexes.includes(selectedIndex)) {
    selectedCorrectAnswers.add(selectedIndex);
    cardElement.classList.add("selected-correct");

    if (selectedCorrectAnswers.size === correctCount) {
      if (isEligibleForMark) {
        score++;
        final_score = score;
      }
    }

    if (selectedCorrectAnswers.size === correctCount) {
      setTimeout(() => {
        showCorrectCard(selectedIndex);
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
        }, 500);
      }, 500);
    }
    // console.log("questionData.question", questionData.question);
    // console.log("elapsedTime", elapsedTime);
    storeSeparateEntries(questionData.question, elapsedTime, 0);
  } else {
    storeSeparateEntries(questionData.question, elapsedTime, 1);
    showShakeAndRetry(cardElement);
    isEligibleForMark = false;
  }
}

function showSuccessModal() {
  wrong_answer = parseInt(currentQuestion) - parseInt(final_score);
  const modal = document.getElementById("success-modal");
  const scoreDisplay = document.getElementById("score-display");
  const timeDisplay = document.getElementById("time-display");

  scoreDisplay.textContent = `${final_score}/${currentQuestion} points`;
  timeDisplay.textContent = `Time taken: ${formatTime(elapsedTime)}`;

  modal.classList.add("show");

  document.getElementById("replay-btn").onclick = () => {
    // modal.classList.remove("show");
    // score = 0;
    // final_score = 0;
    // currentQuestion = 0;
    // loadQuestion();
    // stopTimer();
    // startTimer();
    location.reload();
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
  const questionData = choose_questions[currentQuestion];
  const correctIndexes = questionData.correct;

  optionsContainer.querySelectorAll(".option-card").forEach((card, index) => {
    if (correctIndexes.includes(index)) {
      card.classList.add("correct-answer");
    } else {
      card.style.display = "none";
      card.style.pointerEvents = "none";
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
    document.body.classList.add("inside-iframe");
    const width = window.innerWidth;
    let scaleValue = 1;

    if (width < 400) scaleValue = 0.5;
    else if (width < 600) scaleValue = 0.65;
    else if (width < 900) scaleValue = 0.8;
    else if (width < 1200) scaleValue = 0.75;
    else scaleValue = 1;

    wrapper.style.transform = `scale(${scaleValue})`;
    wrapper.style.transformOrigin = "top center";

    console.log(" Inside iframe detected");
    console.log("Viewport width:", width);
    console.log("Applied scale value:", scaleValue);
  } else {
    document.body.classList.remove("inside-iframe");
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

function startGame() {
  // playSpeech("welcome to the world of fefdy!");
  document.getElementById("start-modal").style.display = "none";

  document.getElementById("main-container").style.display = "flex";

  startTimer();
  loadQuestion();
}

function completeTest() {
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
    correctAnswers: final_score,
    wrongAnswers: wrong_answer,
    totalTime: elapsedTime,
    questionIds,
  };
  $.ajax({
    url: "/admin/activity/questions/history",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify(data),
    success: function (res) {
      if (res.status === 200) {
        // window.location.href = `/admin/chooseup?sid=${sid}&tid=${tid}&lid=${lid}&stid=${stid}&qid=${qid}&ust=${ust}`;
        location.reload();
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

let previous_second = 0;
function storeSeparateEntries(question, comp_time, is_correct) {
  const diff = parseInt(comp_time) - previous_second;
  previous_second = comp_time;

  // console.log(question, diff, is_correct);
  const params = new URLSearchParams(window.location.search);
  const sid = params.get("sid");
  const tid = params.get("tid");
  const lid = params.get("lid");
  const stid = params.get("stid");
  const qid = params.get("qid");
  const ust = params.get("ust");

  const ref = {
    sid,
    tid,
    lid,
    stid,
    qid,
    ust,
    correctAnswers: final_score,
    wrongAnswers: wrong_answer,
    totalTime: elapsedTime,
    questionIds,
  };
  const data = {
    question,
    comp_time: diff,
    is_correct,
    ust,
  };
  //   console.log(data);
  $.ajax({
    url: "/admin/activity/questions/separate-entries",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify(data),
    success: function (res) {
      if (res.status === 200) {
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

// read aloud

function getFemaleEnglishVoices() {
  return window.speechSynthesis
    .getVoices()
    .filter(
      (voice) =>
        voice.lang.toLowerCase().startsWith("en") &&
        /(female|woman|girl)/i.test(voice.name)
    );
}

// Handle delayed loading of voices
function loadVoices(callback) {
  let voices = window.speechSynthesis.getVoices();
  if (voices.length !== 0) {
    callback(getFemaleEnglishVoices());
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      callback(getFemaleEnglishVoices());
    };
  }
}

function playSpeech(text) {
  if (!window.speechSynthesis) {
    console.warn("Speech synthesis not supported in this browser");
    return;
  }
  loadVoices((femaleVoices) => {
    // console.log("Female English Voices:", femaleVoices);
  });

  // 🧹 Cancel any ongoing speech before starting new
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-IN"; // 🇮🇳 Indian English
  utterance.rate = 0.9; // Slightly slower for clarity
  utterance.pitch = 1.2; // Gentle female tone
  utterance.volume = 1;

  const findVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    // console.log("All Voices:", voices);
    if (!voices || voices.length === 0) {
      // Voices not ready yet, retry
      return setTimeout(findVoice, 100);
    }

    // 🎙️ Find the best match
    const femaleIndianVoice =
      voices.find(
        (v) =>
          v.lang.toLowerCase() === "en-in" && /(female|woman)/i.test(v.name)
      ) ||
      voices.find((v) => v.lang.toLowerCase() === "en-in") ||
      voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith("en-") &&
          /(female|woman)/i.test(v.name)
      ) ||
      voices.find((v) => v.lang.toLowerCase().startsWith("en-"));

    if (femaleIndianVoice) {
      utterance.voice = femaleIndianVoice;
      // console.log("🎤 Using voice:", femaleIndianVoice.name);
    } else {
      console.warn("⚠️ No suitable female en-IN voice found — using default.");
    }

    // ✅ Start speaking once the voice is set
    window.speechSynthesis.speak(utterance);
  };

  // Some browsers require waiting for voices to load
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = findVoice;
  } else {
    findVoice();
  }
}

function stopSpeech() {
  if (window.speechSynthesis && window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    console.log("🛑 Speech stopped");
  }
}
