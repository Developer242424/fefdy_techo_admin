const express = require("express");
const request = require("request");
const { isAuthenticated } = require("../middleware/ApiHandler");
const AuthController = require("../controllers/api/AuthController");
const ProfileController = require("../controllers/api/ProfileController");
const SubjectsController = require("../controllers/api/SubjectsController");
const LevelsController = require("../controllers/api/LevelsController");
const TopicsController = require("../controllers/api/TopicsController");
const SubtopicController = require("../controllers/api/SubtopicController"); // not confirmed
const WatchHistoryController = require("../controllers/api/WatchHistoryController"); // not confirmed
const ReadHistoryController = require("../controllers/api/ReadHistoryController"); // not confirmed

const CertificateController = require("../controllers/api/CertificateController");
const ReportsController = require("../controllers/api/ReportsController");
const OverallReportController = require("../controllers/api/OverallReportController");
const QuestionsController = require("../controllers/api/QuestionsController");
const OpenAiTokensController = require("../controllers/api/OpenAiTokensController");

const router = express.Router();

router.get("/", (req, res) => {
  return res
    .status(200)
    .json({ status: 200, message: "Api server is connected successfully" });
});

router.post("/login", AuthController.login);
router.post("/update-profile", ProfileController.update);

router.use(isAuthenticated);

router.post("/logout", AuthController.logout);
router.post("/myprofile", ProfileController.data);
router.post("/subjects", SubjectsController.data);
router.post("/levels", LevelsController.data);
router.post("/topics", TopicsController.data);
router.post("/subtopics", SubtopicController.data);

router.post("/entrytoken", OpenAiTokensController.entryTokens);
router.post(
  "/entrytoken-translator",
  OpenAiTokensController.entryTokensTranslator
);
router.post("/audio-converter", OpenAiTokensController.convertAudio);
router.post("/read-history", ReadHistoryController.index);
router.post("/subtopicdata", SubtopicController.subtopicData);
router.post("/history-entry", WatchHistoryController.entry);

router.post("/reports", ReportsController.Reports);
router.post("/reportsbylevel", ReportsController.ReportsByLevel);
router.post("/reportsasmarks", ReportsController.ReportsAsMarks);
router.post(
  "/overallreportbysubject",
  OverallReportController.OverAllReportBySubject
);
router.post("/certificate", CertificateController.cerificateContent); // Not Confirmed

// router.post("/questiontypes", QuestionsController.QuestionTypeList);
// router.post("/wholereports", ReportsController.wholeReports);

router.get("/pdf", (req, res) => {
  const pdfUrl = req.query.url;
  if (!pdfUrl) return res.status(400).send("No URL provided");

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Access-Control-Allow-Origin", "*");

  request
    .get(pdfUrl)
    .on("error", () => res.status(500).send("Failed to load PDF"))
    .pipe(res);
});

module.exports = router;
