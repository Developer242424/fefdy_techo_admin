let categories = [];
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
        categories = res;
        // console.log("✅ Questions loaded:", categories);
        questionsLoaded = true;
        questionIds = categories[0].questionid;

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
  fetchQuestions(() => {
    if (questionsLoaded) {
      initializeGame();
    } else {
      console.error("❌ Failed to load questions.");
    }
  });
};

function initializeGame() {
  // Remove first element = question object
  const duplicatedcategories = categories.shift();

  const dynamicHeading = document.getElementById("mainHeading");
  if (dynamicHeading) {
    dynamicHeading.innerText = duplicatedcategories.question;
    dynamicHeading.dataset.fulltext = duplicatedcategories.question;
  }

  const TOTAL_IMAGES = categories.reduce((sum, c) => sum + c.images.length, 0);

  // Track score globally for completeTest
  let totalCorrect = 0;
  let totalWrong = 0;

  function updateCheckButton() {
    const dropped = document.querySelectorAll(".drop-box img").length;
    const btn = document.getElementById("checkBtn");
    if (btn) btn.disabled = dropped !== TOTAL_IMAGES;
  }

  function renderImagesBeforeDropZone(categories) {
    const matchingArea = document.getElementById("matching-area");
    const dropContainer = matchingArea.querySelector(".drop-container");

    const imageList = document.createElement("div");
    imageList.id = "topContainer";
    imageList.className =
      "top-container d-flex flex-wrap gap-2 justify-content-center mb-4";

    const emptyText = document.createElement("div");
    emptyText.innerText = "Box Empty Please Check Answer";
    emptyText.className = "empty-text";
    emptyText.style.display = "none";
    imageList.appendChild(emptyText);

    // collect all images
    let allImages = [];
    categories.forEach((category) => {
      category.images.forEach((src) => {
        allImages.push({ src, category: category.name });
      });
    });

    // shuffle
    for (let i = allImages.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allImages[i], allImages[j]] = [allImages[j], allImages[i]];
    }

    // render shuffled
    allImages.forEach((item) => {
      const img = document.createElement("img");
      img.src = `/${item.src}`;
      img.setAttribute("draggable", "true");
      img.dataset.category = item.category;
      img.style.cursor = "grab";
      img.classList.add("draggable-item");

      img.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", img.src);
        e.dataTransfer.setData("category", img.dataset.category);
        const dragSound = document.getElementById("dragSound");
        if (dragSound) {
          dragSound.currentTime = 0;
          dragSound.play().catch(() => {});
        }
      });

      img.addEventListener("dragend", checkEmpty);

      imageList.appendChild(img);
    });

    function checkEmpty() {
      emptyText.style.display =
        imageList.querySelectorAll("img").length === 0 ? "block" : "none";
    }

    dropContainer.addEventListener("dragover", (e) => e.preventDefault());
    matchingArea.insertBefore(imageList, dropContainer);

    checkEmpty();
  }

  function bindDropEvents() {
    const allBoxes = document.querySelectorAll(".drop-box");
    const dropSound = document.getElementById("dropSound");

    allBoxes.forEach((box) => {
      box.addEventListener("dragover", (e) => {
        e.preventDefault();
        box.classList.add("drag-over");
      });

      box.addEventListener("dragleave", () => {
        box.classList.remove("drag-over");
      });

      box.addEventListener("drop", (e) => {
        e.preventDefault();
        box.classList.remove("drag-over");

        const src = e.dataTransfer.getData("text/plain");
        const category = e.dataTransfer.getData("category");

        // remove existing image from anywhere
        document
          .querySelectorAll(".drop-box img, #topContainer img")
          .forEach((img) => {
            if (img.src === src) img.remove();
          });

        // append new one
        const newImg = document.createElement("img");
        newImg.src = src;
        newImg.dataset.category = category;
        newImg.style.margin = "5px";
        newImg.classList.add("draggable-item");
        box.appendChild(newImg);

        if (dropSound) {
          dropSound.currentTime = 0;
          dropSound.play().catch(() => {});
        }

        updateCheckButton();
      });
    });
  }

  // Timer logic
  let timerInterval;
  let totalSeconds = 0;

  function startTimer() {
    timerInterval = setInterval(() => {
      totalSeconds++;
      document.getElementById("timer-count").textContent =
        formatTime(totalSeconds);
    }, 1000);
  }
  function stopTimer() {
    clearInterval(timerInterval);
  }
  function formatTime(seconds) {
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  }

  // Overlay start
  const overlay = document.getElementById("overlay");
  overlay.addEventListener("click", async () => {
    const introAudio = document.getElementById("introAudio");
    const backgroundAudio = document.getElementById("backgorundAudio");
    const timerDisplay = document.getElementById("timer");

    introAudio.pause();
    introAudio.currentTime = 0;
    overlay.style.display = "none";

    timerDisplay.style.display = "block";
    startTimer();

    backgroundAudio.volume = 0.3;
    try {
      await backgroundAudio.play();
    } catch (err) {
      console.error("Error playing background music:", err);
    }
  });

  // === Drop zone setup ===
  renderImagesBeforeDropZone(categories);

  const container = document.getElementById("dropContainer");
  categories.forEach((category, index) => {
    const title = document.createElement("p");
    title.className = `empty-pera-${index + 1}`;
    title.textContent = category.name;
    container.appendChild(title);

    const box = document.createElement("div");
    box.className = `drop-box drop-box-${index + 1}`;
    box.dataset.box = category.name;
    container.appendChild(box);
  });

  bindDropEvents();

  const checkBtn = document.getElementById("checkBtn");
  if (checkBtn) {
    checkBtn.addEventListener("click", checkAnswers);
  }

  // Hook completeTest button
  const completeBtn = document.getElementById("completeBtn");
  if (completeBtn) {
    completeBtn.addEventListener("click", completeTest);
  }

  updateCheckButton();
  enableHoverSpeak();

  // === Helper functions ===
  function checkAnswers() {
    stopTimer();
    let results = [];

    categories.forEach((category) => {
      const box = document.querySelector(`[data-box='${category.name}']`);
      let correct = 0;

      if (box) {
        box.querySelectorAll("img").forEach((img) => {
          img.classList.remove("correct", "wrong");
        });

        box.querySelectorAll("img").forEach((img) => {
          if (img.dataset.category === category.name) {
            correct++;
            img.classList.add("correct");
          } else {
            img.classList.add("wrong");
          }
        });
      }

      const expected = category.images.length;
      let wrong = Math.max(0, expected - correct);

      results.push({ name: category.name, correct, wrong });
    });

    const totalTime = formatTime(totalSeconds);
    setTimeout(() => {
      showResultModal(results, totalTime);
    }, 4000);
  }

  function showResultModal(results, totalTime) {
    const resultPopup = document.getElementById("resultPopup");
    const scoreText = document.getElementById("scoreText");

    totalCorrect = 0;
    totalWrong = 0;

    let resultMessage = `⏱ Time Taken: ${totalTime}<br><br>`;
    const totalImages = TOTAL_IMAGES;

    results.forEach((r) => {
      const cat = categories.find((c) => c.name === r.name);
      const expected = cat ? cat.images.length : 0;
      const correct = r.correct || 0;
      const wrong = Math.max(0, expected - correct);

      totalCorrect += correct;
      totalWrong += wrong;

      resultMessage += ` ${r.name}:  ${correct} / ${expected} <br>`;
    });

    resultMessage += `<br>⭐ Total Correct: ${totalCorrect} / ${totalImages}`;

    if (scoreText) scoreText.innerHTML = resultMessage;
    if (resultPopup) resultPopup.classList.add("show");

    const resultAudio = document.getElementById("resultAudio");
    if (resultAudio) resultAudio.play();

    const scoreCount = Math.round((totalCorrect / totalImages) * 10);
    fireConfettiBasedOnScore(scoreCount);
  }

  // === Confetti scoring ===
  const scoreConfettiMap = [
    { particles: 0, message: "Oops! You need to learn more." },
    { particles: 2, message: "You can do better!" },
    { particles: 4, message: "Keep going!" },
    { particles: 6, message: "Good effort!" },
    { particles: 8, message: "Great job!" },
    { particles: 10, message: "Amazing! You got all correct!" },
  ];

  function fireConfettiBasedOnScore(scoreCount) {
    let selected = scoreConfettiMap[0];
    for (let i = 0; i < scoreConfettiMap.length; i++) {
      if (scoreCount >= scoreConfettiMap[i].particles) {
        selected = scoreConfettiMap[i];
      }
    }
    const { particles: particleCount, message } = selected;

    if (typeof confetti === "function") {
      const duration = 1500;
      const end = Date.now() + duration;

      (function frame() {
        confetti({
          particleCount,
          angle: 60,
          spread: 100,
          origin: { x: 0 },
          zIndex: 99999,
        });
        confetti({
          particleCount,
          angle: 120,
          spread: 100,
          origin: { x: 1 },
          zIndex: 99999,
        });

        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    }

    speakText(message);
  }

  // === Speech helpers ===
  function speakText(text) {
    if (!text || typeof text !== "string") return;
    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 1;
      speechSynthesis.speak(utterance);
    }
  }

  function enableHoverSpeak() {
    const heading = document.getElementById("mainHeading");
    if (heading) {
      heading.addEventListener("mouseenter", () => {
        const text =
          heading.getAttribute("data-fulltext") || heading.textContent;
        speakText(text);
      });
    }

    document.querySelectorAll("#dropContainer p").forEach((title) => {
      title.addEventListener("mouseenter", () => {
        speakText(title.textContent);
      });
    });
  }

  // Complete Test function
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
      correctAnswers: totalCorrect,
      wrongAnswers: totalWrong,
      totalTime: totalSeconds,
      questionIds,
    };
    // console.log("Submitting data:", data);
    $.ajax({
      url: "/admin/activity/questions/history",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify(data),
      success: function (res) {
        if (res.status === 200) {
          restartGame();
          // location.reload();
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
}

function restartGame() {
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
  window.location.href = `/admin/drag-drop/home?sid=${sid}&tid=${tid}&lid=${lid}&stid=${stid}&qid=${qid}&ust=${ust}`;
}
