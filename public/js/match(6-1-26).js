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

// let publicURL = "http://localhost:5001/";
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
let tempDrag = null;

const successSound = new Audio("/choose/success.wav");
const errorSound = new Audio("/choose/wrong.wav")
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
  // questionText.onmouseover = () => playSpeech(questionTextData);
  playSpeech(questionTextData);
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

  const count = pairsData.length;

  topRow.style.setProperty("--count", count);
  bottomRow.style.setProperty("--count", count);

  topRow.setAttribute("count", count);
  bottomRow.setAttribute("count", count);


  topRow.setAttribute("count", pairsData.length);
  bottomRow.setAttribute("count", pairsData.length);


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

  // Create canvas container between rows
  canvas = document.createElement("canvas");
  canvas.style.position = "absolute";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "10";
  rowsWrapper.appendChild(canvas);

  rowsWrapper.appendChild(bottomRow);
  optionsContainer.appendChild(rowsWrapper);

  setTimeout(() => {
    const scale = getCurrentScale();

    // Canvas spans from top row to bottom row
    canvas.width = (rowsWrapper.offsetWidth + 40) / scale;
    canvas.height = rowsWrapper.offsetHeight / scale;
    canvas.style.top = "0px";

    ctx = canvas.getContext("2d");
    redrawAllLines();
  }, 0);

  rowsWrapper.addEventListener("mousedown", (e) => {
    if (!tempDrag) return;

    const { x, y } = getPointerCoordinates(e);
    const dx = x - tempDrag.clientX;
    const dy = y - tempDrag.clientY;
    const dist = Math.hypot(dx, dy);

    if (dist < 30) {
      const fromRect = tempDrag.fromDot.getBoundingClientRect();
      const canvasRect2 = canvas.getBoundingClientRect();
      const scale2 = getCurrentScale();

      const startX0 =
        (fromRect.left - canvasRect2.left) / scale2 +
        fromRect.width / 2 / scale2;
      const startY0 =
        (fromRect.top - canvasRect2.top) / scale2 +
        fromRect.height / 2 / scale2;

      resumeDragFrom(
        tempDrag.canvasX,
        tempDrag.canvasY,
        tempDrag.fromDot,
        startX0,
        startY0
      );

    }
  });

  rowsWrapper.addEventListener("touchstart", (e) => {
    if (!tempDrag) return;
    e.preventDefault();

    const { x, y } = getPointerCoordinates(e);
    const dx = x - tempDrag.clientX;
    const dy = y - tempDrag.clientY;
    const dist = Math.hypot(dx, dy);

    if (dist < 40) {
      const fromRect = tempDrag.fromDot.getBoundingClientRect();
      const canvasRect2 = canvas.getBoundingClientRect();
      const scale2 = getCurrentScale();

      const startX0 =
        (fromRect.left - canvasRect2.left) / scale2 +
        fromRect.width / 2 / scale2;
      const startY0 =
        (fromRect.top - canvasRect2.top) / scale2 +
        fromRect.height / 2 / scale2;

      resumeDragFrom(
        tempDrag.canvasX,
        tempDrag.canvasY,
        tempDrag.fromDot,
        startX0,
        startY0
      );
    }
  });

  canvas.addEventListener("touchstart", (e) => {
    if (!tempDrag) return;

    e.preventDefault();
    console.log("🟣 Restarting drag from mid-way point (touch)");

    const { x, y } = getPointerCoordinates(e);
    const scale = getCurrentScale();
    const canvasRect = canvas.getBoundingClientRect();

    const adjX = (x - canvasRect.left) / scale;
    const adjY = (y - canvasRect.top) / scale;

    restartIncompleteDrag(adjX, adjY);
  });

  updateProgressBar(pairsData.length);
}

