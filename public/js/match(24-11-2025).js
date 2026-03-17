// const matchQuestions = [
//     { "question": "Match the Following" },
//     {
//         "instruction": "",
//         "is_euqal_one": { "text": "", "thumbnail": "/match/dog.jpg" },
//         "is_euqal_two": { "text": "Kennel", "thumbnail": "" }
//     },
//     {
//         "instruction": "",
//         "is_euqal_one": { "text": "Bird", "thumbnail": "/match/bird.jpg" },
//         "is_euqal_two": { "text": "Nest", "thumbnail": "/match/nest.jpg" }
//     },
//     {
//         "instruction": "",
//         "is_euqal_one": { "text": "Cow", "thumbnail": "/match/cow.jpg" },
//         "is_euqal_two": { "text": "Shed", "thumbnail": "/match/shed.png" }
//     },
//     {
//         "instruction": "",
//         "is_euqal_one": { "text": "Lion", "thumbnail": "/match/lion.jpg" },
//         "is_euqal_two": { "text": "Den", "thumbnail": "/match/den.png" }
//     },
// ];

// const matchQuestions = [
//   {
//     questionid: [5],
//     question: "Match the Following",
//   },
//   {
//     instruction: "match the birds",
//     is_equal_one: {
//       text: "test",
//       thumbnail: "uploads/questions/1763094181387-593643601.gif",
//     },
//     is_equal_two: {
//       text: "test",
//       thumbnail: "uploads/questions/1763094181399-539280771.svg",
//     },
//   },
//   {
//     instruction: "",
//     is_equal_one: {
//       text: "test 1",
//       thumbnail: "uploads/questions/1763094181400-242156997.jpg",
//     },
//     is_equal_two: {
//       text: "test 1",
//       thumbnail: "uploads/questions/1763094181402-285537958.jpg",
//     },
//   },
//   {
//     instruction: "",
//     is_equal_one: {
//       text: "test 1",
//       thumbnail: "uploads/questions/1763094181400-242156997.jpg",
//     },
//     is_equal_two: {
//       text: "test 1",
//       thumbnail: "uploads/questions/1763094181402-285537958.jpg",
//     },
//   },
// ];

