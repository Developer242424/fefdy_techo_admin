// const matchQuestions = [
//   {
//     question: "Match animals to their homes",
//   },
//   {
//     instruction: "Pick the animal that can fly",
//     inner_instruction: "Now, match the animal with its home",
//     is_equal_one: {
//       text: "",
//       thumbnail: "/match/bird.jpg",
//     },
//     is_equal_two: {
//       text: "Nest",
//       thumbnail: "/match/nest.jpg",
//     },
//   },
//   {
//     instruction: "Pick the animal that is a pet animal",
//     inner_instruction: "Now, match the animal with its home",
//     is_equal_one: {
//       text: "Dog",
//       thumbnail: "",
//     },
//     is_equal_two: {
//       text: "Kennel",
//       thumbnail: "/match/kennel.jpg",
//     },
//   },
//   {
//     instruction: "Pick the animal that is a wild animal",
//     inner_instruction: "Now, match the animal with its home",
//     is_equal_one: {
//       text: "Lion",
//       thumbnail: "/match/lion.jpg",
//     },
//     is_equal_two: {
//       text: "Den",
//       thumbnail: "",
//     },
//   },
//   {
//     instruction: "Pick the animal that gives us milk",
//     inner_instruction: "Now, match the animal with its home",
//     is_equal_one: {
//       text: "Cow",
//       thumbnail: "/match/cow.jpg",
//     },
//     is_equal_two: {
//       text: "",
//       thumbnail: "/match/shed.png",
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
    url: "/admin/activity/questions/conditional-match/get",
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
let currentPhase = "selection";
let timerInterval;
let elapsedTime = 0;
let totalScore = 0;
let matchedPairs = [];
let selectedTopDot = null;
let selectedTopCard = null;
let selectedEqual_one = null;
let isDrawing = false;
let canvas = null;
let ctx = null;
let drawnLines = [];
let questionTextData = "";

window.onload = () => {
  fetchQuestions(() => {
    loadQuestion();
  });
};

function getCurrentScale() {
  const wrapper = document.querySelector(".iframe-scale-wrapper");
  if (!wrapper) return 1;

  const transform = window.getComputedStyle(wrapper).transform;
  if (transform === "none") return 1;

  const values = transform.split("(")[1].split(")")[0].split(",");
  return parseFloat(values[0]) || 1;
}

function loadQuestion() {
  const questionContainer = document.querySelector(".question-match");
  const optionsContainer = document.querySelector(".match-options");

  questionTextData = matchQuestions[0].question;
  const pairsData = matchQuestions.slice(1);

  questionContainer.innerHTML = "";
  optionsContainer.innerHTML = "";

  const questionText = document.createElement("div");
  questionText.classList.add("question-text");
  questionText.textContent = questionTextData;
  questionContainer.appendChild(questionText);

  if (currentPhase === "selection") {
    loadSelectionPhase(optionsContainer, pairsData);
  } else if (currentPhase === "matching") {
    loadMatchingPhase(optionsContainer, pairsData);
  }
}

function loadSelectionPhase(optionsContainer, pairsData) {
  const currentPair = pairsData[currentQuestionIndex];

  const phaseWrapper = document.createElement("div");
  phaseWrapper.classList.add("selection-phase-wrapper");

  const instruction = document.createElement("div");
  instruction.classList.add("instruction-text");
  instruction.textContent = currentPair.instruction;
  phaseWrapper.appendChild(instruction);

  const cardsContainer = document.createElement("div");
  cardsContainer.classList.add("selection-cards-container");

  pairsData.forEach((pair, index) => {
    const card = createSelectionCard(pair.is_equal_one, index);
    cardsContainer.appendChild(card);
  });

  phaseWrapper.appendChild(cardsContainer);
  optionsContainer.appendChild(phaseWrapper);
}

