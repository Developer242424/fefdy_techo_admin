// let publicURL = "https://demoadmin.fefdybraingym.com/public/";
let publicURL = "http://localhost:5001/";
let partsdrag_questions = [];
let questionsLoaded = false;
let questionIds = "";
let timerInterval;
let elapsedTime = 0;

// Drag and drop variables
let draggedElement = null;
let offsetX = 0;
let offsetY = 0;
const SNAP_DISTANCE = 60;
let placedAnswers = new Map();
let originalPositions = new Map();
let dragStartPosition = null;
let totalDropzones = 0;
let wrongAnswerIds = [];
let isRetryMode = false;
let validationResult = null;
const successSound = new Audio("/choose/success.wav");
let finalScore = null;
let finalTime = null;
let firstAttemptDone = false;
let currentScale = 1;

// ============================================================================
// HELPER FUNCTIONS FOR SCALE MANAGEMENT
// ============================================================================
function getScaleFromWrapper() {
  const wrapper = document.querySelector(".iframe-scale-wrapper");
  if (!wrapper) return 1;
  const transform = wrapper.style.transform;
  const match = transform.match(/scale\(([\d.]+)\)/);
  return match ? parseFloat(match[1]) : 1;
}

function updateCurrentScale() {
  currentScale = getScaleFromWrapper();
}

