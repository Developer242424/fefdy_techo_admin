// =======================================================
// GLOBAL VARIABLES
// =======================================================

let publicURL = "http://localhost:5001/";
let identify_questions = [];
let questionsLoaded = false;
let questionIds = "";
let timerInterval;
let elapsedTime = 0;
let totalCorrectAnswers = 0;
let clickedCorrectAnswers = 0;
let currentQuestionIndex = 0;
let cumulativeScore = 0;
let wrongAnswersCount = 0;
let totalOptions = 0;
let isGameActive = false;
let isTimerRunning = false;
const BG_VOLUME_NORMAL = 0.2;
const BG_VOLUME_LOW = 0.02;


const correctSound = new Audio("/choose/Correct.wav");
const wrongSound = new Audio("/choose/Wrong.wav");
const bgMusic = new Audio("/identify/bg.wav");
const timerbgMusic = new Audio("/identify/tick-sound.wav");
const successSound = new Audio("/choose/Success.wav");

const resultList = [];

// =======================================================
// FETCH QUESTIONS FROM API
// =======================================================
function fetchQuestions(callback) {
  const params = new URLSearchParams(window.location.search);
  const sid = params.get("sid");
  const tid = params.get("tid");
  const lid = params.get("lid");
  const stid = params.get("stid");
  const qid = params.get("qid");
  const ust = params.get("ust");

  const data = { sid, tid, lid, stid, qid, ust };

  $.ajax({
    url: "/admin/activity/questions/identify/get",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify(data),
    success: function (res) {
      if (Array.isArray(res)) {
        identify_questions = res;
        questionsLoaded = true;
        questionIds = identify_questions.map((q) => q.questionid);
        if (typeof callback === "function") callback();
      }
    },
  });
}

window.onload = () => {
  fetchQuestions();
};

