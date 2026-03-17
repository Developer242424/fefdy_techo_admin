// =======================================================
// GLOBAL VARIABLES
// =======================================================

let publicURL = "http://localhost:5001/";
let dragDropQuestion = [];
let questionsLoaded = false;
let timerInterval;
let elapsedTime = 0;
let isTimerRunning = false;
let currentQuestionIndex = 0;
const BG_VOLUME_NORMAL = 0.2;
const BG_VOLUME_LOW = 0.05;

const correctSound = new Audio("/choose/Correct.wav");
const wrongSound = new Audio("/choose/Wrong.wav");
const bgMusic = new Audio("/identify/bg.wav");
const timerbgMusic = new Audio("/identify/tick-sound.wav");
const successSound = new Audio("/choose/Success.wav");
const putSound = new Audio("/dragdrop/put.wav");
const catchSound = new Audio("/dragdrop/catch.wav");

const resultList = [];

const ZOOM_MULTIPLIER = 1.0;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;

let dropResults = [];
let draggedItem = null;
let totalScore = 0;
let isRetryMode = false;
let wrongItemIds = [];
let initialScore = 0;
let initialTime = 0;

let questionIds = [];
let questionTextData = "";
let totalItems = 0;
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
    url: "/admin/activity/questions/dragndrop/get",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify(data),
    success: function (res) {
      if (Array.isArray(res)) {
        dragDropQuestion = res;
        console.log("✅ Questions loaded:", dragDropQuestion);
        questionsLoaded = true;
        questionIds = dragDropQuestion[0].questionid;
        if (typeof callback === "function") callback();
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

window.onload = () => {
  fetchQuestions();
};

// =======================================================
// MODIFY IFRAME CONTENT
// =======================================================
function modifyIframeContent(callback) {
  const frame = document.getElementById("dd-question-frame");

  if (!frame || !frame.contentDocument) {
    console.warn("Frame not found or not ready");
    return;
  }

  const doc = frame.contentDocument;
  const win = frame.contentWindow;

  const $ = {
    doc: doc,
    css: (selector, styles) => {
      const el = doc.querySelector(selector);
      if (el) Object.assign(el.style, styles);
    },
    override: (cssText) => {
      const style = doc.createElement("style");
      style.textContent = cssText;
      doc.head.appendChild(style);
    }
  };

  if (typeof callback === "function") {
    callback($);
  }
}

// =======================================================
// LOAD QUESTION INTO IFRAME
// =======================================================
function loadQuestion() {
  if (!questionsLoaded || dragDropQuestion.length === 0) {
    console.warn("Questions not loaded yet");
    return;
  }

  if (currentQuestionIndex >= dragDropQuestion.length) {
    console.warn("No more questions");
    return;
  }
  const rawQuestion = dragDropQuestion[0].question;
  if (typeof rawQuestion === 'string') {
    questionTextData = rawQuestion;
  } else if (typeof rawQuestion === 'object' && rawQuestion !== null) {
    questionTextData = rawQuestion.text || rawQuestion.title || rawQuestion.content ||
      rawQuestion.description || "Drag the items to the correct spots!";
  } else {
    questionTextData = rawQuestion ? String(rawQuestion) : "Drag the items to the correct spots!";
  }
  pauseTimer();
  pauseTimer();
  pauseTimer();
  createLoader();

  setTimeout(() => {
    const questionData = dragDropQuestion[0];
    const htmlData = dragDropQuestion[1];

    let htmlContent = htmlData?.html?.data;

    if (!htmlContent) {
      console.warn("No HTML content found for question");
      removeLoader();
      return;
    }

    const iframe = document.getElementById("dd-question-frame");
    if (!iframe) {
      console.error("iframe not found");
      removeLoader();
      return;
    }

    setTimeout(() => {
      wrapIframeContent();
      scaleIframeContent();
      recalculateZoom();
    }, 10);

    iframe.onload = function () {
      modifyIframeContent(($) => {
        $.doc.body.classList.add("game-active");

        applyBlurredCanvasBackground($);

        const sparkleLayer = $.doc.createElement("div");
        sparkleLayer.id = "sparkle-layer";
        Object.assign(sparkleLayer.style, {
          position: "fixed",
          top: "0",
          left: "0",
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: "2"
        });
        $.doc.body.appendChild(sparkleLayer);
        if (isRetryMode && wrongItemIds.length > 0) {
          const allItems = $.doc.querySelectorAll('.item');

          allItems.forEach((item, index) => {
            if (!wrongItemIds.includes(String(index))) {
              // Correct items - make non-draggable and position them
              item.setAttribute('draggable', 'false');
              item.style.cursor = 'default';
              item.style.opacity = '0.7';
              item.style.pointerEvents = 'none'; // Prevent any interaction
              item.classList.add('locked-item'); // Mark as locked

              // Position them at their correct drop location
              const correctResult = dropResults.find(r => r.itemIndex === String(index));
              if (correctResult) {
                item.style.position = 'absolute';
                item.style.left = correctResult.snappedPosition.x + 'px';
                item.style.top = correctResult.snappedPosition.y + 'px';
                item.style.animation = 'none'; // Stop floating animation
              }
            } else {
              // Wrong items - add fly-back animation class
              item.classList.add('fly-back');
            }
          });
        }
        setTimeout(() => {
          initializeDragAndDrop($.doc);
        }, 500);
        $.override(`
      body.game-active {
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: hidden;
        position: relative;
        margin: 0;
        padding: 0;
      }
      .dropzone {
          transition: background-color 0.2s ease;
        }

        .item {
          cursor: grab !important;
          transition: opacity 0.2s ease;
        }

        .item:active {
          cursor: grabbing !important;
        }

      body.game-active * {
        box-sizing: border-box;
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

      /* Remove box-shadow from game-container */
      .game-container,
      #game-container {
        box-shadow: none !important;
        border-radius: 0 !important;
        border: none !important;
        position: relative;
        z-index: 3;
      }

      /* Sparkle animation */
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
        .game-container {
        height:600px !important;
        width:900px !important;
        }
        .item{
        cursor: grab !important;
        }
        .item {
          cursor: grab !important;
          animation: floaty 3s ease-in-out infinite;
          transition: transform 0.2s ease;
        }

        /* Stop floating while dragging */
        .item:active {
          cursor: grabbing !important;
          animation-play-state: paused;
        }

        @keyframes floaty {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
          100% {
            transform: translateY(0px);
          }
        }

        @keyframes fly-back {
  0% {
    transform: scale(1.2) rotate(10deg);
    opacity: 0.5;
  }
  50% {
    transform: scale(0.8) rotate(-5deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

.item.fly-back {
  animation: fly-back 0.6s ease-out;
}

    `);
        removeLoader();

        setTimeout(() => {
          setInterval(() => {
            createSparkle($.doc, 4);
          }, 200);
        }, 500);

        startTimer();
        bgMusic.volume = BG_VOLUME_LOW;
        timerbgMusic.loop = true;
        timerbgMusic.volume = 1;
        timerbgMusic.play().catch((err) => console.log("Tick sound play failed:", err));

        setTimeout(() => {
          recalculateZoom();
        }, 100);
      });
    };

    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();
      iframe.style.display = "block";
    } catch (error) {
      console.error("Error writing to iframe:", error);
      removeLoader();
    }

  }, 500);
}

// =======================================================
// QUESTION INTRO MODAL
// =======================================================
function highlightQuotedText(text) {
  if (!text || typeof text !== 'string') return "";
  return text.replace(/"([^"]+)"/g, '<span class="qm-highlight">$1</span>');
}