let publicURL = "https://demoadmin.fefdybraingym.com/public/";
let matchQuestions = [];
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
    url: "/admin/activity/questions/match/get",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify(data),
    success: function (res) {
      if (Array.isArray(res)) {
        matchQuestions = res;
        // console.log("matchQuestions", matchQuestions);
        questionsLoaded = true;
        if (typeof callback === "function") {
          callback();
        }
        questionIds = matchQuestions[0].questionid;
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

let currentQuestionIndex = 0;
let timerInterval;
let elapsedTime = 0;
let totalScore = 0;
let matchedPairs = [];
let selectedTopDot = null;
let selectedTopCard = null;
let isDrawing = false;
let canvas = null;
let ctx = null;
let drawnLines = [];
let questionTextData = "";
const successSound = new Audio("/choose/success.wav");
window.onload = () => {
  fetchQuestions(() => {
    loadQuestion();
  });
};

function loadQuestion() {
  const questionContainer = document.querySelector(".question-match");
  const optionsContainer = document.querySelector(".match-options");

  questionTextData = matchQuestions[0].question;
  const pairsData = matchQuestions.slice(1);

  questionContainer.innerHTML = "";
  optionsContainer.innerHTML = "";
  matchedPairs = [];
  drawnLines = [];
  selectedTopDot = null;
  selectedTopCard = null;

  const questionText = document.createElement("div");
  questionText.classList.add("question-text");
  questionText.onmouseover = () => playSpeech(questionTextData);
  questionText.textContent = questionTextData;
  questionContainer.appendChild(questionText);

  const rowsWrapper = document.createElement("div");
  rowsWrapper.classList.add("match-rows");
  rowsWrapper.style.position = "relative";

  const topRow = document.createElement("div");
  topRow.classList.add("match-row");
  topRow.id = "top-row";

  const bottomRow = document.createElement("div");
  bottomRow.classList.add("match-row");
  bottomRow.id = "bottom-row";

  pairsData.forEach((pair, index) => {
    const topCard = createCard(pair.is_equal_one, "top", index, index);
    topRow.appendChild(topCard);
  });

  const bottomItems = pairsData.map((p, idx) => ({
    item: p.is_equal_two,
    originalIndex: idx,
  }));

  shuffleArray(bottomItems);

  bottomItems.forEach((itemData, index) => {
    const bottomCard = createCard(
      itemData.item,
      "bottom",
      index,
      itemData.originalIndex
    );
    bottomRow.appendChild(bottomCard);
  });

  rowsWrapper.appendChild(topRow);
  rowsWrapper.appendChild(bottomRow);
  optionsContainer.appendChild(rowsWrapper);

  canvas = document.createElement("canvas");
  canvas.style.position = "absolute";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "10";
  rowsWrapper.appendChild(canvas);

  setTimeout(() => {
    canvas.width = rowsWrapper.offsetWidth;
    canvas.height = rowsWrapper.offsetHeight;
    ctx = canvas.getContext("2d");
  }, 0);

  updateProgressBar(pairsData.length);
}
function getCurrentScale() {
  const wrapper = document.querySelector(".iframe-scale-wrapper");
  if (!wrapper) return 1;

  const transform = window.getComputedStyle(wrapper).transform;
  if (transform === "none") return 1;

  const values = transform.split("(")[1].split(")")[0].split(",");
  return parseFloat(values[0]) || 1;
}
function createCard(item, side, index, originalIndex) {
  const cardWrapper = document.createElement("div");
  cardWrapper.classList.add("match-card-wrapper", `${side}-wrapper`);
  cardWrapper.dataset.side = side;
  cardWrapper.dataset.index = index;
  cardWrapper.dataset.originalIndex = originalIndex;

  const card = document.createElement("div");
  card.classList.add("match-card", `${side}-card`);
  if (side === "bottom") card.classList.add("bottom-card");
  card.dataset.side = side;
  card.dataset.index = index;
  card.dataset.originalIndex = originalIndex;
  card.dataset.matched = "false";

  const hasImage = item.thumbnail && item.thumbnail.trim() !== "";
  const hasText = item.text && item.text.trim() !== "";

  let contentClass = "mixed-content";
  if (hasImage && !hasText) {
    contentClass = "image-only";
  } else if (hasText && !hasImage) {
    contentClass = "text-only";
  }

  card.classList.add(contentClass);

  if (hasImage && hasText) {
    card.innerHTML = `
            <img class="match-card-img" src="${publicURL}${item.thumbnail
      }" alt="${item.text}">
            <div class="match-card-text" onmouseover="playSpeech('${item.text.replace(
        /'/g,
        "\\'"
      )}')">${item.text}</div>
        `;
  } else if (hasImage) {
    card.innerHTML = `
            <img class="match-card-img image-full" src="${publicURL}${item.thumbnail}" alt="${item.text}">
        `;
  } else if (hasText) {
    card.innerHTML = `
            <div class="match-card-text text-full" onmouseover="playSpeech('${item.text.replace(
      /'/g,
      "\\'"
    )}')">${item.text}</div>
        `;
  }

  const dot = document.createElement("div");
  dot.classList.add("match-dot");
  dot.dataset.side = side;
  dot.dataset.index = index;
  dot.dataset.originalIndex = originalIndex;
  dot.style.cursor = "pointer";

  if (side === "top") {
    dot.addEventListener("mousedown", (e) => startDrag(e, dot, cardWrapper));
    card.addEventListener("mousedown", (e) => startDrag(e, dot, cardWrapper));
    card.addEventListener("click", (e) => {
      if (!isDrawing) {
        selectTopCard(cardWrapper, dot);
      }
    });
  }

  if (side === "bottom") {
    card.addEventListener("click", (e) => {
      if (selectedTopCard && !isDrawing) {
        completeMatch(
          selectedTopCard.cardWrapper,
          selectedTopCard.dot,
          cardWrapper,
          dot
        );
      }
    });

    dot.addEventListener("mouseup", (e) => endDrag(e, dot, cardWrapper));
  }

  cardWrapper.appendChild(card);
  cardWrapper.appendChild(dot);

  return cardWrapper;
}

function selectTopCard(cardWrapper, dot) {
  const card = cardWrapper.querySelector(".match-card");

  if (card.dataset.matched === "true") {
    return;
  }

  if (selectedTopCard) {
    selectedTopCard.cardWrapper.classList.remove("selected");
  }

  selectedTopCard = { cardWrapper, dot };
  cardWrapper.classList.add("selected");
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function startDrag(e, dot, cardWrapper) {
  const card = cardWrapper.querySelector(".match-card");
  if (card.dataset.matched === "true") {
    return;
  }


  if (selectedTopCard) {
    selectedTopCard.cardWrapper.classList.remove("selected");
    selectedTopCard = null;
  }

  isDrawing = true;
  selectedTopDot = { dot: dot, cardWrapper: cardWrapper };
  dot.classList.add("active");

  let hoveredBottomDot = null;

  // Handle both mouse and touch movement
  const handleMouseMove = (moveEvent) => {
    if (!isDrawing || !canvas || !ctx) return;

    const scale = getCurrentScale();
    // NEW: Use unified function for both mouse and touch
    const { x: mouseX, y: mouseY } = getPointerCoordinates(moveEvent);

    const canvasRect = canvas.getBoundingClientRect();
    const toX = (mouseX - canvasRect.left) / scale;
    const toY = (mouseY - canvasRect.top) / scale;

    const fromRect = dot.getBoundingClientRect();
    const fromX =
      (fromRect.left - canvasRect.left) / scale + fromRect.width / 2 / scale;
    const fromY =
      (fromRect.top - canvasRect.top) / scale + fromRect.height / 2 / scale;

    // Get all bottom dots and check for hover
    const bottomDots = document.querySelectorAll(
      '.match-dot[data-side="bottom"]'
    );
    let newHoveredDot = null;

    bottomDots.forEach((bottomDot) => {
      const rect = bottomDot.getBoundingClientRect();
      const distance = Math.hypot(
        mouseX - (rect.left + rect.width / 2),
        mouseY - (rect.top + rect.height / 2)
      );

      if (distance < 40) {
        newHoveredDot = bottomDot;
      }
    });

    if (hoveredBottomDot !== newHoveredDot) {
      if (hoveredBottomDot) {
        hoveredBottomDot.classList.remove("hover-target");
      }
      hoveredBottomDot = newHoveredDot;
      if (hoveredBottomDot) {
        hoveredBottomDot.classList.add("hover-target");
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawnLines.forEach((line) => {
      drawLineOnCanvas(
        line.fromX,
        line.fromY,
        line.toX,
        line.toY,
        line.color,
        line.dashed
      );
    });
    let finalToX = toX;
    let finalToY = toY;

    if (hoveredBottomDot) {
      const hoverRect = hoveredBottomDot.getBoundingClientRect();
      finalToX =
        (hoverRect.left - canvasRect.left) / scale +
        hoverRect.width / 2 / scale;
      finalToY =
        (hoverRect.top - canvasRect.top) / scale + hoverRect.height / 2 / scale;
    }

    ctx.strokeStyle = "#000000ff";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);

    const midY = (fromY + finalToY) / 2;
    ctx.bezierCurveTo(fromX, midY, finalToX, midY, finalToX, finalToY);
    ctx.stroke();
  };

  const handleMouseUp = (upEvent) => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    document.removeEventListener("touchmove", handleMouseMove);
    document.removeEventListener("touchend", handleMouseUp);

    if (hoveredBottomDot) {
      hoveredBottomDot.classList.remove("hover-target");
      const bottomCardWrapper = hoveredBottomDot.closest(".match-card-wrapper");
      endDrag(upEvent, hoveredBottomDot, bottomCardWrapper);
    }

    isDrawing = false;
  };

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);

  document.addEventListener("touchmove", handleMouseMove, { passive: false });
  document.addEventListener("touchend", handleMouseUp);
}

function completeMatch(topCardWrapper, topDot, bottomCardWrapper, bottomDot) {
  const topCard = topCardWrapper.querySelector(".match-card");
  const bottomCard = bottomCardWrapper.querySelector(".match-card");

  const topOriginalIndex = parseInt(topCardWrapper.dataset.originalIndex);
  const bottomOriginalIndex = parseInt(bottomCardWrapper.dataset.originalIndex);

  const isCorrect = topOriginalIndex === bottomOriginalIndex;

  const existingLineIndex = drawnLines.findIndex(
    (line) => line.lineData.topOriginalIndex === topOriginalIndex
  );

  if (existingLineIndex !== -1) {
    const oldLine = drawnLines[existingLineIndex];
    oldLine.lineData.topCard.classList.remove("matched");
    oldLine.lineData.bottomCard.classList.remove("matched");
    oldLine.lineData.topCard.dataset.matched = "false";
    oldLine.lineData.bottomCard.dataset.matched = "false";

    drawnLines.splice(existingLineIndex, 1);

    matchedPairs = matchedPairs.filter(
      (pair) => pair.index !== topOriginalIndex
    );
  }

  const lineData = {
    fromDot: topDot,
    toDot: bottomDot,
    isCorrect: isCorrect,
    topCardWrapper: topCardWrapper,
    bottomCardWrapper: bottomCardWrapper,
    topOriginalIndex: topOriginalIndex,
    topCard: topCard,
    bottomCard: bottomCard
  };

  const lineCoords = getLineCoordinates(topDot, bottomDot);
  drawnLines.push({
    ...lineCoords,
    color: "#000000ff",
    dashed: false,
    lineData: lineData,
  });

  redrawAllLines();

  const pairsData = matchQuestions.slice(1);
  if (drawnLines.length === pairsData.length) {
    topCard.classList.add("matched");
    bottomCard.classList.add("matched");
    topCard.dataset.matched = "true";
    bottomCard.dataset.matched = "true";

    matchedPairs.push({
      lineData: lineData,
      index: topOriginalIndex,
    });

    updateProgressBar(pairsData.length);
    stopTimer();
    setTimeout(() => revealResults(), 800);
  } else {
    updateProgressBar(pairsData.length);
  }

  topCardWrapper.classList.remove("selected");
  selectedTopCard = null;
}

function endDrag(e, bottomDot, bottomCardWrapper) {
  if (!isDrawing || !selectedTopDot) {
    return;
  }
  isDrawing = false;

  const topCard = selectedTopDot.cardWrapper.querySelector(".match-card");
  const bottomCard = bottomCardWrapper.querySelector(".match-card");

  const topOriginalIndex = parseInt(
    selectedTopDot.cardWrapper.dataset.originalIndex
  );
  const bottomOriginalIndex = parseInt(bottomCardWrapper.dataset.originalIndex);

  const isCorrect = topOriginalIndex === bottomOriginalIndex;

  const existingLineIndex = drawnLines.findIndex(
    (line) => line.lineData.topOriginalIndex === topOriginalIndex
  );

  if (existingLineIndex !== -1) {
    const oldLine = drawnLines[existingLineIndex];
    oldLine.lineData.topCard.classList.remove("matched");
    oldLine.lineData.bottomCard.classList.remove("matched");
    oldLine.lineData.topCard.dataset.matched = "false";
    oldLine.lineData.bottomCard.dataset.matched = "false";

    drawnLines.splice(existingLineIndex, 1);

    matchedPairs = matchedPairs.filter(
      (pair) => pair.index !== topOriginalIndex
    );
  }

  const lineData = {
    fromDot: selectedTopDot.dot,
    toDot: bottomDot,
    isCorrect: isCorrect,
    topCardWrapper: selectedTopDot.cardWrapper,
    bottomCardWrapper: bottomCardWrapper,
    topOriginalIndex: topOriginalIndex,
    topCard: topCard,
    bottomCard: bottomCard
  };

  const lineCoords = getLineCoordinates(selectedTopDot.dot, bottomDot);
  drawnLines.push({
    ...lineCoords,
    color: "#000000ff",
    dashed: false,
    lineData: lineData,
  });

  redrawAllLines();

  const pairsData = matchQuestions.slice(1);
  if (drawnLines.length === pairsData.length) {
    topCard.classList.add("matched");
    bottomCard.classList.add("matched");
    topCard.dataset.matched = "true";
    bottomCard.dataset.matched = "true";

    matchedPairs.push({
      lineData: lineData,
      index: topOriginalIndex,
    });

    updateProgressBar(pairsData.length);
    stopTimer();
    setTimeout(() => revealResults(), 800);
  } else {
    updateProgressBar(pairsData.length);
  }

  selectedTopDot.dot.classList.remove("active");
  selectedTopDot = null;
}

function getLineCoordinates(fromDot, toDot) {
  if (!canvas) return { fromX: 0, fromY: 0, toX: 0, toY: 0 };

  const scale = getCurrentScale();
  const canvasRect = canvas.getBoundingClientRect();
  const fromRect = fromDot.getBoundingClientRect();
  const toRect = toDot.getBoundingClientRect();

  const fromX =
    (fromRect.left - canvasRect.left) / scale + fromRect.width / 2 / scale;
  const fromY =
    (fromRect.top - canvasRect.top) / scale + fromRect.height / 2 / scale;
  const toX =
    (toRect.left - canvasRect.left) / scale + toRect.width / 2 / scale;
  const toY = (toRect.top - canvasRect.top) / scale + toRect.height / 2 / scale;

  return { fromX, fromY, toX, toY };
}

function drawLineOnCanvas(fromX, fromY, toX, toY, color, dashed) {
  if (!ctx) return;

  ctx.strokeStyle = color || "#000000ff";
  ctx.lineWidth = 5;

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);

  const midY = (fromY + toY) / 2;
  ctx.bezierCurveTo(fromX, midY, toX, midY, toX, toY);

  ctx.stroke();
}

function redrawAllLines() {
  if (!ctx || !canvas) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawnLines.forEach((line) => {
    drawLineOnCanvas(
      line.fromX,
      line.fromY,
      line.toX,
      line.toY,
      "#000000ff",
      false
    );
  });
}

function revealResults() {
  if (!canvas || !ctx) {
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawnLines.forEach((line) => {
    const lineData = line.lineData;
    const coords = getLineCoordinates(lineData.fromDot, lineData.toDot);
    const color = lineData.isCorrect ? "#000000ff" : "#f44336";
    drawLineOnCanvas(
      coords.fromX,
      coords.fromY,
      coords.toX,
      coords.toY,
      color,
      false
    );
  });

  const correctCount = drawnLines.filter(
    (line) => line.lineData.isCorrect
  ).length;
  const totalQuestions = drawnLines.length;
  totalScore = correctCount;

  if (correctCount < totalQuestions) {
    setTimeout(() => showRetryModal(correctCount, totalQuestions), 1500);
  } else {
    setTimeout(() => showSuccessModal(), 1500);
  }
}

function showRetryModal(correctCount, totalQuestions) {
  const modal = document.createElement("div");
  modal.id = "retry-modal";
  modal.classList.add("retry-modal");

  const box = document.createElement("div");
  box.classList.add("retry-modal-box");

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
    totalScore = 0;
    currentQuestionIndex = 0;
    elapsedTime = 0;
    matchedPairs = [];
    drawnLines = [];
    stopTimer();
    startTimer();
    loadQuestion();
  };
}

function clearCanvas() {
  if (canvas && ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function updateProgressBar(totalPairs) {
  const progressBar = document.getElementById("progress-bar");
  const matchedCount = matchedPairs.length;
  const percentage = (matchedCount / totalPairs) * 100;
  progressBar.style.width = percentage + "%";
}

function startTimer() {
  timerInterval = setInterval(() => {
    elapsedTime++;
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    document.getElementById("timer").textContent = `${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function startGame() {
  document.getElementById("start-modal").style.display = "none";
  document.getElementById("match-container").style.display = "flex";

  currentQuestionIndex = 0;
  elapsedTime = 0;
  totalScore = 0;
  matchedPairs = [];
  drawnLines = [];

  startTimer();
  loadQuestion();
}

function showSuccessModal() {
  successSound.currentTime = 0;
  successSound.play()
  const modal = document.getElementById("success-modal");
  const scoreDisplay = document.getElementById("score-display");
  const timeDisplay = document.getElementById("time-display");

  if (!modal) {
    return;
  }

  if (scoreDisplay) scoreDisplay.textContent = `${totalScore} points`;
  if (timeDisplay)
    timeDisplay.textContent = `Time taken: ${formatTime(elapsedTime)}`;

  modal.classList.add("show");
  modal.style.display = "flex";

  const replayBtn = document.getElementById("replay-btn");
  const nextBtn = document.getElementById("next-btn");

  if (replayBtn) {
    replayBtn.onclick = () => {
      modal.classList.remove("show");
      modal.style.display = "none";
      totalScore = 0;
      currentQuestionIndex = 0;
      elapsedTime = 0;
      matchedPairs = [];
      drawnLines = [];
      stopTimer();
      startTimer();
      loadQuestion();
    };
  }

  //   if (nextBtn) {
  //     nextBtn.onclick = () => {
  //       location.reload();
  //     };
  //   }
}

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

    if (canvas && ctx && drawnLines.length > 0) {
      redrawAllLines();
    }

    console.log("Inside iframe detected");
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
  //   console.log("currentQuestionIndex", currentQuestionIndex);
  //   console.log("timerInterval", timerInterval);
  //   console.log("totalScore", totalScore);
  //   console.log("matchedPairs", matchedPairs);
  const params = new URLSearchParams(window.location.search);
  const sid = params.get("sid");
  const tid = params.get("tid");
  const lid = params.get("lid");
  const stid = params.get("stid");
  const qid = params.get("qid");
  const ust = params.get("ust");

  const ttl_questions = matchedPairs.length;
  const wrong_answer = ttl_questions - totalScore;

  const data = {
    sid,
    tid,
    lid,
    stid,
    qid,
    ust,
    correctAnswers: totalScore,
    wrongAnswers: wrong_answer > 0 ? wrong_answer: 0,
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
        const is_correct = wrong_answer === 0 ? 0 : 1;
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
  //   const [minutes, seconds] = comp_time.split(":").map(Number);
  //   const compTimeInSeconds = minutes * 60 + seconds;
  //   const diff = compTimeInSeconds - previous_second;
  previous_second = comp_time;

  //   console.log(question, comp_time, diff, is_correct);
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
  // console.log(data)
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

function getPointerCoordinates(e) {
  if (e.touches && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  } else if (e.changedTouches && e.changedTouches.length > 0) {
    return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

if (side === "top") {
  dot.addEventListener("mousedown", (e) => startDrag(e, dot, cardWrapper));
  card.addEventListener("mousedown", (e) => startDrag(e, dot, cardWrapper));

  dot.addEventListener("touchstart", (e) => {
    e.preventDefault();
    startDrag(e, dot, cardWrapper);
  });
  card.addEventListener("touchstart", (e) => {
    e.preventDefault();
    startDrag(e, dot, cardWrapper);
  });

  card.addEventListener("click", (e) => {
    if (!isDrawing) {
      selectTopCard(cardWrapper, dot);
    }
  });
}

if (side === "bottom") {
  card.addEventListener("click", (e) => {
    if (selectedTopCard && !isDrawing) {
      completeMatch(
        selectedTopCard.cardWrapper,
        selectedTopCard.dot,
        cardWrapper,
        dot
      );
    }
  });

  // EXISTING mouse end
  dot.addEventListener("mouseup", (e) => endDrag(e, dot, cardWrapper));

  // NEW: Touch end
  dot.addEventListener("touchend", (e) => {
    e.preventDefault();
    endDrag(e, dot, cardWrapper);
  });
}