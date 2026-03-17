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

class ReportsController {
  constructor() {
    this.wholeReports = asyncHandler(async (req, res) => {
      try {
        const user = req.session.user;
        const data = await sequelize.query(
          `WITH question_type_ids AS (
             SELECT id FROM question_type WHERE is_deleted IS NULL
           ),
           
           watch_count_per_subtopic AS (
             SELECT
               subtopics.id AS subtopic_id,
               COUNT(*) AS complete_count
             FROM watch_history
             JOIN subtopics ON watch_history.subtopic = subtopics.id
             WHERE watch_history.user_id = ${user.id}
               AND watch_history.status = '1'
               AND watch_history.is_deleted IS NULL
               AND subtopics.is_deleted IS NULL
             GROUP BY subtopics.id
           ),
           
           latest_test_histories AS (
             SELECT *
             FROM (
               SELECT
                 th.id,
                 th.sub_topic,
                 th.question_type,
                 th.correct_ans,
                 th.wrong_ans,
                 ROW_NUMBER() OVER (
                   PARTITION BY th.sub_topic, th.question_type
                   ORDER BY th.id DESC
                 ) AS rn
               FROM test_histories th
               WHERE th.is_deleted IS NULL
                 AND th.user_id = ${user.id}
                 AND th.question_type IS NOT NULL
             ) ranked
             WHERE rn = 1
           ),
           
           marks_per_subtopic AS (
             SELECT
               sub_topic AS subtopic_id,
               SUM(COALESCE(correct_ans, 0) + COALESCE(wrong_ans, 0)) AS ttl_mark,
               SUM(COALESCE(correct_ans, 0)) AS got_mark
             FROM latest_test_histories
             GROUP BY sub_topic
           ),
           
           question_types_per_subtopic AS (
             SELECT
               sub_topic AS subtopic_id,
               JSON_ARRAYAGG(question_type) AS question_types
             FROM latest_test_histories
             GROUP BY sub_topic
           ),
           
           subtopics_per_level AS (
             SELECT
               subtopics.level_id,
               JSON_ARRAYAGG(
                 JSON_OBJECT(
                   'id', subtopics.id,
                   'title', subtopics.title,
                   'category', CAST(subtopics.category AS JSON),
                   'complete_count', COALESCE(watch_count_per_subtopic.complete_count, 0),
                   'ttl_mark', COALESCE(marks_per_subtopic.ttl_mark, 0),
                   'got_mark', COALESCE(marks_per_subtopic.got_mark, 0),
                   'question_types', COALESCE(question_types_per_subtopic.question_types, JSON_ARRAY())
                 )
               ) AS subtopics
             FROM subtopics
             LEFT JOIN watch_count_per_subtopic ON subtopics.id = watch_count_per_subtopic.subtopic_id
             LEFT JOIN marks_per_subtopic ON subtopics.id = marks_per_subtopic.subtopic_id
             LEFT JOIN question_types_per_subtopic ON subtopics.id = question_types_per_subtopic.subtopic_id
             WHERE subtopics.is_deleted IS NULL
             GROUP BY subtopics.level_id
           ),
           
           levels_per_topic AS (
             SELECT
               levels.topic AS topic_id,
               levels.id AS level_id,
               levels.title AS level_title,
               levels.level AS its_level,
               COALESCE(subtopics_per_level.subtopics, JSON_ARRAY()) AS subtopics
             FROM levels
             LEFT JOIN subtopics_per_level ON levels.id = subtopics_per_level.level_id
             WHERE levels.is_deleted IS NULL
             ORDER BY levels.level ASC
           ),
           
           levels_aggregated AS (
             SELECT
               topic_id,
               JSON_ARRAYAGG(
                 JSON_OBJECT(
                   'id', level_id,
                   'title', level_title,
                   'its_level', its_level,
                   'subtopics', subtopics
                 )
               ) AS levels
             FROM levels_per_topic
             GROUP BY topic_id
           ),
           
           question_type_data AS (
             SELECT
               JSON_ARRAYAGG(
                 JSON_OBJECT(
                   'id', qt.id,
                   'type', qt.type
                 )
               ) AS question_types
             FROM question_type qt
             WHERE qt.is_deleted IS NULL
           ),
           
           topics_per_subject AS (
             SELECT
               topics.subject AS subject_id,
               topics.id AS topic_id,
               topics.title AS topic_title,
               COALESCE(levels_aggregated.levels, JSON_ARRAY()) AS levels,
               question_type_data.question_types
             FROM topics
             LEFT JOIN levels_aggregated ON topics.id = levels_aggregated.topic_id
             CROSS JOIN question_type_data
             WHERE topics.is_deleted IS NULL
           ),
           
           topics_aggregated AS (
             SELECT
               subject_id,
               JSON_ARRAYAGG(
                 JSON_OBJECT(
                   'id', topic_id,
                   'title', topic_title,
                   'levels', levels,
                   'question_types', question_types
                 )
               ) AS topics
             FROM topics_per_subject
             GROUP BY subject_id
           )
           
           SELECT
             subjects.id,
             subjects.subject,
             subjects.thumbnail,
             COALESCE(topics_aggregated.topics, JSON_ARRAY()) AS topics
           FROM subjects
           LEFT JOIN topics_aggregated ON subjects.id = topics_aggregated.subject_id
           WHERE subjects.is_deleted IS NULL;
           `
        );
        // console.log(data);
        res.status(200).json({ status: 200, data });
      } catch (error) {
        console.error("Login error:", error);
        return res
          .status(200)
          .json({ status: 500, message: "Internal server error", error });
      }
    });

    // this.Reports = asyncHandler(async (req, res) => {
    //   try {
    //     // console.log("Body", req.body);
    //     const user = req.session.user;
    //     // console.log(user);
    //     const { topic } = req.body;
    //     const topic_data = await Topics.findOne({
    //       where: {
    //         id: topic,
    //         is_deleted: null,
    //       },
    //     });
    //     const level = await Level.findOne({
    //       where: {
    //         id: topic_data.level,
    //         is_deleted: null,
    //       },
    //     });
    //     // console.log("level", level);
    //     // console.log("level.game_templates =", level.game_templates);
    //     // console.log("Type:", typeof level.game_templates);
    //     let templates = level.game_templates;

    //     if (!templates) {
    //       templates = [];
    //     }

    //     if (typeof templates === "string") {
    //       try {
    //         templates = JSON.parse(templates);
    //       } catch {
    //         templates = [];
    //       }
    //     }

    //     if (!Array.isArray(templates)) {
    //       templates = [];
    //     }

    //     templates = templates.filter((x) => x !== null && x !== undefined);
    //     templates = templates.map(Number);

    //     // console.log("Final parsed templates =", templates);
    //     const question_types = await QuestionType.findAll({
    //       where: {
    //         id: {
    //           [Op.in]: templates,
    //         },
    //         is_deleted: null,
    //       },
    //     });
    //     // console.log("question_types", question_types);
    //     const subtopics = await Subtopic.findAll({
    //       where: {
    //         topic: topic_data.id,
    //         level: topic_data.level,
    //         is_deleted: null,
    //       },
    //     });
    //     // console.log("subtopics.length", subtopics.length);
    //     const data = await Promise.all(
    //       subtopics.map(async (subtopic) => {
    //         const question_rep = await SkillReportOfUserBySubtopic(
    //           user.id,
    //           subtopic.id,
    //           templates
    //         );
    //         // console.log("question_rep", question_rep);
    //         const percents = await Promise.all(
    //           templates.map(async (id) => {
    //             const test_history = await TestHistory.findOne({
    //               where: {
    //                 user_id: user.id,
    //                 sub_topic: subtopic.id,
    //                 question_type: id,
    //                 is_deleted: null,
    //               },
    //               order: [["id", "DESC"]],
    //             });
    //             if (!test_history) return 0;
    //             const ttl_mark =
    //               test_history.correct_ans + test_history.wrong_ans;
    //             if (ttl_mark === 0) return 0;
    //             return (test_history.correct_ans / ttl_mark) * 100;
    //           })
    //         );

    //         const ttl_percent =
    //           percents.reduce((sum, p) => sum + p, 0) / percents.length;

    //         return {
    //           id: subtopic.id,
    //           title: subtopic.title,
    //           percent: Math.round(ttl_percent > 100 ? 100 : ttl_percent),
    //           questions_report: question_rep ? question_rep : [],
    //         };
    //       })
    //     );
    //     return res.status(200).json({ status: 200, data: data });
    //   } catch (error) {
    //     console.error("Login error:", error);
    //     return res
    //       .status(200)
    //       .json({ status: 500, message: "Internal server error", error });
    //   }
    // });

    // async function SkillReportOfUserBySubtopic(
    //   userId,
    //   subtopicId,
    //   q_types_ids
    // ) {
    //   try {
    //     // console.log("q_types_ids", q_types_ids);

    //     let allQuestions = [];

    //     for (const qt_id of q_types_ids) {
    //       // Fetch min_time for this question type
    //       const qTypeData = await QuestionType.findOne({
    //         where: { id: qt_id, is_deleted: null },
    //         raw: true,
    //       });

    //       const min_time = Number(qTypeData?.min_time ?? 0);

    //       const histories = await TestHistory.findAll({
    //         where: {
    //           user_id: userId,
    //           sub_topic: subtopicId,
    //           question_type: qt_id,
    //           is_deleted: null,
    //         },
    //         attributes: ["question_ids"],
    //         raw: true,
    //       });

    //       const questionIdsArray = histories
    //         .map((h) => (Array.isArray(h.question_ids) ? h.question_ids : []))
    //         .flat();

    //       const uniqueQuestionIds = [...new Set(questionIdsArray)];

    //       if (uniqueQuestionIds.length === 0) continue;

    //       const questions = (
    //         await Promise.all(
    //           uniqueQuestionIds.map(async (qid) => {
    //             const attempts = await AttendedTestQuestion.findAll({
    //               where: { question_id: qid },
    //               order: [["is_entered", "DESC"]],
    //               limit: 2,
    //               raw: true,
    //             });

    //             const attempts_all = await AttendedTestQuestion.findAll({
    //               where: { question_id: qid },
    //               order: [["is_entered", "DESC"]],
    //               raw: true,
    //             });
    //             const last = attempts[0] || null;
    //             const secondLast = attempts[1] || null;

    //             const convert = (a) =>
    //               a ? (a.is_correct == 1 ? "wrong" : "correct") : null;

    //             return {
    //               question: (
    //                 last?.question ||
    //                 secondLast?.question ||
    //                 "Unknown Question"
    //               ).trim(),
    //               min_time: min_time, // ADD HERE ✔
    //               last_complete_time: Number(last?.comp_time ?? 0),
    //               second_last_complete_time: Number(secondLast?.comp_time ?? 0),
    //               last_result: convert(last) || "unknown",
    //               second_last_result: convert(secondLast) || "unknown",
    //               number_of_attempts: attempts_all.length,
    //             };
    //           })
    //         )
    //       ).filter((q) => q.question && q.question.trim().length > 0);

    //       allQuestions.push(...questions);
    //     }

    //     if (allQuestions.length === 0) return [];

    //     return [
    //       {
    //         user_id: userId,
    //         questions: allQuestions,
    //       },
    //     ];
    //   } catch (error) {
    //     console.error("SkillReportOfUserBySubtopic ERROR:", error);
    //     return { status: 500, error };
    //   }
    // }

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

    // this.ReportsByLevel = asyncHandler(async (req, res) => {
    //   try {
    //     const user = req.session.user;
    //     const { level } = req.body;
    //     const histories = await TestHistory.findAll({
    //       where: {
    //         user_id: user.id,
    //         level: level,
    //         is_deleted: null,
    //       },
    //       attributes: ["question_ids"],
    //       raw: true,
    //     });

    //     const questionIdsArray = histories
    //       .map((h) => (Array.isArray(h.question_ids) ? h.question_ids : []))
    //       .flat();

    //     const uniqueQuestionIds = [...new Set(questionIdsArray)];

    //     // console.log("questionIdsArray", questionIdsArray);
    //     // console.log("uniqueQuestionIds", uniqueQuestionIds);

    //     // PREVENT API CALL WHEN EMPTY
    //     if (uniqueQuestionIds.length === 0) {
    //       return [
    //         {
    //           user_id: user.id,
    //           questions: [],
    //           overall_skill_improvements: {},
    //         },
    //       ];
    //     }

    //     const questions = (
    //       await Promise.all(
    //         uniqueQuestionIds.map(async (qid) => {
    //           const attempts = await AttendedTestQuestion.findAll({
    //             where: { question_id: qid },
    //             order: [["is_entered", "DESC"]],
    //             limit: 2,
    //             raw: true,
    //           });

    //           const last = attempts[0] || null;
    //           const secondLast = attempts[1] || null;

    //           const convert = (a) =>
    //             a ? (a.is_correct == 1 ? "wrong" : "correct") : null;

    //           return {
    //             // question_id: qid,
    //             question: (
    //               last?.question ||
    //               secondLast?.question ||
    //               "Unknown Question"
    //             ).trim(),
    //             last_complete_time: Number(last?.comp_time ?? 0),
    //             second_last_complete_time: Number(secondLast?.comp_time ?? 0),
    //             last_result: convert(last) || "unknown",
    //             second_last_result: convert(secondLast) || "unknown",
    //           };
    //         })
    //       )
    //     ).filter((q) => q.question && q.question.trim().length > 0);

    //     const final = [
    //       {
    //         user_id: user.id,
    //         questions,
    //       },
    //     ];
    //     console.log(JSON.stringify(final, null, 2));
    //     let skills = [];
    //     if (final[0].questions.length > 0) {
    //       skills = await getSkillsReportByML(final);
    //     }
    //     // console.log(JSON.stringify(skills, null, 2))
    //     const fnl_skills = convertSkillObjectToArray(
    //       skills[0]?.overall_skill_improvements
    //     );
    //     return res.status(200).json({ status: 200, skills_report: fnl_skills });
    //   } catch (error) {
    //     console.error("Login error:", error);
    //     return res
    //       .status(200)
    //       .json({ status: 500, message: "Internal server error", error });
    //   }
    // });

    this.ReportsAsMarks = asyncHandler(async (req, res) => {
      try {
        const user = req.session.user;
        const { topic } = req.body;

        // Fetch topic & level
        const topic_data = await Topics.findOne({
          where: { id: topic, is_deleted: null },
          raw: true,
        });

        // const level = await Level.findOne({
        //   where: { id: topic_data.level, is_deleted: null },
        //   raw: true,
        // });

        // // Parse templates safely
        // let templates = level.game_templates || [];
        // if (typeof templates === "string") {
        //   try {
        //     templates = JSON.parse(templates);
        //   } catch {
        //     templates = [];
        //   }
        // }
        // if (!Array.isArray(templates)) templates = [];
        // templates = templates.filter((x) => x != null).map(Number);

        // // Preload question types
        // const question_types = await QuestionType.findAll({
        //   where: { id: { [Op.in]: templates }, is_deleted: null },
        //   raw: true,
        // });

        // Fetch all subtopics at once
        const subtopics = await Subtopic.findAll({
          where: {
            topic: topic_data.id,
            level: topic_data.level,
            is_deleted: null,
          },
          raw: true,
        });
        // console.log("subtopics", subtopics);
        const data = await Promise.all(
          subtopics.map(async (subtopic) => {
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

            templates = templates.filter((x) => x !== null && x !== undefined);
            templates = templates.map(Number);

            const question_types = await QuestionType.findAll({
              where: { id: { [Op.in]: templates }, is_deleted: null },
              raw: true,
            });

            const quests = await Promise.all(
              question_types.map(async (qt) => {
                const history = await TestHistory.findOne({
                  where: {
                    user_id: user.id,
                    sub_topic: subtopic.id,
                    question_type: qt.id,
                    is_deleted: null,
                  },
                  order: [["id", "DESC"]],
                  raw: true,
                });

                return {
                  id: qt.id,
                  name: qt.title,
                  ttl_mark: history
                    ? history.correct_ans + history.wrong_ans
                    : 0,
                  got_mark: history ? history.correct_ans : 0,
                };
              })
            );

            return {
              id: subtopic.id,
              title: subtopic.title,
              outcomes: subtopic.learning_outcomes || [],
              reports: quests,
            };
          })
        );
        return res.status(200).json({ status: 200, data });
      } catch (error) {
        console.error("Login error:", error);
        return res
          .status(200)
          .json({ status: 500, message: "Internal server error", error });
      }
    });

    this.Reports = asyncHandler(async (req, res) => {
      try {
        const user = req.session.user;
        // console.log("USER ID =", user.id);
        const { topic } = req.body;
        const topic_data = await Topics.findOne({
          where: {
            id: topic,
            is_deleted: null,
          },
        });
        // const level = await Level.findOne({
        //   where: {
        //     id: topic_data.level,
        //     is_deleted: null,
        //   },
        // });
        // // console.log("level", level);
        // // console.log("level.game_templates =", level.game_templates);
        // // console.log("Type:", typeof level.game_templates);
        // let templates = level.game_templates;

        // if (!templates) {
        //   templates = [];
        // }

        // if (typeof templates === "string") {
        //   try {
        //     templates = JSON.parse(templates);
        //   } catch {
        //     templates = [];
        //   }
        // }

        // if (!Array.isArray(templates)) {
        //   templates = [];
        // }

        // templates = templates.filter((x) => x !== null && x !== undefined);
        // templates = templates.map(Number);
        // console.log("Final parsed templates =", templates);
        const subtopics = await Subtopic.findAll({
          where: {
            topic: topic,
            is_deleted: null,
          },
        });
        // console.log("subtopics", subtopics);
        const data = await Promise.all(
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

            templates = templates.filter((x) => x !== null && x !== undefined);
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
            // console.log("test_history "+subtopic.title, test_history);
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
            const percent =
              correctQ + wrongQ <= 0
                ? 0
                : (correctQ / (correctQ + wrongQ)) * 100;
            // console.log("percent", percent);
            const question_rep = await BuildJsonForSkillCalciRequest(
              latestByTemplate
            );
            // console.log("question_rep", question_rep);
            return {
              id: subtopic.id,
              title: subtopic.title,
              percent: Math.round(percent > 100 ? 100 : percent),
              questions_report: [{ user_id: user.id, questions: question_rep }],
            };
          })
        );
        return res.status(200).json({ status: 200, data });
      } catch (error) {
        console.error("Login error:", error);
        return res
          .status(200)
          .json({ status: 500, message: "Internal server error", error });
      }
    });

    this.ReportsByLevel = asyncHandler(async (req, res) => {
      try {
        const user = req.session.user;
        const { level } = req.body;
        // const levels = await Level.findOne({
        //   where: {
        //     id: level,
        //     is_deleted: null,
        //   },
        // });

        // let templates = levels.game_templates;

        // if (!templates) {
        //   templates = [];
        // }

        // if (typeof templates === "string") {
        //   try {
        //     templates = JSON.parse(templates);
        //   } catch {
        //     templates = [];
        //   }
        // }

        // if (!Array.isArray(templates)) {
        //   templates = [];
        // }

        // templates = templates.filter((x) => x !== null && x !== undefined);
        // templates = templates.map(Number);
        // console.log("Final parsed templates =", templates);

        const subtopics = await Subtopic.findAll({
          where: {
            level: level,
            is_deleted: null,
          },
        });
        // console.log("subtopics", subtopics);

        const results = await Promise.all(
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

            templates = templates.filter((x) => x !== null && x !== undefined);
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
            const percent =
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
        const data = results.filter(Boolean);
        const averagedSkills = averageSkills(data);

        // console.log("data", data);
        // console.log("averagedSkills", averagedSkills);
        const fnl_skills = convertSkillObjectToArray(averagedSkills);
        return res.status(200).json({ status: 200, skills_report: fnl_skills });
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

module.exports = new ReportsController();