function showQuestionIntro(callback) {
  const modal = document.getElementById("question-modal");

  let questionText = "Drag the items to the correct spots!";

  if (dragDropQuestion && dragDropQuestion.length > 0) {
    const questionData = dragDropQuestion[0];

    if (questionData.question && typeof questionData.question === 'string') {
      questionText = questionData.question;
    } else if (questionData.questionText && typeof questionData.questionText === 'string') {
      questionText = questionData.questionText;
    } else if (questionData.title && typeof questionData.title === 'string') {
      questionText = questionData.title;
    }

    questionTextData = questionText;

    if (questionData._id) {
      questionIds = [questionData._id];
    } else if (questionData.id) {
      questionIds = [questionData.id];
    }
  }

  pauseTimer();

  bgMusic.volume = BG_VOLUME_LOW;

  playSpeech(questionText);

  document.getElementById("qm-number").textContent =
    'Let\'s Begin!';

  document.getElementById("qm-text").innerHTML =
    highlightQuotedText(questionText);

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
}

function resumeTimer() {
  isTimerRunning = true;
}

function stopTimer() {
  clearInterval(timerInterval);
  isTimerRunning = false;
  timerbgMusic.pause();
  timerbgMusic.currentTime = 0;
  bgMusic.volume = BG_VOLUME_NORMAL;
}

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}
// =======================================================
// LOADER FUNCTIONS
// =======================================================
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
// =======================================================
// ZOOM RECALCULATION
// ======================================================
function recalculateZoom() {
  const frame = document.getElementById("dd-question-frame");
  if (!frame || !frame.contentDocument) {
    console.warn("⚠️ Frame not found or not ready");
    return;
  }

  const doc = frame.contentDocument;
  const canvas = doc.querySelector(".game-container");

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
  const calculatedScale = Math.min(scaleX, scaleY) * ZOOM_MULTIPLIER;
  const newScale = Math.max(MIN_ZOOM, Math.min(calculatedScale, MAX_ZOOM));

  const wrap = doc.getElementById("zoom-wrap");
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

// =======================================================
// BLURRED CANVAS BACKGROUND
// =======================================================
function applyBlurredCanvasBackground($) {
  const gameContainer = $.doc.querySelector(".game-container");
  if (!gameContainer) return;

  const bgImage = gameContainer.style.backgroundImage;
  if (!bgImage || !bgImage.includes("url")) return;

  const imageUrl = bgImage
    .replace("url(", "")
    .replace(")", "")
    .replace(/['"]/g, "");

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = imageUrl;

  img.onload = () => {
    const colorThief = new ColorThief();

    const palette = colorThief.getPalette(img, 5);
    const [c1, c2, c3, c4, c5] = palette;

    const gradient = `
  linear-gradient(
    to bottom,
    rgb(${c1.join(",")}) 0%,
    rgb(${c2.join(",")}) 25%,
    rgb(${c3.join(",")}) 50%,
    rgb(${c4.join(",")}) 75%,
    rgb(${c5.join(",")}) 100%
  )
`;

    document.body.style.background = gradient;
  };
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
// SPEECH SYNTHESIS FUNCTIONS
// =======================================================
function getFemaleEnglishVoices() {
  return window.speechSynthesis
    .getVoices()
    .filter(
      (voice) =>
        voice.lang.toLowerCase().startsWith("en") &&
        /(female|woman|girl)/i.test(voice.name)
    );
}

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

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-IN";
  utterance.rate = 0.9;
  utterance.pitch = 1.2;
  utterance.volume = 1;

  const findVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) {
      return setTimeout(findVoice, 100);
    }

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
    }

    window.speechSynthesis.speak(utterance);
  };

  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = findVoice;
  } else {
    findVoice();
  }
}

