// const dragDropQuestion = [
//     {
//         "question": "Sort the wild and domestic animals."
//     },
//     {
//         "name": "WILD ANIMALS",
//         "images": [
//             "/dragdrop/elephant.png",
//             "/dragdrop/lion.png",
//             // "/dragdrop/zebra.png",
//             // "/dragdrop/monkey.png",
//             // "/dragdrop/tiger.png"
//         ]
//     },
//     {
//         "name": "DOMESTIC ANIMALS",
//         "images": [
//             "/dragdrop/cow.png",
//             "/dragdrop/cat.png",
//             // "/dragdrop/dog.png",
//             // "/dragdrop/hen.png",
//             // "/dragdrop/sheep.png"
//         ]
//     }
// ];

let publicURL = "http://localhost:5001/";
let dragDropQuestion = [];
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

  const data = { sid, tid, lid, stid, qid, ust };

  $.ajax({
    url: "/admin/activity/questions/drag-drop/get",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify(data),
    success: function (res) {
      if (Array.isArray(res)) {
        dragDropQuestion = res;
        // console.log("✅ Questions loaded:", categories);
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

let questionTextData = "";
let elapsedTime = 0;
let totalScore = 0;
let matchedPairs = [];
let allDroppedCards = [];
let timerInterval;
let draggedCard = null;
let draggedElement = null;
let ghostElement = null;

window.onload = () => {
  fetchQuestions(() => {
    loadQuestion();
  });
};

function createGhostElement(imageUrl) {
  const ghost = document.createElement("img");
  ghost.src = imageUrl;
  ghost.style.cssText = `
        width: 100px;
        height: 100px;
        object-fit: contain;
        opacity: 0.8;
        filter: drop-shadow(0 5px 15px rgba(0,0,0,0.3));
    `;
  return ghost;
}

function loadQuestion() {
  const questionContainer = document.querySelector(".question-drag");
  const optionsContainer = document.querySelector(".drag-options");

  questionTextData = dragDropQuestion[0].question;
  const categoriesData = dragDropQuestion.slice(1);

  questionContainer.innerHTML = "";
  optionsContainer.innerHTML = "";
  matchedPairs = [];
  allDroppedCards = [];

  // Question
  const questionText = document.createElement("div");
  questionText.classList.add("question-text");
  questionText.onmouseover = () => playSpeech(questionTextData);
  questionText.textContent = questionTextData;
  questionContainer.appendChild(questionText);

  // Main layout: left side (categories) + right side (floating cards)
  const mainLayout = document.createElement("div");
  mainLayout.classList.add("game-layout");

  // Left side: Category boxes
  const leftSide = document.createElement("div");
  leftSide.classList.add("categories-side");

  categoriesData.forEach((category, index) => {
    const categoryBox = document.createElement("div");
    categoryBox.classList.add("category-box");
    categoryBox.dataset.categoryIndex = index;

    const categoryTitle = document.createElement("div");
    categoryTitle.classList.add("category-title");
    categoryTitle.onmouseover = () => playSpeech(category.name);
    categoryTitle.textContent = category.name;

    const dropZone = document.createElement("div");
    dropZone.classList.add("drop-zone");
    dropZone.dataset.categoryIndex = index;
    dropZone.style.cssText = `
            position: relative;
            width: 100%;
            height: 250px;
            overflow: hidden;
        `;

    dropZone.addEventListener("dragover", handleDragOver);
    dropZone.addEventListener("dragleave", handleDragLeave);
    dropZone.addEventListener("drop", (e) => handleDrop(e, index));

    categoryBox.appendChild(categoryTitle);
    categoryBox.appendChild(dropZone);
    leftSide.appendChild(categoryBox);
  });

  // Right side: Floating cards
  const rightSide = document.createElement("div");
  rightSide.classList.add("cards-side");

  const allCards = categoriesData.flatMap((category, catIdx) =>
    category.images.map((img, imgIdx) => ({
      id: `${catIdx}-${imgIdx}`,
      image: publicURL + img,
      category: catIdx,
      categoryName: category.name,
    }))
  );

  const cardsContainer = document.createElement("div");
  cardsContainer.classList.add("floating-cards");

  allCards.forEach((card, index) => {
    const cardElement = document.createElement("div");
    cardElement.classList.add("floating-card");
    cardElement.draggable = true;
    cardElement.dataset.cardId = card.id;
    cardElement.dataset.category = card.category;
    cardElement.dataset.index = index % 10;

    const img = document.createElement("img");
    img.src = card.image;
    img.alt = `Card ${index + 1}`;

    cardElement.appendChild(img);

    cardElement.addEventListener("dragstart", (e) => {
      draggedCard = card;
      draggedElement = cardElement;

      if (ghostElement) ghostElement.remove();

      ghostElement = createGhostElement(card.image);

      // FIX: ghost must be in DOM
      ghostElement.style.position = "absolute";
      ghostElement.style.top = "-9999px";
      ghostElement.style.left = "-9999px";
      document.body.appendChild(ghostElement);

      // Use custom ghost image
      e.dataTransfer.setDragImage(ghostElement, 25, 25);

      cardElement.classList.add("dragging");
      cardElement.style.opacity = "0.5";
    });

    cardElement.addEventListener("dragend", () => {
      cardElement.classList.remove("dragging");
      cardElement.style.opacity = "1";

      if (ghostElement) {
        ghostElement.remove();
        ghostElement = null;
      }
    });

    cardsContainer.appendChild(cardElement);
  });

  rightSide.appendChild(cardsContainer);

  mainLayout.appendChild(leftSide);
  mainLayout.appendChild(rightSide);
  optionsContainer.appendChild(mainLayout);

  updateProgressBar(allCards.length);
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "copy";
  e.currentTarget.classList.add("drag-over");
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove("drag-over");
}

function handleDrop(e, categoryIndex) {
  e.preventDefault();
  e.currentTarget.classList.remove("drag-over");

  console.log("handleDrop called", draggedCard, draggedElement);

  // Remove ghost element
  if (ghostElement) {
    ghostElement.remove();
    ghostElement = null;
  }

  if (!draggedCard || !draggedElement) return;

  // Store dropped card info
  allDroppedCards.push({
    cardId: draggedCard.id,
    card: draggedCard,
    droppedCategory: categoryIndex,
    correctCategory: draggedCard.category,
    isCorrect: draggedCard.category === categoryIndex,
  });

  console.log(
    "Card dropped:",
    draggedCard.id,
    "All dropped cards:",
    allDroppedCards
  );

  const dropZone = e.currentTarget;
  const cardClone = document.createElement("div");
  cardClone.classList.add("dropped-card");
  cardClone.style.position = "absolute";

  const droppedCardsInZone = dropZone.querySelectorAll(".dropped-card").length;

  const maxX = dropZone.offsetWidth - 100;
  const maxY = dropZone.offsetHeight - 80;

  const randomX = Math.random() * maxX;
  const randomY = Math.random() * maxY;
  const randomRotation = (Math.random() - 0.5) * 15;
  const zIndex = droppedCardsInZone;

  cardClone.style.left = randomX + "px";
  cardClone.style.top = randomY + "px";
  cardClone.style.zIndex = zIndex;
  cardClone.style.transform = `rotate(${randomRotation}deg)`;

  const img = document.createElement("img");
  img.src = draggedCard.image;
  img.alt = "Dropped card";

  cardClone.appendChild(img);
  dropZone.appendChild(cardClone);

  const cardToRemove = draggedElement;
  cardToRemove.style.transition = "all 0.3s ease-out";
  cardToRemove.style.opacity = "0";
  cardToRemove.style.transform = "scale(0.5)";
  cardToRemove.style.pointerEvents = "none";
  cardToRemove.draggable = false;

  setTimeout(() => {
    cardToRemove.style.animation = "none";
    cardToRemove.remove();
    console.log("Card removed from DOM");

    const remainingCards = document.querySelectorAll(".floating-card").length;
    console.log("Remaining cards:", remainingCards);
    if (remainingCards === 0) {
      console.log("All cards removed, validating answers");
      stopTimer();
      totalScore = allDroppedCards.filter((c) => c.isCorrect).length;
      setTimeout(() => validateAnswers(), 500);
    }
  }, 300);

  matchedPairs.push({
    cardId: draggedCard.id,
    category: categoryIndex,
  });

  updateProgressBar(
    document.querySelectorAll('.floating-card:not([style*="animation: none"])')
      .length
  );

  draggedCard = null;
  draggedElement = null;
}

function validateAnswers() {
  console.log("validateAnswers called");
  const wrongCards = allDroppedCards.filter((card) => !card.isCorrect);

  console.log("Wrong cards:", wrongCards);
  if (wrongCards.length === 0) {
    console.log("All answers correct!");
    showSuccessModal();
  } else {
    console.log("Showing wrong answers modal");
    showWrongAnswersModal(wrongCards);
  }
}

function showWrongAnswersModal(wrongCards) {
  const optionsContainer = document.querySelector(".drag-options");
  const mainLayout = optionsContainer.querySelector(".game-layout");

  mainLayout.style.display = "none";

  const categoriesData = dragDropQuestion.slice(1);

  const wrongAnswersContainer = document.createElement("div");
  wrongAnswersContainer.classList.add("wrong-answers-container");

  const cardsByDroppedCategory = {};
  categoriesData.forEach((_, idx) => {
    cardsByDroppedCategory[idx] = [];
  });

  allDroppedCards.forEach((droppedCard) => {
    cardsByDroppedCategory[droppedCard.droppedCategory].push(droppedCard);
  });

  categoriesData.forEach((category, categoryIndex) => {
    const categorySection = document.createElement("div");
    categorySection.classList.add("wrong-category-section");

    const categoryTitle = document.createElement("div");
    categoryTitle.classList.add("wrong-category-title");
    categoryTitle.textContent = category.name;
    categorySection.appendChild(categoryTitle);

    const cardsGrid = document.createElement("div");
    cardsGrid.classList.add("wrong-cards-grid");

    const cardsInCategory = cardsByDroppedCategory[categoryIndex];

    if (cardsInCategory.length === 0) {
      const emptyText = document.createElement("div");
      emptyText.classList.add("wrong-empty-text");
      emptyText.textContent = "No cards dropped here";
      cardsGrid.appendChild(emptyText);
    } else {
      cardsInCategory.forEach((droppedCard) => {
        const cardDiv = document.createElement("div");
        const isWrong = !droppedCard.isCorrect;

        cardDiv.classList.add("wrong-card");
        if (isWrong) cardDiv.classList.add("wrong-card-incorrect");

        const img = document.createElement("img");
        img.src = droppedCard.card.image;
        img.alt = "Card";
        img.classList.add("wrong-card-image");

        cardDiv.appendChild(img);

        if (isWrong) {
          const wrongIndicator = document.createElement("div");
          wrongIndicator.classList.add("wrong-indicator");
          cardDiv.appendChild(wrongIndicator);

          const correctCategory = document.createElement("div");
          correctCategory.classList.add("wrong-hint");
          correctCategory.textContent = `Should be: ${
            dragDropQuestion.slice(1)[droppedCard.correctCategory].name
          }`;
          cardDiv.appendChild(correctCategory);
        } else {
          const correctIndicator = document.createElement("div");
          correctIndicator.classList.add("correct-indicator");
          cardDiv.appendChild(correctIndicator);
        }

        cardsGrid.appendChild(cardDiv);
      });
    }

    categorySection.appendChild(cardsGrid);
    wrongAnswersContainer.appendChild(categorySection);
  });

  optionsContainer.appendChild(wrongAnswersContainer);

  setTimeout(() => {
    showRetryModal();
  }, 3000);
}

function showRetryModal() {
  const modal = document.createElement("div");
  modal.id = "retry-modal";
  modal.classList.add("retry-modal");

  const box = document.createElement("div");
  box.classList.add("retry-modal-box");

  // Calculate total cards
  const totalCards = allDroppedCards.length;

  box.innerHTML = `
        <h2 class="retry-title">
            You scored ${String(totalScore).padStart(2, "0")}/${String(
    totalCards
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
    elapsedTime = 0;
    matchedPairs = [];
    allDroppedCards = [];
    stopTimer();
    startTimer();
    loadQuestion();
  };
}

function updateProgressBar(totalCards) {
  const progressBar = document.getElementById("progress-bar");
  const percentage = (matchedPairs.length / totalCards) * 100;
  progressBar.style.width = percentage + "%";

  if (percentage === 100) {
    progressBar.classList.add("complete");
  }
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
  }, 3000);
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
  document.getElementById("main-container").style.display = "flex";

  elapsedTime = 0;
  totalScore = 0;
  matchedPairs = [];
  allDroppedCards = [];

  startTimer();
  loadQuestion();
}

function showSuccessModal() {
  const modal = document.getElementById("success-modal");
  const scoreDisplay = document.getElementById("score-display");
  const timeDisplay = document.getElementById("time-display");

  if (!modal) return;

  scoreDisplay.textContent = `${totalScore} points`;
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
      elapsedTime = 0;
      matchedPairs = [];
      allDroppedCards = [];
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

function completeTest() {
  //   console.log("elapsedTime", elapsedTime);
  //   console.log("totalScore", totalScore);
  //   console.log("matchedPairs", matchedPairs);
  //   console.log("questionTextData", questionTextData);
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
  //   console.log(data);

  $.ajax({
    url: "/admin/activity/questions/history",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify(data),
    success: function (res) {
      if (res.status === 200) {
        const is_correct = wrong_answer === 0 ? 0 : 1;
        storeSeparateEntries(questionTextData, elapsedTime, is_correct);
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
    else if (width < 1200) scaleValue = 0.65;
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