// =======================================================
// LOAD QUESTION INTO IFRAME
// =======================================================
function loadQuestion() {
  if (currentQuestionIndex >= identify_questions.length) {
    notifySuccess();
    return;
  }

  pauseTimer();

  createLoader();

  const currentQuestion = identify_questions[currentQuestionIndex];
  const html = currentQuestion.html;
  const frame = document.getElementById("question-frame");

  frame.style.display = "none";

  const doc = frame.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    wrapIframeContent();
    scaleIframeContent();
  }, 10);

  document.body.style.background = "none";
  document.body.style.backgroundColor = "transparent";

  frame.onload = () => {
    setTimeout(() => {
      modifyIframeContent(($) => {

        const questionSpace = $.doc.querySelector(".question-space-id");
        // console.log("question-space-id:", questionSpace);

        const input = $.doc.getElementById("editor_questionText-id");
        // console.log("input element:", input);

        if (input) {
          // console.log("input.value:", input.value);
          // console.log("input.getAttribute('value'):", input.getAttribute("value"));
        }

        // Cleanup unwanted spacing
        $.css("body", { margin: "0", padding: "0" });
        $.css(".canvas-wrapper-id", { margin: "0", padding: "0" });
        $.css("#canvas-id", { borderRadius: "0px" });
        $.css(".question-space-id", { bottom: "28pc" });

        const images = $.doc.querySelectorAll(".content img");
        images.forEach(img => {
          img.style.opacity = "0";
        });

        applyBlurredCanvasBackground($);

        if (!$.doc.getElementById("explosion-layer")) {
          const layer = $.doc.createElement("div");
          layer.id = "explosion-layer";
          Object.assign(layer.style, {
            position: "fixed",
            inset: "0",
            pointerEvents: "none",
            zIndex: "999999"
          });
          $.doc.body.appendChild(layer);
        }

        $.override(`
        body {
          position: relative;
          overflow: hidden;
        }

        #blur-bg-layer {
          position: fixed;
          z-index: 1;
        }

        #sparkle-layer {
          position: fixed;
          z-index: 2;
          pointer-events: none;
        }

        #zoom-wrap {
          position: relative;
          z-index: 3;
        }

        .content {
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          position: relative;
        }

        .content.boom {
          transform: scale(1.15);
          box-shadow: 0 0 25px rgba(255,255,255,0.9);
        }

        .boom-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255,255,255,0.9);
          pointer-events: none;
          animation: boom-pop 600ms ease-out forwards;
        }

        @keyframes boom-pop {
          0% {
            transform: translate(0,0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(var(--x), var(--y)) scale(0);
            opacity: 0;
          }
        }
          .shake {
          animation: shake-wrong 0.45s ease;
        }

        @keyframes shake-wrong {
          0% { transform: translateX(0); }
          15% { transform: translateX(-6px); }
          30% { transform: translateX(6px); }
          45% { transform: translateX(-5px); }
          60% { transform: translateX(5px); }
          75% { transform: translateX(-3px); }
          100% { transform: translateX(0); }
        }
        .explode-particle-burst {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          animation: burst-explode 700ms ease-out forwards;
        }

        .explode-particle-burst.secondary {
          animation: burst-explode 900ms ease-out forwards;
        }

        @keyframes burst-explode {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(var(--x), var(--y)) scale(0);
            opacity: 0;
          }
        }

        .shockwave-burst {
          position: absolute;
          width: 40px;
          height: 40px;
          border: 2px solid rgba(255, 255, 255, 0.6);
          border-radius: 50%;
          animation: shockwave-burst-expand 600ms ease-out forwards;
          pointer-events: none;
          transform: translate(-50%, -50%);
        }

        @keyframes shockwave-burst-expand {
          0% {
            width: 40px;
            height: 40px;
            opacity: 1;
          }
          100% {
            width: 400px;
            height: 400px;
            opacity: 0;
          }
        }

        .flash-burst {
          position: absolute;
          width: 100px;
          height: 100px;
          background: radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(255, 200, 0, 0.8) 50%, transparent 100%);
          border-radius: 50%;
          animation: flash-burst-pop 300ms ease-out forwards;
          pointer-events: none;
          transform: translate(-50%, -50%);
        }

        @keyframes flash-burst-pop {
          0% {
            width: 100px;
            height: 100px;
            opacity: 1;
          }
          100% {
            width: 250px;
            height: 250px;
            opacity: 0;
          }
        }

        .image-fragment {
          position: absolute;
          background-repeat: no-repeat;
          will-change: transform, opacity;
          pointer-events: none;
          animation: fragment-fly 700ms cubic-bezier(.2,.8,.2,1) forwards;
          filter: brightness(1.4) saturate(1.3);
        }

        @keyframes fragment-fly {
          0% {
            transform: translate(0,0) rotate(0deg) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(var(--x), var(--y))
            rotate(var(--r))
            scale(0.2);
            opacity: 0;
          }
        }

        /* POP ANIMATION FOR IMAGE */
        @keyframes popIn {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .canvas-wrapper-id.pop-in {
          animation: popIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          visibility: visible;
        }
        .content img {
          opacity: 0 !important;
          transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .content img.pop-in {
          opacity: 1 !important;
          transform: scale(1);
        }

        @keyframes world-particle {
          0% {
            opacity: 1;
            filter: brightness(1.5);
          }
          60% {
            opacity: 0.8;
          }
          100% {
            transform: translate(
              calc(-50% + var(--x)),
              calc(-50% + var(--y))
            ) scale(0);
            opacity: 0;
          }
        }

        @keyframes world-shockwave {
          0% {
            width: 40px;
            height: 40px;
            opacity: 1;
            filter: brightness(1.2);
          }
          100% {
            width: 500px;
            height: 500px;
            opacity: 0;
            filter: brightness(0.8);
          }
        }

        @keyframes world-flash {
          0% {
            opacity: 1;
            filter: brightness(1.8);
          }
          100% {
            opacity: 0;
            filter: brightness(0.5);
          }
        }

        .qm-highlight {
          background: linear-gradient(120deg, #FFD700, #FFA500);
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
          color: #333;
          box-shadow: 0 2px 8px rgba(255, 165, 0, 0.3);
        }

        .question-text-display {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: inherit;
          font-family: inherit;
          pointer-events: none;
          color: #111;
        }
      `
        );

        const sparkleLayer = $.doc.createElement("div");
        sparkleLayer.id = "sparkle-layer";
        sparkleLayer.style.top = 0;
        sparkleLayer.style.left = 0;
        sparkleLayer.style.width = "100%";
        sparkleLayer.style.height = "100%";
        sparkleLayer.style.pointerEvents = "none";
        $.doc.body.appendChild(sparkleLayer);

        $.override(`
        @keyframes sparkle-float {
          0% {
            transform: translateY(0) scale(0.8);
            opacity: 0;
          }
          30% {
            opacity: 0.9;
          }
          100% {
            transform: translateY(-100vh) scale(1.3);
            opacity: 0;
          }
        }

        .sparkle {
          position: absolute;
          border-radius: 50%;
          background: rgba(255,255,255,0.9);
          filter: blur(1px);
          box-shadow: 0 0 8px rgba(255,255,255,0.8);
        }
      `);

        removeLoader();
        const frame = document.getElementById("question-frame");

        frame.style.display = "block";

        setTimeout(() => {
          wrapIframeContent();
          scaleIframeContent();
        }, 0);

        startTimer();

        bgMusic.loop = true;
        bgMusic.volume = 0.3;
        bgMusic.play().catch(() => { });

        setTimeout(() => {
          const images = $.doc.querySelectorAll(".content img");
          images.forEach(img => {
            img.classList.add("pop-in");
          });

          resumeTimer();
          bgMusic.volume = 0.3;
          timerbgMusic.loop = true;
          timerbgMusic.volume = 1;
          timerbgMusic.play().catch((err) => console.log("Tick sound play failed:", err));

          bgMusic.volume = BG_VOLUME_LOW;


          setInterval(() => {
            createSparkle($.doc, 4);
          }, 200);
          enableBoomOnContent($.doc);

          countCorrectAnswers($.doc);
          enableWrongAnswer($.doc);
          enableCorrectAnswerHandler($.doc);
        }, 1000);

      });
    }, 300);
  };
}
function highlightQuotedTextInInput($) {
  const input = $.doc.getElementById("editor_questionText-id");

  if (!input) {
    console.warn("Input element not found");
    return;
  }

  const questionText = input.value;
  // console.log("Original text:", questionText);

  // Extract text within double quotes using regex
  const quotedMatches = questionText.match(/"([^"]+)"/g);
  // console.log("Quoted text found:", quotedMatches);

  if (quotedMatches) {
    quotedMatches.forEach(match => {
      const cleanText = match.replace(/"/g, ''); // Remove quotes
      // console.log("Highlighting:", cleanText);

      // Create a visual highlight for the quoted text
      // Option 1: Change the input styling to show highlights
      if (questionText.includes(match)) {
        // We'll create a display element below the input to show the formatted version
      }
    });
  }

  // Create a formatted display below the input
  const questionSpace = $.doc.querySelector(".question-space-id");

  if (questionSpace && !$.doc.getElementById("highlighted-question-display")) {
    const displayDiv = $.doc.createElement("div");
    displayDiv.id = "highlighted-question-display";

    // Replace quoted text with highlighted spans
    let highlightedHTML = questionText.replace(
      /"([^"]+)"/g,
      '<span class="qm-highlight">$1</span>'
    );

    displayDiv.innerHTML = highlightedHTML;

    Object.assign(displayDiv.style, {
      fontSize: "24px",
      fontWeight: "600",
      color: "#333",
      padding: "12px 16px",
      borderRadius: "8px",
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      marginTop: "8px",
      lineHeight: "1.4",
      fontFamily: "'Fredoka', sans-serif",
      textAlign: "center",
      border: "2px solid #ffd166"
    });

    questionSpace.appendChild(displayDiv);
    // console.log("✅ Highlighted display created");
  }
}
function highlightQuotedText(text) {
  if (!text) return "";
  return text.replace(/"([^"]+)"/g, '<span class="qm-highlight">$1</span>');
}