function stopSpeech() {
  if (window.speechSynthesis && window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }
}

// =======================================================
// WRAP IFRAME CONTENT 
// =======================================================
function wrapIframeContent() {
  const frame = document.getElementById("dd-question-frame");
  const doc = frame.contentDocument;
  doc.body.innerHTML = `
    <div id="zoom-wrap" style="width:100%;height:100%;overflow:hidden;">
      ${doc.body.innerHTML}
    </div>
  `;
}

// =======================================================
// SCALE CONTENT USING ZOOM
// =======================================================
function scaleIframeContent() {
  const frame = document.getElementById("dd-question-frame");
  const doc = frame.contentDocument;
  const canvas = doc.getElementById("game-container");
  if (!canvas) return;

  const calculatedScale = Math.min(
    window.innerWidth / canvas.offsetWidth,
    window.innerHeight / canvas.offsetHeight
  ) * ZOOM_MULTIPLIER;
  const scale = Math.max(MIN_ZOOM, Math.min(calculatedScale, MAX_ZOOM));

  const wrap = doc.getElementById("zoom-wrap");
  wrap.style.zoom = scale;
  wrap.style.display = "flex";
  wrap.style.alignItems = "center";
  wrap.style.justifyContent = "center";
}

document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && isGameActive) {
    setTimeout(() => {
      recalculateZoom();
    }, 100);
  } else if (document.fullscreenElement && isGameActive) {
    // FULLSCREEN ENTERED
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
  } else if (document.webkitFullscreenElement && isGameActive) {
    // FULLSCREEN ENTERED
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
  } else if (document.mozFullScreenElement && isGameActive) {
    // FULLSCREEN ENTERED
    setTimeout(() => {
      recalculateZoom();
    }, 100);
  }
});

