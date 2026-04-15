const asyncHandler = require("express-async-handler");
const { check, validationResult } = require("express-validator");
const multer = require("multer");
const User = require("../../models/user");
const Subjects = require("../../models/subjects");
const Level = require("../../models/level");
const Topics = require("../../models/topics");
const Subtopic = require("../../models/subtopic");
const CategoryData = require("../../models/categorydata");
const Category = require("../../models/category");
const QuestionType = require("../../models/questiontype");
const Questions = require("../../models/questions");
const WatchHistory = require("../../models/watchhistory");
const LoginUsers = require("../../models/loginusers");
const AttendedTestQuestion = require("../../models/attendedtestquestion");
const { sequelize } = require("../../models");
const { QueryTypes } = require("sequelize");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { where, Sequelize, DATE, Op } = require("sequelize");
const { render, name } = require("ejs");
require("dotenv").config();
const session = require("express-session");
const getDynamicUploader = require("../../middleware/upload");
const moment = require("moment");
const { fn } = require("sequelize");
const path = require("path");
const fs = require("fs");
const { title } = require("process");
const { connect } = require("http2");
const TestHistory = require("../../models/test_history");
const axios = require("axios");
const { response } = require("express");
const { BuildJsonForSkillCalciRequest } = require("./ReportsController");