function showQuestionIntro(callback) {
  const modal = document.getElementById("question-modal");
  const q = identify_questions[currentQuestionIndex];

  pauseTimer();

  bgMusic.volume = BG_VOLUME_LOW;
  playSpeech(q.question);

  document.getElementById("qm-number").textContent =
    `Question ${currentQuestionIndex + 1} of ${identify_questions.length}`;

  document.getElementById("qm-text").innerHTML =
    highlightQuotedText(q.question || "Get Ready!");

  let count = 3;

  modal.classList.add("show");

  const interval = setInterval(() => {
    count--;
    if (count === 0) {
      clearInterval(interval);
      modal.classList.remove("show");

      callback();
    }
  }, 1000);
}

// =======================================================
// START GAME
// =======================================================
function startGame() {
  document.getElementById("start-modal").style.display = "none";
  isGameActive = true;
  currentQuestionIndex = 0;
  resultList.length = 0;

  showJarContainer();

  const elem = document.documentElement;
  if (window.self === window.top) {
    if (elem.requestFullscreen) {
      elem
        .requestFullscreen()
        .catch((err) => console.log("Fullscreen request failed:", err));
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
  }

  showQuestionIntro(() => {
    loadQuestion();
  });

  bgMusic.loop = true;
  bgMusic.volume = 0.3;
  bgMusic.play().catch((err) => console.log("Audio play failed:", err));
}

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement) {
    // console.log("Fullscreen exited");
  }
});

document.addEventListener("webkitfullscreenchange", () => {
  if (!document.webkitFullscreenElement) {
    // console.log("Fullscreen exited");
  }
});

document.addEventListener("mozfullscreenchange", () => {
  if (!document.mozFullScreenElement) {
    // console.log("Fullscreen exited");
  }
});