function isCoordinateInBounds(x, y) {
  if (!canvas) return false;

  const topRow = document.getElementById("top-row");
  const bottomRow = document.getElementById("bottom-row");

  if (!topRow || !bottomRow) return false;

  const topRowRect = topRow.getBoundingClientRect();
  const bottomRowRect = bottomRow.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const scale = getCurrentScale();

  // Y should be between top row top and bottom row bottom
  const minY = (topRowRect.top - canvasRect.top) / scale;
  const maxY = (bottomRowRect.bottom - canvasRect.top) / scale;

  const canvasY = y;

  return canvasY >= minY && canvasY <= maxY;
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
      }" alt="${item.text}" onmouseover="playSpeech('${item.text.replace(
        /'/g,
        "\\'"
      )}')">
            <div class="match-card-text" onmouseover="playSpeech('${item.text.replace(
        /'/g,
        "\\'"
      )}')">${item.text}</div>
        `;
  } else if (hasImage) {
    card.innerHTML = `
            <img class="match-card-img image-full" src="${publicURL}${item.thumbnail}" alt="${item.text}" onmouseover="playSpeech('${item.text.replace(
      /'/g,
      "\\'"
    )}')">
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

      if (window.selectedBottomCard && !isDrawing) {
        completeMatch(
          cardWrapper,
          dot,
          window.selectedBottomCard.cardWrapper,
          window.selectedBottomCard.dot
        );
        window.selectedBottomCard.cardWrapper.classList.remove("selected");
        window.selectedBottomCard = null;
        return;
      }

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
        return;
      }

      if (window.selectedBottomCard && selectedTopCard && !isDrawing) {
        completeMatch(
          selectedTopCard.cardWrapper,
          selectedTopCard.dot,
          cardWrapper,
          dot
        );
        return;
      }

      if (!isDrawing) {
        selectBottomCard(cardWrapper, dot);
        return;
      }
    });

    dot.addEventListener("mousedown", (e) => {
      startDrag(e, dot, cardWrapper, "bottom");
    });

    dot.addEventListener("touchstart", (e) => {
      e.preventDefault();
      startDrag(e, dot, cardWrapper, "bottom");
    });

    dot.addEventListener("mouseup", (e) => endDrag(e, dot, cardWrapper));

    dot.addEventListener("touchend", (e) => {
      e.preventDefault();
      endDrag(e, dot, cardWrapper);
    });
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
function selectBottomCard(cardWrapper, dot) {
  console.log("🟡 selectBottomCard triggered:", {
    index: cardWrapper.dataset.index,
    originalIndex: cardWrapper.dataset.originalIndex
  });

  const card = cardWrapper.querySelector(".match-card");

  if (card.dataset.matched === "true") {
    console.log("⚠️ bottom card already matched, ignoring");
    return;
  }

  // Unselect previously selected top card if any
  if (selectedTopCard) {
    console.log("🔄 Switching from top selection to bottom selection");
    selectedTopCard.cardWrapper.classList.remove("selected");
    selectedTopCard = null;
  }

  // If bottom is re-selected, remove old highlight
  if (window.selectedBottomCard) {
    window.selectedBottomCard.cardWrapper.classList.remove("selected");
  }

  window.selectedBottomCard = { cardWrapper, dot };
  cardWrapper.classList.add("selected");

  console.log("✅ Bottom card selected");
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function startDrag(e, dot, cardWrapper, fromSide = null) {

  const dragStartSide = fromSide || dot.dataset.side;
  selectedTopDot = {
    dot: dot,
    cardWrapper: cardWrapper,
    side: dragStartSide
  };
  const card = cardWrapper.querySelector(".match-card");
  if (card.dataset.matched === "true") {
    return;
  }
  if (selectedTopCard) {
    selectedTopCard.cardWrapper.classList.remove("selected");
    selectedTopCard = null;
  }

  isDrawing = true;
  dot.classList.add("active");

  let hoveredBottomDot = null;

  const handleMouseMove = (moveEvent) => {
    if (!isDrawing || !canvas || !ctx) return;

    const scale = getCurrentScale();
    const { x: mouseX, y: mouseY } = getPointerCoordinates(moveEvent);

    const canvasRect = canvas.getBoundingClientRect();
    let toX = (mouseX - canvasRect.left) / scale;
    let toY = (mouseY - canvasRect.top) / scale;

    toX = Math.max(0, Math.min(toX, canvas.width));
    toY = Math.max(0, Math.min(toY, canvas.height));

    const fromRect = dot.getBoundingClientRect();
    const fromX =
      (fromRect.left - canvasRect.left) / scale + fromRect.width / 2 / scale;
    const fromY =
      (fromRect.top - canvasRect.top) / scale + fromRect.height / 2 / scale;

    const minVertical = 10;

    if (selectedTopDot.side === "top") {
      if (toY <= fromY + minVertical) {
        ctx.clearRect(0, canvas.height, canvas.width, 0);
        redrawAllLines();
        return;
      }
    }

    if (selectedTopDot.side === "bottom") {
      if (toY >= fromY - minVertical) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        redrawAllLines();
        return;
      }
    }


    const targetSelector =
      selectedTopDot.side === "top"
        ? '.match-dot[data-side="bottom"]'
        : '.match-dot[data-side="top"]';

    const targetDots = document.querySelectorAll(targetSelector);
    let newHoveredDot = null;

    targetDots.forEach((bottomDot) => {
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
      const coords = getLineCoordinates(line.fromDot, line.toDot);
      const fromSide = line.fromDot.dataset.side;
      drawLineOnCanvas(coords.fromX, coords.fromY, coords.toX, coords.toY, line.color, line.dashed, fromSide);
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

    // Draw current line with strict directional constraint
    const fromSide = selectedTopDot.side;
    const verticalDistance = Math.abs(finalToY - fromY);
    const horizontalDistance = Math.abs(finalToX - fromX);

    ctx.strokeStyle = "#000000ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);

    if (fromSide === "top") {
      // From TOP: ONLY DOWN
      const controlX1 = fromX + (horizontalDistance * 0.2);
      const controlY1 = fromY + (verticalDistance * 0.4);
      const controlX2 = finalToX - (horizontalDistance * 0.2);
      const controlY2 = finalToY - (verticalDistance * 0.4);
      ctx.bezierCurveTo(controlX1, controlY1, controlX2, controlY2, finalToX, finalToY);
    } else {
      // From BOTTOM: ONLY UP
      const controlX1 = fromX + (horizontalDistance * 0.2);
      const controlY1 = fromY - (verticalDistance * 0.4);
      const controlX2 = finalToX - (horizontalDistance * 0.2);
      const controlY2 = finalToY + (verticalDistance * 0.4);
      ctx.bezierCurveTo(controlX1, controlY1, controlX2, controlY2, finalToX, finalToY);
    }

    ctx.stroke();

    tempDrag = {
      fromDot: dot,
      canvasX: finalToX,
      canvasY: finalToY,
      clientX: mouseX,
      clientY: mouseY,
    };
    console.log("TEMPDRAG NORMAL:", tempDrag);

  };

  const handleMouseUp = (upEvent) => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    document.removeEventListener("touchmove", handleMouseMove);
    document.removeEventListener("touchend", handleMouseUp);

    if (hoveredBottomDot) {
      hoveredBottomDot.classList.remove("hover-target");

      console.log("🎯 Drag ended on:", hoveredBottomDot.dataset);

      const targetWrapper = hoveredBottomDot.closest(".match-card-wrapper");

      endDrag(
        upEvent,
        hoveredBottomDot,      // the target dot
        targetWrapper          // the target wrapper
      );
    }


    isDrawing = false;
  };

  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);

  document.addEventListener("touchmove", handleMouseMove, { passive: false });
  document.addEventListener("touchend", handleMouseUp);
}