class OverallReportController {
  constructor() {
    this.OverAllReportBySubject = asyncHandler(async (req, res) => {
      try {
        const user = req.session.user;
        const { subject } = req.body;
        const levels = await Level.findAll({
          where: {
            is_deleted: null,
          },
        });
        const results = await Promise.all(
          levels.map(async (level, idx) => {
            const subtopics = await Subtopic.findAll({
              where: {
                level: level.id,
                subject: subject,
                is_deleted: null,
              },
            });
            // console.log("subtopics", subtopics);
            let percent = 0;
            const result = await Promise.all(
              subtopics.map(async (subtopic) => {
                // console.log("subtopic.id", subtopic.id);
                const ques_type_ids = await Questions.findAll({
                  where: {
                    is_deleted: null,
                    sub_topic: subtopic.id,
                  },
                  attributes: ["question_type"],
                });
                let templates = ques_type_ids
                  .map((d) => d.question_type)
                  .filter((v, i, arr) => arr.indexOf(v) === i);
                // console.log("templates", templates);

                if (!templates) {
                  templates = [];
                }

                if (typeof templates === "string") {
                  try {
                    templates = JSON.parse(templates);
                  } catch {
                    templates = [];
                  }
                }

                if (!Array.isArray(templates)) {
                  templates = [];
                }

                templates = templates.filter(
                  (x) => x !== null && x !== undefined
                );
                templates = templates.map(Number);

                const test_history = await TestHistory.findAll({
                  where: {
                    user_id: user.id,
                    sub_topic: subtopic.id,
                    question_type: { [Op.in]: templates },
                    is_deleted: null,
                  },
                  order: [["id", "DESC"]],
                });
                // console.log("test_history " + subtopic.title, test_history);
                const latestByTemplate = {};
                test_history.forEach((entry) => {
                  if (!latestByTemplate[entry.question_type]) {
                    latestByTemplate[entry.question_type] = entry; // first one is latest because sorted DESC
                  }
                });
                // console.log("latestByTemplate", latestByTemplate);
                let correctQ = 0;
                let wrongQ = 0;
                Object.values(latestByTemplate).map((history) => {
                  correctQ += history.correct_ans;
                  wrongQ += history.wrong_ans;
                });
                // console.log("correctQ", correctQ);
                // console.log("wrongQ", wrongQ);
                percent +=
                  correctQ + wrongQ <= 0
                    ? 0
                    : (correctQ / (correctQ + wrongQ)) * 100;
                // console.log("percent", percent);
                const question_rep = await BuildJsonForSkillCalciRequest(
                  latestByTemplate
                );
                // console.log("question_rep", question_rep);
                let questions_request = [];
                if (question_rep.length > 0) {
                  questions_request = await getSkillsReportByML([
                    { user_id: user.id, questions: question_rep },
                  ]);
                }
                // console.log("questions_request", questions_request);
                if (questions_request[0]?.overall_skill_improvements) {
                  // console.log(
                  //   "questions_request[0].overall_skill_improvements",
                  //   questions_request[0].overall_skill_improvements
                  // );
                  return questions_request[0].overall_skill_improvements;
                }
                return null;
              })
            );
            // console.log("percent", percent);
            const final_percent = percent / subtopics.length;
            const data = result.filter(Boolean);
            const averagedSkills = averageSkills(data);

            // console.log("data", data);
            // console.log("averagedSkills", averagedSkills);
            const fnl_skills = convertSkillObjectToArray(averagedSkills);
            const topics = await Topics.findAll({
              where: {
                is_deleted: null,
                subject: subject,
                level: level.id,
              },
              attributes: ["id", "title", "thumbnail", "sort_order"],
            });
            const topics_data = await Promise.all(
              topics.map(async (topic) => {
                const subtopics = await Subtopic.findAll({
                  where: {
                    topic: topic.id,
                    is_deleted: null,
                  },
                });
                // console.log("subtopics for topic " + topic.title, subtopics);

                // Calculate percentages for all subtopics in parallel
                const percentPromises = subtopics.map(async (subtopic) => {
                  const ques_type_ids = await Questions.findAll({
                    where: {
                      is_deleted: null,
                      sub_topic: subtopic.id,
                    },
                    attributes: ["question_type"],
                  });

                  let templates = ques_type_ids
                    .map((d) => d.question_type)
                    .filter((v, i, arr) => arr.indexOf(v) === i);

                  if (!templates) {
                    templates = [];
                  }

                  if (typeof templates === "string") {
                    try {
                      templates = JSON.parse(templates);
                    } catch {
                      templates = [];
                    }
                  }

                  if (!Array.isArray(templates)) {
                    templates = [];
                  }

                  templates = templates.filter(
                    (x) => x !== null && x !== undefined
                  );
                  templates = templates.map(Number);

                  const test_history = await TestHistory.findAll({
                    where: {
                      user_id: user.id,
                      sub_topic: subtopic.id,
                      question_type: { [Op.in]: templates },
                      is_deleted: null,
                    },
                    order: [["id", "DESC"]],
                  });

                  const latestByTemplate = {};
                  test_history.forEach((entry) => {
                    if (!latestByTemplate[entry.question_type]) {
                      latestByTemplate[entry.question_type] = entry;
                    }
                  });

                  let correctQ = 0;
                  let wrongQ = 0;
                  Object.values(latestByTemplate).forEach((history) => {
                    correctQ += history.correct_ans;
                    wrongQ += history.wrong_ans;
                  });

                  const percent =
                    correctQ + wrongQ <= 0
                      ? 0
                      : (correctQ / (correctQ + wrongQ)) * 100;

                  return {
                    subtopic_id: subtopic.id,
                    subtopic_name: subtopic.title,
                    percent: Math.round(percent > 100 ? 100 : percent),
                  };
                });

                // Wait for all subtopic percentages to be calculated
                const subtopicPercentages = await Promise.all(percentPromises);

                // Calculate topic-wide average percentage if needed
                const totalPercent = subtopicPercentages.reduce(
                  (sum, item) => sum + item.percent,
                  0
                );
                const averagePercent =
                  subtopicPercentages.length > 0
                    ? Math.round(totalPercent / subtopicPercentages.length)
                    : 0;

                return {
                  id: topic.id,
                  name: topic.title,
                  thumbnail: topic.thumbnail,
                  sort_order: topic.sort_order,
                  // Topic-level percentage (average of all subtopics)
                  topic_percentage: averagePercent,
                  // Detailed subtopic percentages
                  // subtopic_percentages: subtopicPercentages,
                  // Or if you want just an array of percentages without subtopic details:
                  // subtopic_percents: subtopicPercentages.map(item => item.percent),
                };
              })
            );
            return {
              id: level.id,
              name: level.level,
              percentage: Math.round(final_percent),
              topics: topics_data,
              skills_report: fnl_skills,
            };
          })
        );
        return res.status(200).json({ status: 200, data: results });
      } catch (error) {
        console.error("Login error:", error);
        return res
          .status(200)
          .json({ status: 500, message: "Internal server error", error });
      }
    });

    async function BuildJsonForSkillCalciRequest(latestByTemplate) {
      try {
        // console.log(
        //   "latestByTemplate from BuildJsonForSkillCalciRequest",
        //   latestByTemplate
        // );
        const questions = [];
        await Promise.all(
          Object.values(latestByTemplate).map(async (history) => {
            const question_ids = Array.isArray(history.question_ids)
              ? history.question_ids
              : [];
            // console.log("question_ids", question_ids);
            // Further processing can be done here if needed
            const q_type = await QuestionType.findOne({
              where: { id: history.question_type, is_deleted: null },
              raw: true,
            });
            // console.log("q_type", q_type);
            await Promise.all(
              question_ids.map(async (qid) => {
                let objectToPush = {};
                if (q_type.structure_type === "choose") {
                  const firstRow = await AttendedTestQuestion.findOne({
                    where: { question_id: qid },
                    order: [["id", "Desc"]],
                    raw: true,
                    limit: 1,
                  });
                  // console.log("firstRow", firstRow);
                  // First, create a Date object from your input
                  const currentAttemptDate = firstRow
                    ? new Date(firstRow.is_entered)
                    : null;

                  // Convert to string for output
                  const currentAttemptTime = currentAttemptDate
                    ? currentAttemptDate
                        .toISOString()
                        .replace("T", " ")
                        .substring(0, 19)
                    : null;

                  // console.log("currentAttemptTime", currentAttemptTime);

                  // Calculate next minute using the Date object, then format as string
                  const prevMinuteTime = currentAttemptDate
                    ? new Date(currentAttemptDate.getTime() - 1 * 60 * 1000)
                        .toISOString()
                        .replace("T", " ")
                        .substring(0, 19)
                    : null;

                  // console.log("prevMinuteTime", prevMinuteTime);
                  // const differenceInMinutes = nextMinuetTime
                  //   ? moment(nextMinuetTime).diff(
                  //       moment(currentAttemptTime),
                  //       "minutes"
                  //     )
                  //   : null;
                  // console.log("differenceInMinutes", differenceInMinutes);
                  const attempts = await AttendedTestQuestion.findAll({
                    where: {
                      question_id: qid,
                      is_entered: {
                        [Op.between]: [prevMinuteTime, currentAttemptTime],
                      },
                      is_deleted: null,
                    },
                    order: [["id", "DESC"]],
                    limit: q_type.max_attempts,
                    raw: true,
                  });
                  // console.log("attempts", attempts);
                  // console.log("q_type.max_attempts", q_type.max_attempts);
                  const orderedAttempts = attempts.sort((a, b) => a.id - b.id);
                  // console.log("orderedAttempts", orderedAttempts);
                  const correctAttempt = orderedAttempts.find(
                    (a) => a.is_correct == 0
                  );
                  const correctAttemptIndex = orderedAttempts.findIndex(
                    (a) => a.is_correct == 0
                  );
                  // console.log("correctAttempt", correctAttempt);
                  objectToPush = {
                    question: correctAttempt
                      ? correctAttempt.question.trim()
                      : (
                          orderedAttempts[orderedAttempts.length - 1]
                            ?.question || "Unknown Question"
                        ).trim(),
                    type: "choose",
                    max_time: q_type.max_time,
                    time_taken: correctAttempt?.comp_time,
                    max_attempts: q_type.max_attempts,
                    attempts: correctAttemptIndex + 1,
                  };
                  // console.log("objectToPush", objectToPush);
                } else if (q_type.structure_type === "match") {
                  const attempts = await AttendedTestQuestion.findAll({
                    where: { question_id: qid },
                    order: [["id", "DESC"]],
                    is_deleted: null,
                    limit: 1,
                    raw: true,
                  });
                  const lastAttempt = attempts[0];
                  objectToPush = {
                    question: lastAttempt.question.trim(),
                    type: "match",
                    correct: history.correct_ans,
                    wrong: history.wrong_ans,
                    max_time: q_type.max_time,
                    time_taken: lastAttempt?.comp_time,
                  };
                } else if (q_type.structure_type === "drag_drop") {
                  const attempts = await AttendedTestQuestion.findAll({
                    where: { question_id: qid },
                    order: [["id", "DESC"]],
                    is_deleted: null,
                    limit: 1,
                    raw: true,
                  });
                  const lastAttempt = attempts[0];
                  objectToPush = {
                    question: lastAttempt.question.trim(),
                    type: "drag_drop",
                    correct: history.correct_ans,
                    wrong: history.wrong_ans,
                    max_time: q_type.max_time,
                    time_taken: lastAttempt?.comp_time,
                  };
                } else if (q_type.structure_type === "identify") {
                  const firstRow = await AttendedTestQuestion.findOne({
                    where: { question_id: qid },
                    order: [["id", "Desc"]],
                    raw: true,
                    limit: 1,
                  });
                  // console.log("firstRow", firstRow);
                  // First, create a Date object from your input
                  const currentAttemptDate = firstRow
                    ? new Date(firstRow.is_entered)
                    : null;

                  // Convert to string for output
                  const currentAttemptTime = currentAttemptDate
                    ? currentAttemptDate
                        .toISOString()
                        .replace("T", " ")
                        .substring(0, 19)
                    : null;

                  // console.log("currentAttemptTime", currentAttemptTime);

                  // Calculate next minute using the Date object, then format as string
                  const prevMinuteTime = currentAttemptDate
                    ? new Date(currentAttemptDate.getTime() - 1 * 60 * 1000)
                        .toISOString()
                        .replace("T", " ")
                        .substring(0, 19)
                    : null;

                  // console.log("prevMinuteTime", prevMinuteTime);
                  // const differenceInMinutes = nextMinuetTime
                  //   ? moment(nextMinuetTime).diff(
                  //       moment(currentAttemptTime),
                  //       "minutes"
                  //     )
                  //   : null;
                  // console.log("differenceInMinutes", differenceInMinutes);
                  const attempts = await AttendedTestQuestion.findAll({
                    where: {
                      question_id: qid,
                      is_entered: {
                        [Op.between]: [prevMinuteTime, currentAttemptTime],
                      },
                      is_deleted: null,
                    },
                    order: [["id", "DESC"]],
                    limit: q_type.max_attempts,
                    raw: true,
                  });
                  // console.log("attempts", attempts);
                  const correctAttempt = attempts.filter(
                    (a) => a.is_correct == 0
                  );
                  const wrongAttempt = attempts.filter(
                    (a) => a.is_correct == 1
                  );
                  // console.log("correctAttempt", correctAttempt);
                  // console.log("wrongAttempt", wrongAttempt);
                  const correctAttempt_time = correctAttempt.reduce(
                    (sum, d) => sum + Number(d.comp_time),
                    0
                  );
                  // console.log("correctAttempt_time", correctAttempt_time);
                  const wrongAttempt_time = wrongAttempt.reduce(
                    (sum, d) => sum + Number(d.comp_time),
                    0
                  );
                  // console.log("wrongAttempt_time", wrongAttempt_time);
                  const taken_time = correctAttempt_time + wrongAttempt_time;
                  // console.log("taken_time", taken_time);
                  objectToPush = {
                    question: correctAttempt[0]
                      ? correctAttempt[0].question.trim()
                      : (
                          attempts[attempts.length - 1]?.question ||
                          "Unknown Question"
                        ).trim(),
                    type: "identify",
                    correct: correctAttempt.length,
                    wrong: wrongAttempt.length,
                    max_time: q_type.max_time,
                    time_taken: taken_time,
                  };
                }
                if (Object.keys(objectToPush).length > 0) {
                  questions.push(objectToPush);
                }
              })
            );
          })
        );
        // console.log("questions to return", questions);
        return questions;
      } catch (error) {
        console.error("BuildJsonForSkillCalciRequest ERROR:", error);
        return { status: 500, error };
      }
    }

    async function getSkillsReportByML(data) {
      try {
        // console.log("data", data);
        const res = await axios.post(
          "https://skillcalci.fefdybraingym.com/cal-by-game/predict",
          data,
          { headers: { "Content-Type": "application/json" } }
        );

        return res.data;
      } catch (error) {
        console.error(
          "SkillReportOfUserByML ERROR:",
          error.response?.data || error
        );
        return { status: 500, error };
      }
    }

    function convertSkillObjectToArray(skillObj) {
      const safeObj = skillObj && typeof skillObj === "object" ? skillObj : {};
      return Object.entries(safeObj).map(([key, value]) => ({
        skill: key,
        value: Math.round(Number(value) || 0),
      }));
    }

    function averageSkills(data) {
      const totals = {};
      const counts = {};

      data.forEach((skillObj) => {
        Object.entries(skillObj).forEach(([skill, value]) => {
          if (typeof value !== "number") return;

          totals[skill] = (totals[skill] || 0) + value;
          counts[skill] = (counts[skill] || 0) + 1;
        });
      });

      const averages = {};
      Object.keys(totals).forEach((skill) => {
        averages[skill] = +(totals[skill] / counts[skill]).toFixed(2);
      });

      return averages;
    }
  }
}

module.exports = new OverallReportController();