// =======================================================
// DRAG AND DROP FUNCTIONALITY
// =======================================================

function initializeDragAndDrop(doc) {
  const items = doc.querySelectorAll('.item');
  const dropzones = doc.querySelectorAll('.dropzone');

  if (!items.length) {
    return;
  }

  if (!dropzones.length) {
    return;
  }

  items.forEach((item, index) => {
    if (item.classList.contains('locked-item')) {
      return;
    }
    item.setAttribute('draggable', 'true');
    item.style.cursor = 'grab';
    item.dataset.itemIndex = index;
    item.dataset.originalLeft = item.style.left;
    item.dataset.originalTop = item.style.top;
    item.dataset.originalWidth = item.style.width;
    item.dataset.originalHeight = item.style.height;
    item.addEventListener('mouseenter', (e) => {
      const itemName = item.getAttribute('data-name');
      if (itemName) {
        playSpeech(itemName);
      }
    });

    item.addEventListener('mouseleave', (e) => {
      stopSpeech();
    });

    item.addEventListener('dragstart', (e) => {
      stopSpeech();
      draggedItem = item;
      item.style.opacity = '0.5';
      item.style.cursor = 'grabbing';
      e.dataTransfer.effectAllowed = 'move';
      catchSound.currentTime = 0;
      catchSound.play()
        .then(() => console.log("catchSound played"))
        .catch(err => console.error("catchSound failed:", err));
    });

    item.addEventListener('dragend', (e) => {
      item.style.opacity = '1';
      item.style.cursor = 'grab';
    });
  });



  setupDropzones(doc);
}

function setupDropzones(doc) {
  const dropzones = doc.querySelectorAll('.dropzone');
  const gameContainer = doc.querySelector('.game-container');

  if (!gameContainer) {
    console.warn("game-container not found");
    return;
  }

  doc.addEventListener('drag', (e) => {
    if (!draggedItem) return;

    let closestDropzone = null;
    let minDistance = Infinity;
    const snapThreshold = 50;

    dropzones.forEach((dropzone) => {
      const dropzoneRect = dropzone.getBoundingClientRect();
      const dropzoneCenterX = dropzoneRect.left + dropzoneRect.width / 2;
      const dropzoneCenterY = dropzoneRect.top + dropzoneRect.height / 2;

      const distance = Math.sqrt(
        Math.pow(e.clientX - dropzoneCenterX, 2) +
        Math.pow(e.clientY - dropzoneCenterY, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestDropzone = dropzone;
      }
    });

    dropzones.forEach(dz => dz.style.backgroundColor = '');
    if (closestDropzone && minDistance < snapThreshold) {
      closestDropzone.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    }
  });

  dropzones.forEach((dropzone) => {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.backgroundColor = '';

      if (!draggedItem) return;

      handleItemDrop(doc, dropzone, draggedItem, gameContainer);
    });
  });

  doc.addEventListener('drop', (e) => {
    if (!draggedItem) return;

    e.preventDefault();

    // Find nearest dropzone
    let nearestDropzone = null;
    let minDistance = Infinity;

    dropzones.forEach((dropzone) => {
      const dropzoneRect = dropzone.getBoundingClientRect();
      const dropzoneCenterX = dropzoneRect.left + dropzoneRect.width / 2;
      const dropzoneCenterY = dropzoneRect.top + dropzoneRect.height / 2;

      const distance = Math.sqrt(
        Math.pow(e.clientX - dropzoneCenterX, 2) +
        Math.pow(e.clientY - dropzoneCenterY, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestDropzone = dropzone;
      }
    });

    // Snap to nearest dropzone if within reasonable distance
    const snapDistance = 50; // Maximum distance to snap - changed from 150 to 50
    if (nearestDropzone && minDistance < snapDistance) {
      handleItemDrop(doc, nearestDropzone, draggedItem, gameContainer);
    }
    if (nearestDropzone && minDistance < snapDistance) {
      handleItemDrop(doc, nearestDropzone, draggedItem, gameContainer);
    }

    // Clear highlights
    dropzones.forEach(dz => dz.style.backgroundColor = '');
  });
}