function requestFullscreen() {
  const elem = document.documentElement;

  const fullscreenMethods = [
    () => elem.requestFullscreen?.(),
    () => elem.webkitRequestFullscreen?.(),
    () => elem.mozRequestFullScreen?.(),
    () => elem.msRequestFullscreen?.(),
  ];

  let lastError = null;

  for (const method of fullscreenMethods) {
    try {
      const promise = method();
      if (promise && typeof promise.catch === "function") {
        promise
          .then(() => { })
          .catch((err) => {
            lastError = err;
            console.warn("Fullscreen request failed:", err.message);
          });
        return;
      }
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  if (lastError) {
    console.error("All fullscreen methods failed:", lastError);
  }
}

// =======================================================
// TIMER FUNCTIONS
// =======================================================
function startTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  isTimerRunning = true;
  timerInterval = setInterval(() => {
    if (isTimerRunning) {
      elapsedTime++;
      const m = String(Math.floor(elapsedTime / 60)).padStart(2, "0");
      const s = String(elapsedTime % 60).padStart(2, "0");
      document.getElementById("timer").textContent = `${m}:${s}`;
    }
  }, 1000);
}

function pauseTimer() {
  isTimerRunning = false;
  timerbgMusic.pause();
  timerbgMusic.currentTime = 0;
  bgMusic.volume = BG_VOLUME_NORMAL;
  // console.log("Timer paused");
}

function resumeTimer() {
  isTimerRunning = true;
  // console.log("Timer resumed");
}

function stopTimer() {
  clearInterval(timerInterval);
  isTimerRunning = false;
  timerbgMusic.pause();
  timerbgMusic.currentTime = 0;
  // console.log("Timer stopped at:", formatTime(elapsedTime));
  bgMusic.volume = BG_VOLUME_NORMAL;
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

// =======================================================
// WRAP IFRAME CONTENT (ZOOM SAFE)
// =======================================================
function wrapIframeContent() {
  const frame = document.getElementById("question-frame");
  const doc = frame.contentDocument;
  doc.body.innerHTML = `
    <div id="zoom-wrap" style="width:100%;height:100%;overflow:hidden;">
      ${doc.body.innerHTML}
    </div>
  `;
}

// =======================================================
// SCALE CONTENT USING CSS ZOOM
// =======================================================
function scaleIframeContent() {
  const frame = document.getElementById("question-frame");
  const doc = frame.contentDocument;
  const canvas = doc.getElementById("canvas-id");
  if (!canvas) return;

  const scale = Math.min(
    window.innerWidth / canvas.offsetWidth,
    window.innerHeight / canvas.offsetHeight
  );

  const wrap = doc.getElementById("zoom-wrap");
  wrap.style.zoom = scale;
  wrap.style.display = "flex";
  wrap.style.alignItems = "center";
  wrap.style.justifyContent = "center";
}

// =======================================================
// UNIVERSAL IFRAME MODIFIER
// =======================================================
function modifyIframeContent(callback) {
  const frame = document.getElementById("question-frame");
  const doc = frame.contentDocument;
  if (!doc) return;

  callback({
    doc,
    css: (sel, styles) => {
      const el = doc.querySelector(sel);
      if (el) Object.assign(el.style, styles);
    },
    override: (css) => {
      const style = doc.createElement("style");
      style.innerHTML = css;
      doc.head.appendChild(style);
    },
  });
}

// =======================================================
// BLURRED BACKGROUND FROM CANVAS IMAGE
// =======================================================
function applyBlurredCanvasBackground($) {
  const doc = $.doc;
  const canvas = doc.getElementById("canvas-id");
  if (!canvas) return;

  const bg = getComputedStyle(canvas).backgroundImage;
  const url = bg.replace(/url\(|\)|"|'/g, "");

  if (doc.getElementById("blur-bg-layer")) return;

  const blur = doc.createElement("div");
  blur.id = "blur-bg-layer";

  Object.assign(blur.style, {
    top: "-15%",
    left: "-15%",
    width: "130%",
    height: "130%",
    backgroundImage: `url(${url})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    transform: "scale(1.1)",
    opacity: "1",
  });

  doc.body.prepend(blur);
}

// =======================================================
// SPARKLE CREATOR
// =======================================================
function createSparkle(doc, count = 3) {
  const layer = doc.getElementById("sparkle-layer");
  if (!layer) return;

  for (let i = 0; i < count; i++) {
    const sparkle = doc.createElement("div");

    const size = Math.random() * 6 + 6;
    const duration = Math.random() * 4 + 8;
    const delay = Math.random() * 1;

    sparkle.className = "sparkle";
    sparkle.style.left = Math.random() * 100 + "%";
    sparkle.style.bottom = "-20px";
    sparkle.style.width = size + "px";
    sparkle.style.height = size + "px";
    sparkle.style.opacity = Math.random() * 0.6 + 0.4;
    sparkle.style.filter = `blur(${Math.random() * 2}px)`;
    sparkle.style.animation = `sparkle-float ${duration}s linear ${delay}s`;

    layer.appendChild(sparkle);

    setTimeout(() => sparkle.remove(), (duration + delay) * 1000);
  }
}

// =======================================================
// BOOM PARTICLE EFFECT
// =======================================================
function enableBoomOnContent(doc) {
  const items = doc.querySelectorAll(".content");

  items.forEach((item) => {
    if (item.dataset.boomAttached) return;
    item.dataset.boomAttached = "true";

    item.addEventListener("mouseenter", () => {
      item.classList.add("boom");
    });

    item.addEventListener("mouseleave", () => {
      item.classList.remove("boom");
    });
  });
}

function enableWrongAnswer(doc) {
  const items = doc.querySelectorAll(".content");

  items.forEach((item) => {
    if (item.dataset.wrongHandlerAttached) return;
    item.dataset.wrongHandlerAttached = "true";

    item.addEventListener("click", (e) => {
      const parent = item.closest(".canvas-item");
      if (!parent) return;

      const isCorrect = parent.dataset.answer === "true";
      const isClicked = parent.dataset.wrongClicked === "true";

      const ques_obj = identify_questions[currentQuestionIndex];
      if (!isCorrect && !isClicked) {
        storeSeparateEntries(
          ques_obj.question,
          elapsedTime,
          isCorrect ? 0 : 1,
          ques_obj.questionid
        );
      } else if (isCorrect && !isClicked) {
        storeSeparateEntries(
          ques_obj.question,
          elapsedTime,
          isCorrect ? 0 : 1,
          ques_obj.questionid
        );
      } else if (!isCorrect && isClicked) {
        // console.log("not first click, not correct");
      }
      if (!isCorrect) {
        if (parent.dataset.wrongClicked === "true") return;
        parent.dataset.wrongClicked = "true";

        e.stopPropagation();

        item.classList.remove("shake");
        void item.offsetWidth;
        item.classList.add("shake");

        wrongSound.currentTime = 0;
        wrongSound.play().catch(() => { });

        wrongAnswersCount++;
      }
    });
  });
}
function explodeImage(target, doc) {
  const img = target.querySelector("img");
  if (!img) return;

  const rect = img.getBoundingClientRect();
  const rows = 6;
  const cols = 6;

  const pieceW = rect.width / cols;
  const pieceH = rect.height / rows;

  const container = doc.getElementById("zoom-wrap") || doc.body;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const fragment = doc.createElement("div");
      fragment.className = "image-fragment";

      fragment.style.width = pieceW + "px";
      fragment.style.height = pieceH + "px";
      fragment.style.left = rect.left + x * pieceW + "px";
      fragment.style.top = rect.top + y * pieceH + "px";

      fragment.style.backgroundImage = `url(${img.src})`;
      fragment.style.backgroundSize = `${rect.width}px ${rect.height}px`;
      fragment.style.backgroundPosition = `-${x * pieceW}px -${y * pieceH}px`;
      fragment.style.animation = `fragment-fly ${duration}ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards`;

      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 220 + 80;

      fragment.style.setProperty("--x", `${Math.cos(angle) * distance}px`);
      fragment.style.setProperty("--y", `${Math.sin(angle) * distance}px`);
      fragment.style.setProperty("--r", `${Math.random() * 720 - 360}deg`);

      fragment.style.zIndex = 9999;

      container.appendChild(fragment);
      setTimeout(() => fragment.remove(), 800);
    }
  }

  // Hide original image instantly
  img.style.visibility = "hidden";
}

function countCorrectAnswers(doc) {
  const wait = setInterval(() => {
    const correctItems = doc.querySelectorAll(
      '.canvas-item[data-answer="true"]'
    );
    const allItems = doc.querySelectorAll(".content");

    if (correctItems.length > 0) {
      clearInterval(wait);

      totalCorrectAnswers = correctItems.length;
      totalOptions = allItems.length;
      clickedCorrectAnswers = 0;
      wrongAnswersCount = 0;
    }
  }, 50);
}

function enableCorrectAnswerHandler(doc) {
  const items = doc.querySelectorAll(".content");

  items.forEach((item) => {
    if (item.dataset.correctAttached) return;
    item.dataset.correctAttached = "true";

    item.addEventListener("click", (e) => {
      const parent = item.closest(".canvas-item");
      if (!parent) return;

      const isCorrect = parent.dataset.answer === "true";
      if (!isCorrect) return;

      if (parent.dataset.answered === "true") return;
      parent.dataset.answered = "true";

      e.stopPropagation();

      correctSound.currentTime = 0;
      correctSound.play().catch(() => { });

      item.classList.add("explode");

      spawnWorldExplosion(item, doc);

      const rect = item.getBoundingClientRect();
      const clickX = rect.left + rect.width / 2;
      const clickY = rect.top + rect.height / 2;
      addStarToJar(clickX, clickY);

      clickedCorrectAnswers++;

      if (clickedCorrectAnswers === totalCorrectAnswers) {
        setTimeout(() => {
          moveToNextQuestion();
        }, 2500);
      }
    });
  });
}

function moveToNextQuestion() {
  const currentQuestion = identify_questions[currentQuestionIndex];

  const questionScore = clickedCorrectAnswers === totalCorrectAnswers ? 1 : 0;

  const questionResult = {
    questionId: currentQuestion.questionid,
    question:
      currentQuestion.question || "Question " + (currentQuestionIndex + 1),
    totalClickable: totalOptions,
    correctCount: clickedCorrectAnswers,
    wrongCount: wrongAnswersCount,
    score: questionScore,
  };

  resultList.push(questionResult);
  cumulativeScore += questionScore;

  currentQuestionIndex++;

  if (currentQuestionIndex >= identify_questions.length) {
    notifySuccess();
  } else {
    totalCorrectAnswers = 0;
    clickedCorrectAnswers = 0;
    wrongAnswersCount = 0;
    totalOptions = 0;

    showQuestionIntro(() => {
      loadQuestion();
    });
  }
}

function spawnWorldExplosion(target, doc) {
  const rect = target.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const layer = doc.getElementById("explosion-layer");
  if (!layer) return;

  layer.innerHTML = "";

  /* ======================
     BRIGHT CENTER PULSE
  ====================== */
  const pulse = doc.createElement("div");
  Object.assign(pulse.style, {
    position: "fixed",
    left: cx + "px",
    top: cy + "px",
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    transform: "translate(-50%, -50%)",
    background: "radial-gradient(circle, #fff, #ffff99)",
    pointerEvents: "none",
    zIndex: "999999"
  });

  layer.appendChild(pulse);

  const pulseAnim = pulse.animate(
    [
      { width: "20px", height: "20px", opacity: 1, filter: "blur(0px)" },
      { width: "200px", height: "200px", opacity: 0, filter: "blur(10px)" }
    ],
    { duration: 400, easing: "ease-out", fill: "forwards" }
  );

  pulseAnim.onfinish = () => pulse.remove();

  /* ======================
     CONFETTI CIRCLES
  ====================== */
  const confettiColors = [
    "#FF1493",
    "#00CED1",
    "#FFD700",
    "#00FF00",
    "#FF6347",
    "#9370DB"
  ];

  for (let i = 0; i < 40; i++) {
    const conf = doc.createElement("div");
    const angle = (Math.PI * 2 * i) / 40;
    const distance = Math.random() * 280 + 100;
    const size = Math.random() * 25 + 15;
    const duration = Math.random() * 600 + 700;
    const delay = Math.random() * 50;
    const color =
      confettiColors[Math.floor(Math.random() * confettiColors.length)];

    Object.assign(conf.style, {
      position: "fixed",
      left: cx + "px",
      top: cy + "px",
      width: size + "px",
      height: size + "px",
      borderRadius: "50%",
      background: color,
      transform: "translate(-50%, -50%)",
      pointerEvents: "none",
      zIndex: "999998"
    });

    layer.appendChild(conf);

    const anim = conf.animate(
      [
        {
          transform: "translate(-50%, -50%) scale(1) rotate(0deg)",
          opacity: 1
        },
        {
          transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px),
                                calc(-50% + ${Math.sin(angle) * distance}px))
                      scale(0) rotate(360deg)`,
          opacity: 0
        }
      ],
      {
        duration,
        delay,
        easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        fill: "forwards"
      }
    );

    anim.onfinish = () => conf.remove();
  }

  /* ======================
     GLOW STARS
  ====================== */
  for (let i = 0; i < 25; i++) {
    const star = doc.createElement("div");
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 250 + 80;
    const size = Math.random() * 16 + 10;
    const duration = Math.random() * 500 + 600;
    const delay = Math.random() * 100;

    Object.assign(star.style, {
      position: "fixed",
      left: cx + "px",
      top: cy + "px",
      width: size + "px",
      height: size + "px",
      background: "#FFFF99",
      borderRadius: "50%",
      boxShadow: "0 0 8px rgba(255, 255, 153, 0.8)",
      transform: "translate(-50%, -50%)",
      pointerEvents: "none",
      zIndex: "999997"
    });

    layer.appendChild(star);

    const anim = star.animate(
      [
        {
          transform: "translate(-50%, -50%) scale(1)",
          opacity: 1,
          filter: "blur(0px)"
        },
        {
          transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px),
                                calc(-50% + ${Math.sin(angle) * distance}px))
                      scale(0)`,
          opacity: 0,
          filter: "blur(5px)"
        }
      ],
      {
        duration,
        delay,
        easing: "ease-out",
        fill: "forwards"
      }
    );

    anim.onfinish = () => star.remove();
  }

  /* ======================
     RIBBONS
  ====================== */
  for (let i = 0; i < 15; i++) {
    const ribbon = doc.createElement("div");
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 300 + 120;
    const duration = Math.random() * 700 + 800;
    const delay = Math.random() * 80;
    const color =
      confettiColors[Math.floor(Math.random() * confettiColors.length)];

    Object.assign(ribbon.style, {
      position: "fixed",
      left: cx + "px",
      top: cy + "px",
      width: "10px",
      height: "50px",
      background: color,
      transform: "translate(-50%, -50%) rotate(0deg)",
      opacity: "0.9",
      pointerEvents: "none",
      zIndex: "999997"
    });

    layer.appendChild(ribbon);

    const anim = ribbon.animate(
      [
        {
          transform: "translate(-50%, -50%) rotate(0deg) scaleY(1)",
          opacity: 0.9
        },
        {
          transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px),
                                calc(-50% + ${Math.sin(angle) * distance}px))
                      rotate(720deg) scaleY(0.3)`,
          opacity: 0
        }
      ],
      {
        duration,
        delay,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        fill: "forwards"
      }
    );

    anim.onfinish = () => ribbon.remove();
  }

  /* ======================
     HIDE TARGET
  ====================== */
  target.style.opacity = "0";
  target.style.pointerEvents = "none";
}


