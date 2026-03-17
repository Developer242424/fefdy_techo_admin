// let publicURL = "https://demoadmin.fefdybraingym.com/public/";
let publicURL = "http://localhost:5001/";
let partsdrag_questions = [];
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
    url: "/admin/activity/questions/parts-drag/get",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify(data),
    success: function (res) {
      if (Array.isArray(res)) {
        console.log("res", res);
        partsdrag_questions = res;
        questionsLoaded = true;
        // console.log("✅ Questions loaded:", questions);

        userAnswers = new Array(partsdrag_questions.length).fill(null);
        userAnswers[0] = [];

        if (typeof callback === "function") {
          callback();
        }
        questionIds = partsdrag_questions.map((q) => q.questionid);
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
    loadQuestion();
  });
};

function loadQuestion() {
  console.log("question load start");
  console.log("partsdrag_questions", partsdrag_questions);
  const container = document.getElementById("partsdrag-container");
  container.innerHTML = partsdrag_questions[1].html.data;
}