function resumeDragFrom(startX, startY, fromDot, startX0, startY0) {
  isDrawing = true;

  selectedTopDot = {
    dot: fromDot,
    cardWrapper: fromDot.closest(".match-card-wrapper"),
    side: fromDot.dataset.side
  };

  fromDot.classList.add("active");

  const canvasRect = canvas.getBoundingClientRect();
  const scale = getCurrentScale();
  let hoveredBottomDot = null;

  function handleMove(e) {
    const { x, y } = getPointerCoordinates(e);
    const toX = (x - canvasRect.left) / scale;
    const toY = (y - canvasRect.top) / scale;

    tempDrag = {
      fromDot,
      canvasX: toX,
      canvasY: toY,
      clientX: x,
      clientY: y
    };
    console.log("TEMPDRAG RESUME:", tempDrag);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawnLines.forEach(line => {
      const coords = getLineCoordinates(line.fromDot, line.toDot);
      drawLineOnCanvas(coords.fromX, coords.fromY, coords.toX, coords.toY, line.color, false);
    });


    drawLineOnCanvas(startX0, startY0, startX, startY, "#000000ff");

    const midY = (startY + toY) / 2;
    drawLineOnCanvas(startX, startY, toX, toY, "#000000ff");
  }

  function handleUp(e) {
    document.removeEventListener("mousemove", handleMove);
    document.removeEventListener("mouseup", handleUp);
    document.removeEventListener("touchmove", handleMove);
    document.removeEventListener("touchend", handleUp);

    const { x, y } = getPointerCoordinates(e);

    const targetSelector = selectedTopDot.side === "top"
      ? '.match-dot[data-side="bottom"]'
      : '.match-dot[data-side="top"]';

    const possibleTargets = document.querySelectorAll(targetSelector);
    let hovered = null;

    possibleTargets.forEach((dot) => {
      const rect = dot.getBoundingClientRect();
      const dist = Math.hypot(
        x - (rect.left + rect.width / 2),
        y - (rect.top + rect.height / 2)
      );
      if (dist < 40) hovered = dot;
    });

    if (hovered) {
      const wrapper = hovered.closest(".match-card-wrapper");
      endDrag(e, hovered, wrapper);
    }

    isDrawing = false;

    // only save tempDrag if NO dot was matched
    if (!hovered) {
      tempDrag = {
        fromDot: fromDot,
        canvasX: startX,
        canvasY: startY,
        clientX: e.clientX || (e.touches ? e.touches[0].clientX : 0),
        clientY: e.clientY || (e.touches ? e.touches[0].clientY : 0)
      };
    } else {
      tempDrag = null; // VERY IMPORTANT
    }


  }

  document.addEventListener("mousemove", handleMove);
  document.addEventListener("mouseup", handleUp);
  document.addEventListener("touchmove", handleMove, { passive: false });
  document.addEventListener("touchend", handleUp);
}