// ============================================================================
// FETCH QUESTIONS
// ============================================================================
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
    url: "/admin/activity/questions/parts-drag/get",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify(data),
    success: function (res) {
      if (Array.isArray(res)) {
        console.log("res", res);
        partsdrag_questions = res;
        questionsLoaded = true;
        userAnswers = new Array(partsdrag_questions.length).fill(null);
        userAnswers[0] = [];
        if (typeof callback === "function") callback();
        questionIds = partsdrag_questions[0].questionid;
      } else {
        console.warn("⚠️  Invalid question data received.");
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
  fetchQuestions(() => {
    loadQuestion();
  });
};

// ============================================================================
// LOAD QUESTION
// ============================================================================
function loadQuestion() {
  const container = document.getElementById("partsdrag-container");
  container.innerHTML = partsdrag_questions[1].html.data;
  setTimeout(() => {
    initializeDragAndDrop();
  }, 100);
}

// ============================================================================
// INITIALIZE DRAG AND DROP
// ============================================================================
function initializeDragAndDrop() {
  updateCurrentScale();

  const answerElements = document.querySelectorAll(".answer-element");
  const dropzones = document.querySelectorAll(".dropzone");

  totalDropzones = dropzones.length;

  answerElements.forEach((element) => {
    const rect = element.getBoundingClientRect();
    originalPositions.set(element, {
      left: element.style.left,
      top: element.style.top,
      position: element.style.position || "absolute",
    });
  });

  answerElements.forEach((element) => {
    element.style.cursor = "grab";
    element.addEventListener("mousedown", onAnswerMouseDown);
    element.addEventListener("touchstart", onAnswerTouchStart);
  });

  // addSubmitButtonListener();
  updateProgressBar(dropzones.length);
}

// ============================================================================
// MOUSE DOWN - DESKTOP DRAG START
// ============================================================================
function onAnswerMouseDown(e) {
  e.preventDefault();
  draggedElement = e.target.closest(".answer-element");
  if (!draggedElement) return;

  updateCurrentScale();
  const rect = draggedElement.getBoundingClientRect();
  // Adjust offset based on scale
  offsetX = (e.clientX - rect.left) / currentScale;
  offsetY = (e.clientY - rect.top) / currentScale;
  dragStartPosition = { x: rect.left, y: rect.top };

  draggedElement.style.cursor = "grabbing";
  draggedElement.style.opacity = "0.8";
  draggedElement.style.zIndex = "10000";
  draggedElement.style.position = "fixed";

  document.addEventListener("mousemove", onDragMove);
  document.addEventListener("mouseup", onDragEnd);
}

// ============================================================================
// TOUCH START - MOBILE DRAG START
// ============================================================================
function onAnswerTouchStart(e) {
  const touch = e.touches[0];
  draggedElement = e.target.closest(".answer-element");
  if (!draggedElement) return;

  updateCurrentScale();

  const rect = draggedElement.getBoundingClientRect();
  offsetX = (touch.clientX - rect.left) / currentScale;
  offsetY = (touch.clientY - rect.top) / currentScale;
  dragStartPosition = { x: rect.left, y: rect.top };

  draggedElement.style.opacity = "0.8";
  draggedElement.style.zIndex = "10000";
  draggedElement.style.position = "fixed";

  document.addEventListener("touchmove", onDragTouchMove, { passive: false });
  document.addEventListener("touchend", onDragTouchEnd);
}

// ============================================================================
// MOUSE MOVE - DESKTOP DRAG
// ============================================================================
function onDragMove(e) {
  if (!draggedElement) return;
  draggedElement.style.left = e.clientX / currentScale - offsetX + "px";
  draggedElement.style.top = e.clientY / currentScale - offsetY + "px";
  checkNearestDropzone(e.clientX / currentScale, e.clientY / currentScale);
}

// ============================================================================
// TOUCH MOVE - MOBILE DRAG
// ============================================================================
function onDragTouchMove(e) {
  if (!draggedElement) return;
  e.preventDefault();
  const touch = e.touches[0];
  draggedElement.style.left = touch.clientX / currentScale - offsetX + "px";
  draggedElement.style.top = touch.clientY / currentScale - offsetY + "px";
  checkNearestDropzone(
    touch.clientX / currentScale,
    touch.clientY / currentScale
  );
}

// ============================================================================
// CHECK NEAREST DROPZONE - SCALE AWARE
// ============================================================================
function checkNearestDropzone(clientX, clientY) {
  const dropzones = document.querySelectorAll(".dropzone");
  let nearest = null;
  let minDistance = SNAP_DISTANCE;

  dropzones.forEach((zone) => {
    if (
      isDropzoneOccupied(zone) &&
      zone.dataset.zoneName !== draggedElement.dataset.placedZone
    ) {
      return;
    }

    const zoneRect = zone.getBoundingClientRect();
    const zoneCenterX =
      zoneRect.left / currentScale + zoneRect.width / currentScale / 2;
    const zoneCenterY =
      zoneRect.top / currentScale + zoneRect.height / currentScale / 2;

    const distance = Math.sqrt(
      Math.pow(clientX - zoneCenterX, 2) + Math.pow(clientY - zoneCenterY, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = zone;
    }
  });

  dropzones.forEach((zone) => {
    zone.classList.remove("snap-highlight");
  });

  if (nearest) {
    nearest.classList.add("snap-highlight");
  }
}

// ============================================================================
// MOUSE UP - DESKTOP DRAG END
// ============================================================================
function onDragEnd(e) {
  if (!draggedElement) return;
  document.removeEventListener("mousemove", onDragMove);
  document.removeEventListener("mouseup", onDragEnd);
  snapToDrozoneOrReturn();
  draggedElement = null;
}

// ============================================================================
// TOUCH END - MOBILE DRAG END
// ============================================================================
function onDragTouchEnd(e) {
  if (!draggedElement) return;
  document.removeEventListener("touchmove", onDragTouchMove);
  document.removeEventListener("touchend", onDragTouchEnd);
  snapToDrozoneOrReturn();
  draggedElement = null;
}

// ============================================================================
// SNAP TO DROPZONE OR RETURN - SCALE AWARE
// ============================================================================
function snapToDrozoneOrReturn() {
  const dragRect = draggedElement.getBoundingClientRect();
  const dragCenterX =
    dragRect.left / currentScale + dragRect.width / currentScale / 2;
  const dragCenterY =
    dragRect.top / currentScale + dragRect.height / currentScale / 2;

  const dropzones = document.querySelectorAll(".dropzone");
  let snappedZone = null;

  for (let zone of dropzones) {
    if (
      isDropzoneOccupied(zone) &&
      zone.dataset.zoneName !== draggedElement.dataset.placedZone
    ) {
      continue;
    }

    const zoneRect = zone.getBoundingClientRect();
    const zoneCenterX =
      zoneRect.left / currentScale + zoneRect.width / currentScale / 2;
    const zoneCenterY =
      zoneRect.top / currentScale + zoneRect.height / currentScale / 2;

    const distance = Math.sqrt(
      Math.pow(dragCenterX - zoneCenterX, 2) +
        Math.pow(dragCenterY - zoneCenterY, 2)
    );

    if (distance < SNAP_DISTANCE) {
      snappedZone = zone;
      break;
    }
  }

  dropzones.forEach((zone) => {
    zone.classList.remove("snap-highlight");
  });

  if (snappedZone) {
    const zoneRect = snappedZone.getBoundingClientRect();
    const zoneCenterX =
      zoneRect.left / currentScale + zoneRect.width / currentScale / 2;
    const zoneCenterY =
      zoneRect.top / currentScale + zoneRect.height / currentScale / 2;

    if (
      isDropzoneOccupied(snappedZone) &&
      snappedZone.dataset.zoneName !== draggedElement.dataset.placedZone
    ) {
      const previousElement = placedAnswers.get(snappedZone.dataset.zoneName);
      if (previousElement) {
        previousElement.dataset.placedZone = "";
        previousElement.classList.remove("placed");
        previousElement.style.position = "absolute";
        previousElement.style.zIndex = "auto";
        previousElement.style.left =
          originalPositions.get(previousElement).left;
        previousElement.style.top = originalPositions.get(previousElement).top;
      }
    }

    if (
      draggedElement.dataset.placedZone &&
      draggedElement.dataset.placedZone !== snappedZone.dataset.zoneName
    ) {
      const oldZone = document.querySelector(
        `[data-zone-name="${draggedElement.dataset.placedZone}"]`
      );
      if (oldZone) {
        oldZone.classList.remove("filled");
        placedAnswers.delete(oldZone.dataset.zoneName);
      }
    }

    draggedElement.style.left =
      zoneCenterX * currentScale - draggedElement.offsetWidth / 2 + "px";
    draggedElement.style.top =
      zoneCenterY * currentScale - draggedElement.offsetHeight / 2 + "px";
    draggedElement.style.position = "fixed";
    draggedElement.dataset.placedZone = snappedZone.dataset.zoneName;
    draggedElement.classList.add("placed");
    snappedZone.classList.add("filled");

    placedAnswers.set(snappedZone.dataset.zoneName, draggedElement);
  } else {
    returnToOriginalPosition();
  }

  draggedElement.style.opacity = "1";
  draggedElement.style.cursor = "grab";

  updateProgressBar(totalDropzones);
  checkIfAllAnswersPlaced();
}

// ============================================================================
// RETURN TO ORIGINAL POSITION
// ============================================================================
function returnToOriginalPosition() {
  for (let [zoneName, element] of placedAnswers.entries()) {
    if (element === draggedElement) {
      placedAnswers.delete(zoneName);
      const zone = document.querySelector(`[data-zone-name="${zoneName}"]`);
      if (zone) {
        zone.classList.remove("filled");
      }
      break;
    }
  }

  draggedElement.classList.remove("placed");
  draggedElement.dataset.placedZone = "";

  draggedElement.style.position = "absolute";
  draggedElement.style.zIndex = "auto";
  draggedElement.style.left = originalPositions.get(draggedElement).left;
  draggedElement.style.top = originalPositions.get(draggedElement).top;
  checkIfAllAnswersPlaced();
}

// ============================================================================
// CHECK IF DROPZONE IS OCCUPIED
// ============================================================================
function isDropzoneOccupied(zone) {
  const zoneName = zone.dataset.zoneName;
  return placedAnswers.has(zoneName);
}

// ============================================================================
// START GAME
// ============================================================================
function startGame() {
  document.getElementById("start-modal").style.display = "none";
  document.getElementById("drag-container").style.display = "flex";

  elapsedTime = 0;
  totalScore = 0;
  matchedPairs = [];
  allDroppedCards = [];
  wrongCardIds = [];
  isRetryMode = false;
  placedAnswers.clear();
  originalPositions.clear();

  startTimer();
  loadQuestion();
}

// ============================================================================
// TIMER FUNCTIONS
// ============================================================================
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

// ============================================================================
// UPDATE PROGRESS BAR
// ============================================================================
function updateProgressBar(totalPairs) {
  const progressBar = document.getElementById("progress-bar");
  const matchedCount = placedAnswers.size;
  const percentage = (matchedCount / totalPairs) * 100;
  progressBar.style.width = percentage + "%";

  if (percentage === 100) {
    progressBar.classList.add("complete");
  } else {
    progressBar.classList.remove("complete");
  }
}

// ============================================================================
// CHECK IF ALL ANSWERS PLACED
// ============================================================================
function checkIfAllAnswersPlaced() {
  const placedCount = placedAnswers.size;
  const totalZones = totalDropzones;
  if (placedCount === totalZones && totalZones > 0) {
    setTimeout(() => {
      onSubmitAnswers();
    }, 500);
  }
}

// ============================================================================
// SUBMIT ANSWERS
// ============================================================================
function onSubmitAnswers() {
  stopTimer();

  const result = validateAnswers();
  validationResult = result;

  setTimeout(() => {
    if (isRetryMode && result.correctCount > 0) {
      showStartAgainModal(result.correctCount, result.totalCount);
    } else {
      showRetryModal(result.correctCount, result.totalCount);
    }
  }, 2000);
}

// ============================================================================
// VALIDATE ANSWERS
// ============================================================================
function validateAnswers() {
  const answerElements = document.querySelectorAll(".answer-element");
  let correctCount = 0;
  let totalCount = 0;
  let wrongIds = [];

  answerElements.forEach((element) => {
    const zoneName = element.dataset.placedZone;

    if (zoneName) {
      totalCount++;
      const dropzone = document.querySelector(`[data-zone-name="${zoneName}"]`);

      if (dropzone) {
        const elementId = element.dataset.elementId.toLowerCase();
        const zoneValue = dropzone.dataset.zoneValue.toLowerCase();

        if (elementId === zoneValue) {
          element.classList.remove("wrong-answer");
          element.classList.add("correct-answer");
          correctCount++;
        } else {
          element.classList.add("wrong-answer");
          element.classList.remove("correct-answer");
          wrongIds.push(elementId);
        }
      }
    }
  });

  if (correctCount === 0) {
    totalScore = correctCount;
  } else if (!firstAttemptDone) {
    totalScore = correctCount;
    finalScore = correctCount;
    finalTime = elapsedTime;
    firstAttemptDone = true;
  } else {
    totalScore = finalScore;
    elapsedTime = finalTime;
  }

  wrongAnswerIds = wrongIds;

  return { correctCount, totalCount };
}

// ============================================================================
// RESET FOR RETRY
// ============================================================================
function resetForRetry() {
  isRetryMode = true;

  const answerElements = document.querySelectorAll(".answer-element");

  answerElements.forEach((el) => {
    const isCorrect = el.classList.contains("correct-answer");

    if (isCorrect) {
    } else {
      el.classList.remove("wrong-answer", "placed");
      el.dataset.placedZone = "";
      el.style.position = "absolute";
      el.style.zIndex = "auto";

      if (originalPositions.has(el)) {
        const pos = originalPositions.get(el);
        el.style.left = pos.left;
        el.style.top = pos.top;
      }
    }
  });

  const wrongAnswerKeys = Array.from(placedAnswers.entries())
    .filter(([zone, element]) => !element.classList.contains("correct-answer"))
    .map(([zone]) => zone);

  wrongAnswerKeys.forEach((zone) => {
    placedAnswers.delete(zone);

    const dropzone = document.querySelector(`[data-zone-name="${zone}"]`);
    if (dropzone) {
      dropzone.classList.remove("filled");
    }
  });

  updateProgressBar(totalDropzones);
  startTimer();
}

// ============================================================================
// SHOW RETRY MODAL
// ============================================================================
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
      resetForRetry();
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
      resetForRetry();
    };
  } else {
    showSuccessModal();
  }
}