function showRetryModal(correctCount, totalQuestions) {
  const modal = document.createElement("div");
  modal.id = "retry-modal";
  modal.classList.add("retry-modal");

  const box = document.createElement("div");
  box.classList.add("retry-modal-box");

  if (correctCount === 0) {
    box.innerHTML = `
        <div class="bg-particles">
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
  </div>

  <div class="modal-overlay">
    <div class="modal-box">
      <div class="game-icon">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="45" fill="#ff6b6b" opacity="0.2"/>
          <circle cx="50" cy="50" r="40" fill="#ff5757"/>
          <path d="M 30 40 L 40 30 M 40 40 L 30 30" stroke="white" stroke-width="6" stroke-linecap="round"/>
          <path d="M 60 40 L 70 30 M 70 40 L 60 30" stroke="white" stroke-width="6" stroke-linecap="round"/>
          <path d="M 30 65 Q 50 55 70 65" stroke="white" stroke-width="6" stroke-linecap="round" fill="none"/>
        </svg>
      </div>
      
      <h2 class="retry-title">${modalTitle}</h2>
      
      <p class="retry-text">
        ${modalText}
      </p>
      
      <div class="retry-buttons">
        <button id="retry-zero-btn" class="retry-btn retry-yes">
          Try Again
        </button>
      </div>
    </div>
  </div>
    `;
    // console.log(correctCount)
    modal.appendChild(box);
    document.body.appendChild(modal);

    document.getElementById("retry-zero-btn").onclick = () => {
      stopSpeech();
      modal.remove();
      resetGame();
    };
  } else if (correctCount < totalQuestions) {
    box.innerHTML = `
        <h2 class="retry-title">
            You scored ${String(correctCount).padStart(2, "0")}/${String(
      totalQuestions
    ).padStart(2, "0")}
        </h2>

        <p class="retry-text">Do you want to try again?</p>

        <div class="retry-buttons">
            <button id="retry-no-btn" class="retry-btn retry-no">No</button>
            <button id="retry-yes-btn" class="retry-btn retry-yes">Yes</button>
        </div>
    `;

    modal.appendChild(box);
    document.body.appendChild(modal);

    document.getElementById("retry-no-btn").onclick = () => {
      modal.remove();
      showSuccessModal();
    };

    document.getElementById("retry-yes-btn").onclick = () => {
      modal.remove();
      resetGame();
    };
  } else {
    setTimeout(() => {
      showSuccessModal();
    }, 1000);

  }
}