function completeMatch(topCardWrapper, topDot, bottomCardWrapper, bottomDot) {
  const topCard = topCardWrapper.querySelector(".match-card");
  const bottomCard = bottomCardWrapper.querySelector(".match-card");

  const topSide = topDot.dataset.side;
  const bottomSide = bottomDot.dataset.side;

  if (topSide === bottomSide) {
    showInvalidRowFeedback(bottomCardWrapper);
    return;
  }
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
  const existingBottomLineIndex = drawnLines.findIndex(
    (line) => line.lineData.bottomOriginalIndex === bottomOriginalIndex
  );

  if (existingBottomLineIndex !== -1) {
    const oldBottomLine = drawnLines[existingBottomLineIndex];

    oldBottomLine.lineData.topCard.classList.remove("matched");
    oldBottomLine.lineData.bottomCard.classList.remove("matched");
    oldBottomLine.lineData.topCard.dataset.matched = "false";
    oldBottomLine.lineData.bottomCard.dataset.matched = "false";

    drawnLines.splice(existingBottomLineIndex, 1);

    matchedPairs = matchedPairs.filter(
      (pair) => pair.index !== oldBottomLine.lineData.topOriginalIndex
    );
  }

  const lineData = {
    fromDot: topDot,
    toDot: bottomDot,
    isCorrect: isCorrect,
    topCardWrapper: topCardWrapper,
    bottomCardWrapper: bottomCardWrapper,
    topOriginalIndex: topOriginalIndex,
    bottomOriginalIndex: bottomOriginalIndex,
    topCard: topCard,
    bottomCard: bottomCard
  };

  const lineCoords = getLineCoordinates(topDot, bottomDot);
  drawnLines.push({
    fromDot: topDot,
    toDot: bottomDot,
    color: "#000000ff",
    dashed: false,
    lineData: lineData
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

  const startSide = selectedTopDot.side;
  const endSide = bottomDot.dataset.side;
  let topDot, bottomDotFinal, topWrapper, bottomWrapper;

  if (startSide === endSide) {
    showInvalidRowFeedback(bottomCardWrapper);

    // cancel drag cleanly
    if (selectedTopDot && selectedTopDot.dot) {
      selectedTopDot.dot.classList.remove("active");
    }
    selectedTopDot = null;
    isDrawing = false;
    return;
  }

  if (startSide === "top") {
    topDot = selectedTopDot.dot;
    topWrapper = selectedTopDot.cardWrapper;

    bottomDotFinal = bottomDot;
    bottomWrapper = bottomCardWrapper;
  } else {
    bottomDotFinal = selectedTopDot.dot;
    bottomWrapper = selectedTopDot.cardWrapper;

    topDot = bottomDot;
    topWrapper = bottomCardWrapper;
  }

  const topCard = topWrapper.querySelector(".match-card");
  const bottomCard = bottomWrapper.querySelector(".match-card");


  const topOriginalIndex = parseInt(topWrapper.dataset.originalIndex);
  const bottomOriginalIndex = parseInt(bottomWrapper.dataset.originalIndex);


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
  const existingBottomLineIndex = drawnLines.findIndex(
    (line) => line.lineData.bottomOriginalIndex === bottomOriginalIndex
  );

  if (existingBottomLineIndex !== -1) {
    const oldBottomLine = drawnLines[existingBottomLineIndex];

    oldBottomLine.lineData.topCard.classList.remove("matched");
    oldBottomLine.lineData.bottomCard.classList.remove("matched");
    oldBottomLine.lineData.topCard.dataset.matched = "false";
    oldBottomLine.lineData.bottomCard.dataset.matched = "false";

    drawnLines.splice(existingBottomLineIndex, 1);

    matchedPairs = matchedPairs.filter(
      (pair) => pair.index !== oldBottomLine.lineData.topOriginalIndex
    );
  }
  const lineData = {
    fromDot: selectedTopDot.dot,
    toDot: bottomDot,
    isCorrect: isCorrect,
    topCardWrapper: selectedTopDot.cardWrapper,
    bottomCardWrapper: bottomCardWrapper,
    topOriginalIndex: topOriginalIndex,
    bottomOriginalIndex: bottomOriginalIndex,
    topCard: topCard,
    bottomCard: bottomCard
  };


  const lineCoords = getLineCoordinates(selectedTopDot.dot, bottomDot);
  drawnLines.push({
    fromDot: selectedTopDot.dot,
    toDot: bottomDot,
    color: "#000000ff",
    dashed: false,
    lineData: lineData
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
  isDrawing = false;
}

function showInvalidRowFeedback(cardWrapper) {
  // play error sound (reset to start each time)
  try {
    errorSound.currentTime = 0;
    errorSound.play();
  } catch (e) {
    // audio play may be blocked until user interacts — ignore silently
    console.warn("Error sound play blocked", e);
  }

  // add shake class to the card wrapper (or dot) for visual feedback
  if (cardWrapper) {
    cardWrapper.classList.add("shake");
    setTimeout(() => cardWrapper.classList.remove("shake"), 350);
  }

  // small vibration on mobile if supported
  if (navigator.vibrate) {
    navigator.vibrate(80);
  }

  // clear any incomplete temporary drawing so canvas doesn't stay stuck
  if (ctx && canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    redrawAllLines();
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

function drawLineOnCanvas(fromX, fromY, toX, toY, color, dashed, fromSide = "top") {
  if (!ctx) return;

  ctx.strokeStyle = color || "#000000ff";
  ctx.lineWidth = 5;

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);

  if (fromSide === "top") {
    // From TOP dot: ONLY go DOWN - never up or horizontal
    const verticalDistance = Math.abs(toY - fromY);
    const horizontalDistance = Math.abs(toX - fromX);

    const controlX1 = fromX + (horizontalDistance * 0.2);
    const controlY1 = fromY + (verticalDistance * 0.4);
    const controlX2 = toX - (horizontalDistance * 0.2);
    const controlY2 = toY - (verticalDistance * 0.4);

    ctx.bezierCurveTo(controlX1, controlY1, controlX2, controlY2, toX, toY);
  } else {
    // From BOTTOM dot: ONLY go UP - never down or horizontal
    const verticalDistance = Math.abs(toY - fromY);
    const horizontalDistance = Math.abs(toX - fromX);

    const controlX1 = fromX + (horizontalDistance * 0.2);
    const controlY1 = fromY - (verticalDistance * 0.4);
    const controlX2 = toX - (horizontalDistance * 0.2);
    const controlY2 = toY + (verticalDistance * 0.4);

    ctx.bezierCurveTo(controlX1, controlY1, controlX2, controlY2, toX, toY);
  }

  ctx.stroke();
}

function redrawAllLines() {
  if (!ctx || !canvas) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawnLines.forEach((line) => {
    const coords = getLineCoordinates(line.fromDot, line.toDot);
    const fromSide = line.fromDot.dataset.side;
    drawLineOnCanvas(coords.fromX, coords.fromY, coords.toX, coords.toY, line.color, false, fromSide);
  });
}

function restartIncompleteDrag() {
  if (!tempDrag || !tempDrag.fromDot) return;

  const fromRect = tempDrag.fromDot.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();
  const scale = getCurrentScale();

  const startX0 =
    (fromRect.left - canvasRect.left) / scale + fromRect.width / 2 / scale;
  const startY0 =
    (fromRect.top - canvasRect.top) / scale + fromRect.height / 2 / scale;

  resumeDragFrom(
    tempDrag.canvasX,  // drag end X
    tempDrag.canvasY,  // drag end Y
    tempDrag.fromDot,  // original starting dot
    startX0,           // true original X
    startY0            // true original Y
  );
}

function detectClosestDot(e) {
  const { x, y } = getPointerCoordinates(e);
  let closest = null;
  let minDist = 9999;

  document.querySelectorAll(".match-dot").forEach(dot => {
    const rect = dot.getBoundingClientRect();
    const dx = x - (rect.left + rect.width / 2);
    const dy = y - (rect.top + rect.height / 2);
    const dist = Math.hypot(dx, dy);

    if (dist < 40 && dist < minDist) {
      closest = dot;
      minDist = dist;
    }
  });

  return closest;
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
    const fromSide = lineData.fromDot.dataset.side;
    drawLineOnCanvas(
      coords.fromX,
      coords.fromY,
      coords.toX,
      coords.toY,
      color,
      false,
      fromSide
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

  if (correctCount === 0) {
    box.innerHTML = `
      <h2 class="retry-title">Minimum Score Not Met</h2>
      <p class="retry-text">You haven't got any correct answers. Please try again!</p>
      <div class="retry-buttons">
        <button id="retry-zero-btn" class="retry-btn retry-yes">Try Again</button>
      </div>
    `;

    modal.appendChild(box);
    document.body.appendChild(modal);

    document.getElementById("retry-zero-btn").onclick = () => {
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
  else if (correctCount < totalQuestions) {
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
  else {
    showSuccessModal();
  }
}

function clearCanvas() {
  if (canvas && ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function updateProgressBar(totalPairs) {
  const progressBar = document.getElementById("progress-bar");
  const matchedCount = drawnLines.length;
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
  if (canvas && ctx) {
    setTimeout(() => redrawAllLines(), 50);
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

window.addEventListener("resize", () => {
  adjustScaleForIframe();
  setTimeout(() => redrawAllLines(), 50);
});