// ============================================================================
// SHOW START AGAIN MODAL
// ============================================================================
function showStartAgainModal(correctCount, totalQuestions) {
  const modal = document.createElement("div");
  modal.id = "start-again-modal";
  modal.classList.add("retry-modal");

  const box = document.createElement("div");
  box.classList.add("retry-modal-box");

  box.innerHTML = `
    <h2 class="retry-title">Do you want to start again?</h2>
    <div class="retry-buttons">
      <button id="start-again-no-btn" class="retry-btn retry-no">No</button>
      <button id="start-again-yes-btn" class="retry-btn retry-yes">Yes</button>
    </div>
  `;

  modal.appendChild(box);
  document.body.appendChild(modal);

  document.getElementById("start-again-no-btn").onclick = () => {
    modal.remove();
    showSuccessModal();
  };

  document.getElementById("start-again-yes-btn").onclick = () => {
    modal.remove();

    wrongAnswerIds = [];
    isRetryMode = false;
    totalScore = 0;
    finalScore = null;
    finalTime = null;
    firstAttemptDone = false;
    elapsedTime = 0;
    matchedPairs = [];
    allDroppedCards = [];
    placedAnswers.clear();
    originalPositions.clear();

    document.querySelectorAll(".answer-element").forEach((el) => {
      el.classList.remove("correct-answer", "wrong-answer");
    });

    document.querySelectorAll(".dropzone").forEach((zone) => {
      zone.classList.remove("filled");
    });

    stopTimer();
    startTimer();

    const progressBar = document.getElementById("progress-bar");
    if (progressBar) {
      progressBar.style.width = "0%";
      progressBar.classList.remove("complete");
    }

    loadQuestion();
  };
}