function resetGame() {
  elapsedTime = 0;
  totalCorrectAnswers = 0;
  clickedCorrectAnswers = 0;
  currentQuestionIndex = 0;
  cumulativeScore = 0;
  wrongAnswersCount = 0;
  totalOptions = 0;
  identify_questions = [];
  questionsLoaded = false;
  resultList.length = 0;
  isTimerRunning = false;
  collectedStars = 0;

  const collectedStarsContainer = document.getElementById('collectedStars');
  if (collectedStarsContainer) {
    collectedStarsContainer.innerHTML = '';
  }

  document.body.style.background = "none";
  document.body.style.backgroundColor = "transparent";

  stopTimer();
  startTimer();

  showJarContainer();

  fetchQuestions(() => {
    showQuestionIntro(() => {
      loadQuestion();
    });
    bgMusic.currentTime = 0;
    bgMusic.play().catch((err) => console.log("Audio play failed:", err));
  });
}

window.hideJarContainer = function () {
  document.getElementById('starCollection').classList.remove('active');
};

window.showJarContainer = function () {
  document.getElementById('starCollection').classList.add('active');
};

function notifySuccess() {
  isGameActive = false;

  hideJarContainer();

  stopTimer();
  bgMusic.pause();
  bgMusic.currentTime = 0;

  successSound.currentTime = 0;
  successSound.play().catch((err) => console.log("Success sound failed:", err));

  if (cumulativeScore === 0) {
    showRetryModal(cumulativeScore, identify_questions.length);
    return;
  }

  const timeTaken = formatTime(elapsedTime);
  document.getElementById("time-display").textContent = timeTaken;
  document.getElementById("score-display").textContent = cumulativeScore;

  document.getElementById("question-frame").style.display = "none";
  document.getElementById("success-modal").classList.add("show");

  document.body.style.background =
    "url('/choose/game-bg.png') no-repeat center center";
  document.body.style.backgroundColor = "transparent";
  document.body.style.backgroundSize = "cover";

  document.getElementById("replay-btn").onclick = () => {
    const modal = document.getElementById("success-modal");
    modal.classList.remove("show");
    resetGame();
  };

  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) {
    // nextBtn.onclick = () => {
    //   const modal = document.getElementById("success-modal");
    //   modal.classList.remove("show");
    // };
  }
  console.log("Result List:", resultList);
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

    if (width < 400) scaleValue = 1;
    else if (width < 600) scaleValue = 1;
    else if (width < 900) scaleValue = 1;
    else if (width < 1200) scaleValue = 1;
    else scaleValue = 1;

    wrapper.style.transform = `scale(${scaleValue})`;
    wrapper.style.transformOrigin = "top center";

    // console.log(" Inside iframe detected");
    // console.log("Viewport width:", width);
    // console.log("Applied scale value:", scaleValue);
  } else {
    document.body.classList.remove("inside-iframe");
    wrapper.style.transform = "scale(1)";
    console.log("Not in iframe — full scale (1x).");
  }
}