function handleItemDrop(doc, dropzone, item, gameContainer) {
  const itemGroup = item.getAttribute('data-group');
  const answerX = parseInt(item.getAttribute('data-answer-x'));
  const answerY = parseInt(item.getAttribute('data-answer-y'));
  const answerWidth = parseInt(item.getAttribute('data-answer-width'));
  const answerHeight = parseInt(item.getAttribute('data-answer-height'));
  const itemIndex = item.dataset.itemIndex;

  const dropzoneGroup = dropzone.getAttribute('data-group');

  const position = getDropzoneRelativePosition(doc, dropzone, item);

  item.style.position = 'absolute';
  item.style.left = position.x + 'px';
  item.style.top = position.y + 'px';
  item.style.pointerEvents = 'none';

  if (answerWidth && answerHeight) {
    item.style.width = answerWidth + 'px';
    item.style.height = answerHeight + 'px';
  }

  gameContainer.appendChild(item);

  item.style.animation = 'none';
  item.style.transform = 'none';

  const isCorrect = itemGroup === dropzoneGroup;
  const existingIndex = dropResults.findIndex(r => r.itemIndex === itemIndex);
  const result = {
    itemIndex: itemIndex,
    itemGroup: itemGroup,
    dropzoneGroup: dropzoneGroup,
    snappedPosition: { x: position.x, y: position.y },
    isCorrect: isCorrect
  };

  if (existingIndex >= 0) {
    dropResults[existingIndex] = result;
  } else {
    dropResults.push(result);
  }

  putSound.currentTime = 0;
  putSound.play()
    .then(() => console.log("putSound played"))
    .catch(err => console.error("putSound failed:", err));

  draggedItem = null;

  const allItems = doc.querySelectorAll('.item');

  const totalItems = Array.from(allItems).filter(item => {
    if (isRetryMode) {
      return wrongItemIds.includes(item.dataset.itemIndex);
    }
    return true;
  }).length;

  const relevantDrops = isRetryMode
    ? dropResults.filter(r => wrongItemIds.includes(r.itemIndex)).length
    : dropResults.length;

  if (relevantDrops === totalItems) {
    stopTimer();

    if (!isRetryMode) {
      const scoreData = calculateScore();
      initialScore = scoreData.correct;
      initialTime = elapsedTime;
    }

    setTimeout(() => {
      if (isRetryMode) {
        showSuccessModal();
      } else {
        const scoreData = calculateScore();
        if (scoreData.correct < scoreData.total) {
          showRetryModal();
        } else {
          showSuccessModal();
        }
      }
    }, 500);
  }
}

function getDropzoneRelativePosition(doc, dropzone, item) {
  const dropzoneLeft = parseInt(dropzone.style.left || 0);
  const dropzoneTop = parseInt(dropzone.style.top || 0);

  const answerX = parseInt(item.dataset.answerX);
  const answerY = parseInt(item.dataset.answerY);

  const correctDropzone = doc.querySelector(`.dropzone[data-group="${item.dataset.group}"]`);
  const correctDropzoneLeft = parseInt(correctDropzone.style.left || 0);
  const correctDropzoneTop = parseInt(correctDropzone.style.top || 0);

  const offsetWithinDropzone = {
    x: answerX - correctDropzoneLeft,
    y: answerY - correctDropzoneTop
  };

  return {
    x: dropzoneLeft + offsetWithinDropzone.x,
    y: dropzoneTop + offsetWithinDropzone.y
  };
}

// =======================================================
// SCORE CALCULATION 
// =======================================================
function calculateScore() {
  totalItems = dropResults.length;
  const correctItems = dropResults.filter(r => r.isCorrect).length;
  const score = correctItems;

  return {
    total: totalItems,
    correct: correctItems,
    score: score,
    details: dropResults
  };
}
// =======================================================
// SUCCESS & RETRY MODALS
// =======================================================


