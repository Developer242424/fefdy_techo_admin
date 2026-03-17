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

const correctSound = new Audio("/choose/Correct.wav");
const wrongSound = new Audio("/choose/Wrong.wav");
const bgMusic = new Audio("/identify/bg.wav");
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
        console.log("✅ Identify questions loaded", identify_questions);
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

  const currentQuestion = identify_questions[currentQuestionIndex];
  const html = currentQuestion.html;
  const frame = document.getElementById("question-frame");

  frame.style.display = "block";

  const doc = frame.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  // Clear zoom from previous question
  setTimeout(() => {
    wrapIframeContent();
    scaleIframeContent();
  }, 10);

  // Remove main page background
  document.body.style.background = "none";
  document.body.style.backgroundColor = "transparent";

  frame.onload = () => {
    setTimeout(() => {
      modifyIframeContent(($) => {
        // Cleanup unwanted spacing
        $.css("body", { margin: "0", padding: "0" });
        $.css(".canvas-wrapper-id", { margin: "0", padding: "0" });
        $.css("#canvas-id", { borderRadius: "0px" });
        $.css(".question-space-id", { bottom: "28pc" });

        // Apply blurred background
        applyBlurredCanvasBackground($);

        // Layer ordering
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
            .content.explode {
            animation: explode-out 0.55s ease-out forwards;
            pointer-events: none;
          }

          @keyframes explode-out {
            0% {
              transform: scale(1);
              opacity: 1;
            }
            30% {
              transform: scale(1.4);
              opacity: 1;
            }
            100% {
              transform: scale(2.2);
              opacity: 0;
            }
          }

          .explode-particle {
            position: absolute;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: rgba(255,255,255,0.9);
            pointer-events: none;
            animation: explode-particle 700ms ease-out forwards;
          }

          @keyframes explode-particle {
            0% {
              transform: translate(0,0) scale(1);
              opacity: 1;
            }
            100% {
              transform: translate(var(--x), var(--y)) scale(0);
              opacity: 0;
            }
          }
        `);

        // Sparkle container
        const sparkleLayer = $.doc.createElement("div");
        sparkleLayer.id = "sparkle-layer";
        sparkleLayer.style.top = 0;
        sparkleLayer.style.left = 0;
        sparkleLayer.style.width = "100%";
        sparkleLayer.style.height = "100%";
        sparkleLayer.style.pointerEvents = "none";
        $.doc.body.appendChild(sparkleLayer);

        // Sparkle animation
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

        // Start sparkles
        setInterval(() => {
          createSparkle($.doc, 4);
        }, 200);
        enableBoomOnContent($.doc);

        countCorrectAnswers($.doc);
        enableWrongAnswer($.doc);
        enableCorrectAnswerHandler($.doc);
      });
    }, 60);
  };
}

// =======================================================
// START GAME
// =======================================================
function startGame() {
  document.getElementById("start-modal").style.display = "none";
  currentQuestionIndex = 0;
  resultList.length = 0;

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

  startTimer();
  loadQuestion();
  bgMusic.loop = true;
  bgMusic.volume = 0.3;
  bgMusic.play().catch((err) => console.log("Audio play failed:", err));
}

// =======================================================
// TIMER
// =======================================================
function startTimer() {
  timerInterval = setInterval(() => {
    elapsedTime++;
    const m = String(Math.floor(elapsedTime / 60)).padStart(2, "0");
    const s = String(elapsedTime % 60).padStart(2, "0");
    document.getElementById("timer").textContent = `${m}:${s}`;
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
      spawnBoomParticles(item, doc);
    });

    item.addEventListener("mouseleave", () => {
      item.classList.remove("boom");
    });
  });
}

function spawnBoomParticles(target, doc) {
  const rect = target.getBoundingClientRect();

  for (let i = 0; i < 6; i++) {
    const p = doc.createElement("div");
    p.className = "boom-particle";

    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 30 + 20;

    p.style.left = rect.width / 2 + "px";
    p.style.top = rect.height / 2 + "px";
    p.style.setProperty("--x", `${Math.cos(angle) * distance}px`);
    p.style.setProperty("--y", `${Math.sin(angle) * distance}px`);

    target.appendChild(p);

    setTimeout(() => p.remove(), 600);
  }
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

      if (!isCorrect) {
        e.stopPropagation();

        item.classList.remove("shake");
        void item.offsetWidth;
        item.classList.add("shake");

        wrongSound.currentTime = 0;
        wrongSound.play().catch(() => {});

        wrongAnswersCount++;
      }
    });
  });
}

function countCorrectAnswers(doc) {
  const wait = setInterval(() => {
    const correctItems = doc.querySelectorAll(
      '.canvas-item[data-answer="true"]'
    );

    if (correctItems.length > 0) {
      clearInterval(wait);

      totalCorrectAnswers = correctItems.length;
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
      correctSound.play().catch(() => {});

      item.classList.add("explode");

      spawnExplosionAround(item, doc);

      clickedCorrectAnswers++;

      if (clickedCorrectAnswers === totalCorrectAnswers) {
        setTimeout(() => {
          moveToNextQuestion();
        }, 600);
      }
    });
  });
}

function moveToNextQuestion() {
  const currentQuestion = identify_questions[currentQuestionIndex];

  const questionResult = {
    questionId: currentQuestion.questionid,
    questionText:
      currentQuestion.questiontext || "Question " + (currentQuestionIndex + 1),
    totalCount: totalCorrectAnswers,
    correctCount: clickedCorrectAnswers,
    wrongCount: wrongAnswersCount,
  };

  resultList.push(questionResult);

  const pointsPerAnswer = 1;
  const questionScore = clickedCorrectAnswers * pointsPerAnswer;
  cumulativeScore += questionScore;

  currentQuestionIndex++;

  if (currentQuestionIndex >= identify_questions.length) {
    notifySuccess();
  } else {
    // Reset for next question
    totalCorrectAnswers = 0;
    clickedCorrectAnswers = 0;
    wrongAnswersCount = 0;

    // Load next question
    loadQuestion();
  }
}

function spawnExplosionAround(target, doc) {
  const rect = target.getBoundingClientRect();

  for (let i = 0; i < 14; i++) {
    const p = doc.createElement("div");
    p.className = "explode-particle";

    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 80 + 40;

    p.style.left = rect.width / 2 + "px";
    p.style.top = rect.height / 2 + "px";
    p.style.setProperty("--x", `${Math.cos(angle) * distance}px`);
    p.style.setProperty("--y", `${Math.sin(angle) * distance}px`);

    target.appendChild(p);
    setTimeout(() => p.remove(), 700);
  }
}

function notifySuccess() {
  stopTimer();

  bgMusic.pause();
  bgMusic.currentTime = 0;

  successSound.currentTime = 0;
  successSound.play().catch((err) => console.log("Success sound failed:", err));

  const timeTaken = formatTime(elapsedTime);
  document.getElementById("time-display").textContent =
    "Time taken : " + timeTaken;
  document.getElementById("score-display").textContent =
    cumulativeScore + " points";

  document.getElementById("question-frame").style.display = "none";
  document.getElementById("success-modal").classList.add("show");

  document.body.style.background =
    "url('/choose/game-bg.png') no-repeat center center";
  document.body.style.backgroundColor = "transparent";
  document.body.style.backgroundSize = "cover";

  document.getElementById("replay-btn").onclick = () => {
    const modal = document.getElementById("success-modal");
    modal.classList.remove("show");

    elapsedTime = 0;
    totalCorrectAnswers = 0;
    clickedCorrectAnswers = 0;
    currentQuestionIndex = 0;
    cumulativeScore = 0;
    wrongAnswersCount = 0; // NEW: Reset wrong count
    identify_questions = [];
    questionsLoaded = false;
    resultList.length = 0; // NEW: Clear results for replay

    document.body.style.background = "none";
    document.body.style.backgroundColor = "transparent";

    stopTimer();
    startTimer();
    fetchQuestions(() => {
      loadQuestion();
      bgMusic.currentTime = 0;
      bgMusic.play().catch((err) => console.log("Audio play failed:", err));
    });
  };

  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) {
    nextBtn.onclick = () => {
      const modal = document.getElementById("success-modal");
      modal.classList.remove("show");
    };
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

function completeTest() {
  const params = new URLSearchParams(window.location.search);
  const sid = params.get("sid");
  const tid = params.get("tid");
  const lid = params.get("lid");
  const stid = params.get("stid");
  const qid = params.get("qid");
  const ust = params.get("ust");

  console.log("cumulativeScore:", cumulativeScore);
  console.log("wrongAnswersCount:", wrongAnswersCount);

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