window.addEventListener("load", adjustScaleForIframe);
window.addEventListener("resize", adjustScaleForIframe);

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && isGameActive) {
    setTimeout(() => {
      recalculateZoom();
    }, 100);
  }
});

document.addEventListener("webkitfullscreenchange", () => {
  if (!document.webkitFullscreenElement && isGameActive) {
    setTimeout(() => {
      recalculateZoom();
    }, 100);
  }
});

document.addEventListener("mozfullscreenchange", () => {
  if (!document.mozFullScreenElement && isGameActive) {
    setTimeout(() => {
      recalculateZoom();
    }, 100);
  }
});

function recalculateZoom() {
  const frame = document.getElementById("question-frame");
  if (!frame || !frame.contentDocument) {
    console.warn("⚠️ Frame not found or not ready");
    return;
  }

  const doc = frame.contentDocument;
  const canvas = doc.getElementById("canvas-id");

  if (!canvas) {
    console.warn("⚠️ Canvas not found in iframe");
    return;
  }

  const canvasWidth = canvas.offsetWidth;
  const canvasHeight = canvas.offsetHeight;

  const availableWidth = window.innerWidth;
  const availableHeight = window.innerHeight;

  const scaleX = availableWidth / canvasWidth;
  const scaleY = availableHeight / canvasHeight;
  const newScale = Math.min(scaleX, scaleY, 2);

  const wrap = doc.getElementById("zoom-wrap");
  console.log("Recalculated zoom scale:", newScale);  
  if (wrap) {
    wrap.style.zoom = newScale;
    wrap.style.display = "flex";
    wrap.style.alignItems = "center";
    wrap.style.justifyContent = "center";
  }
}