function showSuccessModal() {
  successSound.currentTime = 0;
  successSound.play();

  const modal = document.getElementById("success-modal");
  const scoreDisplay = document.getElementById("score-display");
  const timeDisplay = document.getElementById("time-display");
  const modalTitle = document.querySelector(".modal-title");

  if (!modal) {
    console.warn("⚠️ Success modal not found in HTML");
    return;
  }

  const scoreData = calculateScore();
  totalScore = (isRetryMode && initialScore > 0) ? initialScore : scoreData.correct;
  const totalItems = scoreData.total;
  const displayTime = (isRetryMode && initialScore > 0) ? initialTime : elapsedTime;

  let titleText = "Great Job";
  if (totalScore === totalItems) {
    titleText = "Perfect Score!";
  } else if (totalScore >= totalItems * 0.8) {
    titleText = "Awesome Work";
  } else if (totalScore >= totalItems * 0.5) {
    titleText = "Well Done";
  } else {
    titleText = "Good Try";
  }

  modalTitle.textContent = titleText;
  scoreDisplay.textContent = `${totalScore}/${totalItems} points`;
  timeDisplay.textContent = `Time: ${formatTime(displayTime)}`;

  modal.classList.add("show");
  modal.style.display = "flex";

  const replayBtn = document.getElementById("replay-btn");
  const nextBtn = document.getElementById("next-btn");

  if (replayBtn) {
    replayBtn.onclick = () => {
      modal.classList.remove("show");
      modal.style.display = "none";

      totalScore = 0;
      elapsedTime = 0;
      dropResults = [];
      isRetryMode = false;
      wrongItemIds = [];
      initialScore = 0;
      initialTime = 0;

      stopTimer();
      loadQuestion();
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      completeTest();
    };
  }
}

function showRetryModal() {
  const scoreData = calculateScore();
  totalScore = scoreData.correct;
  const totalItems = scoreData.total;

  const modal = document.createElement("div");
  modal.id = "retry-modal";
  modal.classList.add("retry-modal");

  if (totalScore === 0) {
    const modalTitle = "Minimum Score Not Met";
    const modalText = "You didn't get any correct answers this time. Don't worry — let's try again!";

    modal.innerHTML = `
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
          <p class="retry-text">${modalText}</p>
          
          <div class="retry-buttons">
            <button id="retry-zero-btn" class="retry-btn retry-yes">
              Try Again
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const fullText = `${modalTitle}. ${modalText}`;
    playSpeech(fullText);

    document.getElementById("retry-zero-btn").onclick = () => {
      stopSpeech();
      modal.remove();

      wrongItemIds = dropResults.map((r) => r.itemIndex);
      isRetryMode = true;

      dropResults = [];
      totalScore = 0;
      loadQuestion();
    };
  } else {
    const box = document.createElement("div");
    box.classList.add("retry-modal-box");

    box.innerHTML = `
      <h2 class="retry-title">
        You scored ${String(totalScore).padStart(2, "0")}/${String(totalItems).padStart(2, "0")}
      </h2>

      <p class="retry-text">Do you want to try again with the incorrect items?</p>

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

      wrongItemIds = dropResults
        .filter((r) => !r.isCorrect)
        .map((r) => r.itemIndex);

      dropResults = dropResults.filter(r => r.isCorrect);

      isRetryMode = true;

      loadQuestion();
    };
  }
}

// =======================================================
// UNLOCK AUDIO 
// =======================================================
function unlockAudio() {
  [putSound, catchSound, successSound].forEach(sound => {
    sound.volume = 0;
    sound.play().then(() => {
      sound.pause();
      sound.currentTime = 0;
      sound.volume = 1;
    }).catch(() => { });
  });
}

function completeTest() {
  console.log("Submitting test results...");
  const params = new URLSearchParams(window.location.search);
  const sid = params.get("sid");
  const tid = params.get("tid");
  const lid = params.get("lid");
  const stid = params.get("stid");
  const qid = params.get("qid");
  const ust = params.get("ust");

  const totalImages = dragDropQuestion.reduce(
    (sum, data) => sum + (data?.images?.length || 0),
    0
  );

  const wrong_answer = totalItems - totalScore;
  console.log("wrong_answer", wrong_answer);
  console.log("totalScore", totalScore);

  const data = {
    sid,
    tid,
    lid,
    stid,
    qid,
    ust,
    correctAnswers: totalScore,
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
        const is_correct = wrong_answer === 0 ? 1 : 0;
        storeSeparateEntries(
          questionTextData,
          elapsedTime,
          is_correct,
          questionIds[0]
        );
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

let previous_second = 0;
function storeSeparateEntries(question, comp_time, is_correct, ques_id) {
  previous_second = comp_time;

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
  };
  const data = {
    question,
    comp_time,
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