// ============================================================================
// SHOW SUCCESS MODAL
// ============================================================================
function showSuccessModal() {
  if (typeof successSound !== "undefined") {
    successSound.currentTime = 0;
    successSound.play();
  }

  const modal = document.getElementById("success-modal");
  const scoreDisplay = document.getElementById("score-display");
  const timeDisplay = document.getElementById("time-display");

  if (!modal) {
    return;
  }

  if (scoreDisplay) scoreDisplay.textContent = `${totalScore} points`;

  if (timeDisplay) {
    const minutes = Math.floor(elapsedTime / 60);
    const seconds = elapsedTime % 60;
    timeDisplay.textContent = `Time taken: ${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  }

  modal.classList.add("show");
  modal.style.display = "flex";

  const replayBtn = document.getElementById("replay-btn");

  if (replayBtn) {
    replayBtn.onclick = () => {
      modal.classList.remove("show");
      modal.style.display = "none";
      totalScore = 0;
      currentQuestionIndex = 0;
      elapsedTime = 0;
      matchedPairs = [];
      drawnLines = [];
      wrongAnswerIds = [];
      isRetryMode = false;
      finalScore = null;
      finalTime = null;
      firstAttemptDone = false;
      placedAnswers.clear();
      originalPositions.clear();

      document.querySelectorAll(".answer-element").forEach((el) => {
        el.classList.remove("correct-answer", "wrong-answer");
      });

      document.querySelectorAll(".dropzone").forEach((zone) => {
        zone.classList.remove("filled");
      });

      stopTimer();
      startTimer();

      const progressBar = document.getElementById("progress-bar");
      if (progressBar) {
        progressBar.style.width = "0%";
        progressBar.classList.remove("complete");
      }

      loadQuestion();
    };
  }
}

// ============================================================================
// SCALE CHANGE TRACKING
// ============================================================================
let lastKnownScale = 1;
let scaleChangeTimeout = null;
let lastKnownViewportWidth = window.innerWidth;
let lastKnownViewportHeight = window.innerHeight;

// ============================================================================
// RECALCULATE DROPPED ELEMENTS POSITIONS - WHEN SCALE CHANGES
// ============================================================================
function recalculateDroppedElementsPositions() {
  if (placedAnswers.size === 0) {
    return;
  }

  for (let [zoneName, element] of placedAnswers.entries()) {
    const dropzone = document.querySelector(`[data-zone-name="${zoneName}"]`);
    if (!dropzone) {
      continue;
    }

    const zoneRect = dropzone.getBoundingClientRect();

    const zoneCenterX =
      zoneRect.left / currentScale + zoneRect.width / currentScale / 2;
    const zoneCenterY =
      zoneRect.top / currentScale + zoneRect.height / currentScale / 2;

    const newLeft = zoneCenterX * currentScale - element.offsetWidth / 2;
    const newTop = zoneCenterY * currentScale - element.offsetHeight / 2;

    element.style.left = newLeft + "px";
    element.style.top = newTop + "px";
  }
}

function handleScaleChange() {
  if (scaleChangeTimeout) {
    clearTimeout(scaleChangeTimeout);
  }

  scaleChangeTimeout = setTimeout(() => {
    recalculateDroppedElementsPositions();
    lastKnownScale = currentScale;
    scaleChangeTimeout = null;
  }, 0);
}

// ============================================================================
// ADJUST SCALE FOR IFRAME - UPDATED WITH DETECTION & RECALCULATION
// ============================================================================
function adjustScaleForIframe() {
  const wrapper = document.querySelector(".iframe-scale-wrapper");
  if (!wrapper) {
    console.warn(".iframe-scale-wrapper not found!");
    return;
  }

  const currentViewportWidth = window.innerWidth;
  const currentViewportHeight = window.innerHeight;
  const viewportChanged =
    currentViewportWidth !== lastKnownViewportWidth ||
    currentViewportHeight !== lastKnownViewportHeight;

  if (viewportChanged) {
    lastKnownViewportWidth = currentViewportWidth;
    lastKnownViewportHeight = currentViewportHeight;
    handleScaleChange();
  }
  const insideIframe = window.self !== window.top;

  if (insideIframe) {
    document.body.classList.add("inside-iframe");
  } else {
    document.body.classList.remove("inside-iframe");
  }

  updateCurrentScale();
}

window.addEventListener("load", () => {
  adjustScaleForIframe();
  lastKnownScale = currentScale;
  lastKnownViewportWidth = window.innerWidth;
  lastKnownViewportHeight = window.innerHeight;
});

window.addEventListener("resize", () => {
  adjustScaleForIframe();
});

function completeTest() {
  //   console.log("currentQuestionIndex", currentQuestionIndex);
  //   console.log("timerInterval", timerInterval);
  //   console.log("totalScore", totalScore);
  //   console.log("matchedPairs", matchedPairs);
  // console.log("wrongAnswerIds", wrongAnswerIds);
  const params = new URLSearchParams(window.location.search);
  const sid = params.get("sid");
  const tid = params.get("tid");
  const lid = params.get("lid");
  const stid = params.get("stid");
  const qid = params.get("qid");
  const ust = params.get("ust");

  const ttl_questions = matchedPairs.length;
  const wrong_answer = wrongAnswerIds.length;

  const data = {
    sid,
    tid,
    lid,
    stid,
    qid,
    ust,
    correctAnswers: totalScore,
    wrongAnswers: wrong_answer > 0 ? wrong_answer : 0,
    totalTime: elapsedTime,
    questionIds,
  };

  console.log("Submitting data:", data);

  $.ajax({
    url: "/admin/activity/questions/history",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify(data),
    success: function (res) {
      if (res.status === 200) {
        const is_correct = wrong_answer === 0 ? 0 : 1;
        storeSeparateEntries(
          partsdrag_questions[0].question.text,
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