function manualZoomRecalculate() {
  recalculateZoom();
}

window.addEventListener("resize", () => {
  if (isGameActive) {
    recalculateZoom();
  }
});

function completeTest() {
  const params = new URLSearchParams(window.location.search);
  const sid = params.get("sid");
  const tid = params.get("tid");
  const lid = params.get("lid");
  const stid = params.get("stid");
  const qid = params.get("qid");
  const ust = params.get("ust");

  console.log("resultList from complete test", resultList);
  const wrong_answer = identify_questions.length - cumulativeScore;
  console.log("cumulativeScore", cumulativeScore);
  console.log("wrong_answer", wrong_answer);
  console.log("questionIds", questionIds);

  const data = {
    sid,
    tid,
    lid,
    stid,
    qid,
    ust,
    correctAnswers: cumulativeScore,
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
        window.parent.postMessage({ action: "GAME_SUBMITTED" }, "*");
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

// let correct_previous_second = 0;
let previous_second = 0;
function storeSeparateEntries(question, comp_time, is_correct, ques_id) {
  let diff = 0;
  // if (is_correct === 0) {
  //   diff = parseInt(comp_time) - correct_previous_second;
  //   correct_previous_second = parseInt(comp_time);
  // } else {
  diff = parseInt(comp_time) - previous_second;
  previous_second = parseInt(comp_time);
  // }

  const params = new URLSearchParams(window.location.search);
  const ust = params.get("ust");

  const data = {
    question,
    comp_time: diff,
    is_correct,
    ques_id,
    ust,
  };

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

function createLoader() {
  const loaderHTML = `
    <div id="question-loader" class="loader-container">
      <div class="loader-box">
        <div class="spinner"></div>
<div class="loader-gif"><img src="/identify/loader.gif"></div>

       <div class="loader-dots">
 <div class="loader-dot"></div>
  <div class="loader-dot"></div>
 <div class="loader-dot"></div>
</div>

      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('afterbegin', loaderHTML);
}

function removeLoader() {
  const loader = document.getElementById('question-loader');
  if (loader) {
    loader.style.animation = 'fadeOut 0.5s ease-out forwards';
    setTimeout(() => loader.remove(), 500);
  }
}


// STAR COLLECTION SYSTEM
let collectedStars = 0;

function addStarToJar(clickX, clickY) {
  return addStarToCollection(clickX, clickY);
}

function addStarToCollection(clickX, clickY) {
  const starCollection = document.getElementById('starCollection');
  const collectedStarsContainer = document.getElementById('collectedStars');

  // Create a temporary invisible star to measure where it will be placed
  const tempStar = document.createElement('div');
  tempStar.className = 'collected-star';
  tempStar.style.visibility = 'hidden';
  const tempImg = document.createElement('img');
  tempImg.src = '/identify/star.png';
  tempStar.appendChild(tempImg);
  collectedStarsContainer.appendChild(tempStar);

  // Get the position where the star will land
  const starRect = tempStar.getBoundingClientRect();
  const targetX = starRect.left + starRect.width / 2;
  const targetY = starRect.top + starRect.height / 2;

  // Remove the temporary star (we'll add the real one after animation)
  tempStar.remove();

  // Create flying star at click position
  const flyingStar = document.createElement('div');
  flyingStar.className = 'flying-star';
  flyingStar.style.left = (clickX - 30) + 'px';
  flyingStar.style.top = (clickY - 30) + 'px';
  flyingStar.style.zIndex = '9999';

  const flyingStarImg = document.createElement('img');
  flyingStarImg.src = '/identify/star.png';
  flyingStar.appendChild(flyingStarImg);

  document.body.appendChild(flyingStar);

  flyingStar.classList.add('grow');

  setTimeout(() => {
    const deltaX = targetX - clickX;
    const deltaY = targetY - clickY;

    flyingStar.classList.remove('grow');
    flyingStar.classList.add('fly');
    flyingStar.style.setProperty('--tx', deltaX + 'px');
    flyingStar.style.setProperty('--ty', deltaY + 'px');

    setTimeout(() => {
      flyingStar.remove();

      const collectedStar = document.createElement('div');
      collectedStar.className = 'collected-star';
      const starImg = document.createElement('img');
      starImg.src = '/identify/star.png';
      collectedStar.appendChild(starImg);
      collectedStarsContainer.appendChild(collectedStar);
    }, 1200);
  }, 600);
}

window.showJarContainer = function () {
  document.getElementById('starCollection').classList.add('active');
};

// Hide collection when game ends
window.hideJarContainer = function () {
  document.getElementById('starCollection').classList.remove('active');
};



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