function createSelectionCard(item, index) {
  const cardWrapper = document.createElement("div");
  cardWrapper.classList.add("selection-card-wrapper");
  cardWrapper.dataset.index = index;

  const card = document.createElement("div");
  card.classList.add("selection-card");
  card.dataset.index = index;

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
            <img class="match-card-img" src="${item.thumbnail}" alt="${item.text}">
            <div class="match-card-text">${item.text}</div>
        `;
  } else if (hasImage) {
    card.innerHTML = `
            <img class="match-card-img image-full" src="${item.thumbnail}" alt="${item.text}">
        `;
  } else if (hasText) {
    card.innerHTML = `
            <div class="match-card-text text-full">${item.text}</div>
        `;
  }

  card.addEventListener("click", () => {
    // console.log("index", index);
    // console.log("currentQuestionIndex", currentQuestionIndex);
    // console.log("matchQuestions[index]", matchQuestions[index]);
    if (index === currentQuestionIndex) {
      selectedEqual_one = { item: item, index: index };
      //   console.log("selectedEqual_one", selectedEqual_one);
      currentPhase = "matching";
      storeSeparateEntries(item.text, elapsedTime, 0);
      loadQuestion();
    } else {
      storeSeparateEntries(matchQuestions[index].instruction, elapsedTime, 1);
      card.classList.add("shake");
      const originalContent = card.innerHTML;
      card.innerHTML = '<div class="try-again-message">Try Again!</div>';
      setTimeout(() => {
        card.classList.remove("shake");
        card.innerHTML = originalContent;
      }, 500);
    }
  });

  cardWrapper.appendChild(card);
  return cardWrapper;
}

function loadMatchingPhase(optionsContainer, pairsData) {
  const currentPair = pairsData[currentQuestionIndex];
  const questionContainer = document.querySelector(".question-match");

  questionContainer.innerHTML = "";
  const questionText = document.createElement("div");
  questionText.classList.add("question-text");
  questionText.textContent = currentPair.inner_instruction;
  questionContainer.appendChild(questionText);

  const phaseWrapper = document.createElement("div");
  phaseWrapper.classList.add("matching-phase-wrapper");

  const rowsWrapper = document.createElement("div");
  rowsWrapper.classList.add("match-rows");
  rowsWrapper.style.position = "relative";

  const topRow = document.createElement("div");
  topRow.classList.add("match-row");
  topRow.id = "top-row";

  const topCard = createMatchingCard(
    selectedEqual_one.item,
    "top",
    0,
    currentQuestionIndex
  );
  topRow.appendChild(topCard);

  const bottomRow = document.createElement("div");
  bottomRow.classList.add("match-row");
  bottomRow.id = "bottom-row";

  pairsData.forEach((pair, index) => {
    const bottomCard = createMatchingCard(
      pair.is_equal_two,
      "bottom",
      index,
      index
    );
    bottomRow.appendChild(bottomCard);
  });

  rowsWrapper.appendChild(topRow);
  rowsWrapper.appendChild(bottomRow);
  phaseWrapper.appendChild(rowsWrapper);
  optionsContainer.appendChild(phaseWrapper);

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
}

function createMatchingCard(item, side, index, originalIndex) {
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
            <img class="match-card-img" src="${item.thumbnail}" alt="${item.text}">
            <div class="match-card-text">${item.text}</div>
        `;
  } else if (hasImage) {
    card.innerHTML = `
            <img class="match-card-img image-full" src="${item.thumbnail}" alt="${item.text}">
        `;
  } else if (hasText) {
    card.innerHTML = `
            <div class="match-card-text text-full">${item.text}</div>
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

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function clearCanvasForMatching() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
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
  selectedTopCard = { cardWrapper, dot };
  cardWrapper.classList.add("selected");

  let hoveredBottomDot = null;

  const handleMouseMove = (moveEvent) => {
    if (!isDrawing || !canvas || !ctx) return;

    const scale = getCurrentScale();
    const mouseX = moveEvent.clientX;
    const mouseY = moveEvent.clientY;

    const canvasRect = canvas.getBoundingClientRect();
    const toX = (mouseX - canvasRect.left) / scale;
    const toY = (moveEvent.clientY - canvasRect.top) / scale;

    const fromRect = dot.getBoundingClientRect();
    const fromX =
      (fromRect.left - canvasRect.left) / scale + fromRect.width / 2 / scale;
    const fromY =
      (fromRect.top - canvasRect.top) / scale + fromRect.height / 2 / scale;

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

    if (hoveredBottomDot) {
      hoveredBottomDot.classList.remove("hover-target");
      const bottomCardWrapper = hoveredBottomDot.closest(".match-card-wrapper");
      endDrag(upEvent, hoveredBottomDot, bottomCardWrapper);
    }

    isDrawing = false;
  };

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
}

function completeMatch(topCardWrapper, topDot, bottomCardWrapper, bottomDot) {
  const topCard = topCardWrapper.querySelector(".match-card");
  const bottomCard = bottomCardWrapper.querySelector(".match-card");

  if (bottomCard.dataset.matched === "true") {
    selectedTopCard.cardWrapper.classList.remove("selected");
    selectedTopCard = null;
    return;
  }

  const topOriginalIndex = parseInt(topCardWrapper.dataset.originalIndex);
  const bottomOriginalIndex = parseInt(bottomCardWrapper.dataset.originalIndex);

  const isCorrect = topOriginalIndex === bottomOriginalIndex;

  const lineData = {
    fromDot: topDot,
    toDot: bottomDot,
    isCorrect: isCorrect,
    topCardWrapper: topCardWrapper,
    bottomCardWrapper: bottomCardWrapper,
    topOriginalIndex: topOriginalIndex,
    bottomOriginalIndex: bottomOriginalIndex,
  };

  const lineCoords = getLineCoordinates(topDot, bottomDot);
  const lineInfo = {
    ...lineCoords,
    color: "#000000ff",
    dashed: false,
    lineData: lineData,
  };
  drawnLines.push(lineInfo);

  if (ctx && canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawLineOnCanvas(
      lineInfo.fromX,
      lineInfo.fromY,
      lineInfo.toX,
      lineInfo.toY,
      lineInfo.color,
      false
    );
  }

  topCard.classList.add("matched");
  bottomCard.classList.add("matched");
  topCard.dataset.matched = "true";
  bottomCard.dataset.matched = "true";

  matchedPairs.push({
    lineData: lineData,
    index: topOriginalIndex,
  });

  topCardWrapper.classList.remove("selected");
  selectedTopCard = null;

  setTimeout(() => {
    moveToNextQuestion();
  }, 1000);
}

function endDrag(e, bottomDot, bottomCardWrapper) {
  if (!isDrawing || !selectedTopDot) {
    return;
  }
  isDrawing = false;

  const topCard = selectedTopDot.cardWrapper.querySelector(".match-card");
  const bottomCard = bottomCardWrapper.querySelector(".match-card");

  if (bottomCard.dataset.matched === "true") {
    clearCanvasForMatching();
    selectedTopDot.dot.classList.remove("active");
    selectedTopDot = null;
    return;
  }

  const topOriginalIndex = parseInt(
    selectedTopDot.cardWrapper.dataset.originalIndex
  );
  const bottomOriginalIndex = parseInt(bottomCardWrapper.dataset.originalIndex);

  const isCorrect = topOriginalIndex === bottomOriginalIndex;

  const lineData = {
    fromDot: selectedTopDot.dot,
    toDot: bottomDot,
    isCorrect: isCorrect,
    topCardWrapper: selectedTopDot.cardWrapper,
    bottomCardWrapper: bottomCardWrapper,
    topOriginalIndex: topOriginalIndex,
    bottomOriginalIndex: bottomOriginalIndex,
  };

  const lineCoords = getLineCoordinates(selectedTopDot.dot, bottomDot);
  const lineInfo = {
    ...lineCoords,
    color: "#000000ff",
    dashed: false,
    lineData: lineData,
  };
  drawnLines.push(lineInfo);

  if (ctx && canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawLineOnCanvas(
      lineInfo.fromX,
      lineInfo.fromY,
      lineInfo.toX,
      lineInfo.toY,
      lineInfo.color,
      false
    );
  }

  topCard.classList.add("matched");
  bottomCard.classList.add("matched");
  topCard.dataset.matched = "true";
  bottomCard.dataset.matched = "true";

  matchedPairs.push({
    lineData: lineData,
    index: topOriginalIndex,
  });

  selectedTopDot.dot.classList.remove("active");
  selectedTopDot = null;

  setTimeout(() => {
    moveToNextQuestion();
  }, 1000);
}

function moveToNextQuestion() {
  const pairsData = matchQuestions.slice(1);
  //   console.log("pairsData", pairsData);
  const currentPairMatch = matchedPairs.find(
    (p) => p.index === currentQuestionIndex
  );

  const isCorrect = currentPairMatch?.lineData?.isCorrect ? 0 : 1;

  // Store time + correctness for this question
  storeSeparateEntries(
    pairsData[currentQuestionIndex].inner_instruction,
    elapsedTime,
    isCorrect
  );

  if (currentQuestionIndex + 1 < pairsData.length) {
    currentQuestionIndex++;
    currentPhase = "selection";
    selectedEqual_one = null;
    updateProgressBar(pairsData.length);
    loadQuestion();
  } else {
    stopTimer();
    setTimeout(() => revealResults(), 800);
  }
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
  const questionContainer = document.querySelector(".question-match");
  const optionsContainer = document.querySelector(".match-options");

  questionContainer.innerHTML = "";
  optionsContainer.innerHTML = "";

  const titleDiv = document.createElement("div");
  titleDiv.classList.add("question-text");
  titleDiv.textContent = "Your Matches";
  questionContainer.appendChild(titleDiv);

  const phaseWrapper = document.createElement("div");
  phaseWrapper.classList.add("matching-phase-wrapper");

  const rowsWrapper = document.createElement("div");
  rowsWrapper.classList.add("match-rows");
  rowsWrapper.style.position = "relative";

  const topRow = document.createElement("div");
  topRow.classList.add("match-row");
  topRow.id = "top-row";

  const bottomRow = document.createElement("div");
  bottomRow.classList.add("match-row");
  bottomRow.id = "bottom-row";

  const pairsData = matchQuestions.slice(1);
  const dotsMap = {};

  const progressBar = document.getElementById("progress-bar");
  if (progressBar) {
    progressBar.style.width = "100%";
  }

  drawnLines.forEach((line) => {
    const topItem = pairsData[line.lineData.topOriginalIndex].is_equal_one;
    const topCard = createMatchingCard(
      topItem,
      "top",
      line.lineData.topOriginalIndex,
      line.lineData.topOriginalIndex
    );
    topRow.appendChild(topCard);

    dotsMap[`top-${line.lineData.topOriginalIndex}`] =
      topCard.querySelector(".match-dot");
  });

  pairsData.forEach((pair, index) => {
    const bottomCard = createMatchingCard(
      pair.is_equal_two,
      "bottom",
      index,
      index
    );
    bottomRow.appendChild(bottomCard);

    dotsMap[`bottom-${index}`] = bottomCard.querySelector(".match-dot");
  });

  rowsWrapper.appendChild(topRow);
  rowsWrapper.appendChild(bottomRow);
  phaseWrapper.appendChild(rowsWrapper);
  optionsContainer.appendChild(phaseWrapper);

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

    drawnLines.forEach((line) => {
      const lineData = line.lineData;
      const topDot = dotsMap[`top-${lineData.topOriginalIndex}`];
      const bottomDot = dotsMap[`bottom-${lineData.bottomOriginalIndex}`];

      if (topDot && bottomDot) {
        const coords = getLineCoordinates(topDot, bottomDot);
        const color = lineData.isCorrect ? "#000000ff" : "#f44336";
        drawLineOnCanvas(
          coords.fromX,
          coords.fromY,
          coords.toX,
          coords.toY,
          color,
          false
        );
      }
    });

    const correctCount = drawnLines.filter(
      (line) => line.lineData.isCorrect
    ).length;
    const totalQuestions = drawnLines.length;
    totalScore = correctCount;

    setTimeout(() => showRetryModal(correctCount, totalQuestions), 1500);
  }, 100);
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
    resetGame();
  };
}

function resetGame() {
  totalScore = 0;
  currentQuestionIndex = 0;
  currentPhase = "selection";
  elapsedTime = 0;
  matchedPairs = [];
  drawnLines = [];
  selectedEqual_one = null;

  const progressBar = document.getElementById("progress-bar");
  if (progressBar) {
    progressBar.style.width = "0%";
  }

  stopTimer();
  startTimer();
  loadQuestion();
}

function updateProgressBar(totalPairs) {
  const progressBar = document.getElementById("progress-bar");
  const matchedCount = currentQuestionIndex;
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
  currentPhase = "selection";
  elapsedTime = 0;
  totalScore = 0;
  matchedPairs = [];
  drawnLines = [];
  selectedEqual_one = null;

  startTimer();
  loadQuestion();
}

function showSuccessModal() {
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
      resetGame();
    };
  }

  if (nextBtn) {
    // nextBtn.onclick = () => {
    //   location.reload();
    // };
  }
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
    wrongAnswers: wrong_answer,
    totalTime: elapsedTime,
    questionIds,
  };
  //   console.log("data", data);

  $.ajax({
    url: "/admin/activity/questions/history",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify(data),
    success: function (res) {
      if (res.status === 200) {
        const is_correct = wrong_answer === 0 ? 0 : 1;
        storeSeparateEntries1(questionTextData, elapsedTime, is_correct);
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

let previous_second1 = 0;
function storeSeparateEntries1(question, comp_time, is_correct) {
  previous_second1 = comp_time;

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
