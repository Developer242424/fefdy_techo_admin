// let publicURL = "https://demoadmin.fefdybraingym.com/public/";
let publicURL = "http://localhost:5001/";
let identify_questions = [];
let questionsLoaded = false;
let questionIds = "";
let timerInterval;
let elapsedTime = 0;

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
        // console.log("res", res);
        identify_questions = res;
        questionsLoaded = true;
        if (typeof callback === "function") callback();
        questionIds = identify_questions.map((q) => q.questionid);
        // console.log("Question IDs:", questionIds);
        console.log(
          "✅  Identify questions loaded successfully.",
          identify_questions
        );
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
    // loadQuestion();
  });
};
