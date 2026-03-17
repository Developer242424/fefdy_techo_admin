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
const WatchHistory = require("../../models/watchhistory");
const LoginUsers = require("../../models/loginusers");
const AttendedTestQuestion = require("../../models/attendedtestquestion");
const { sequelize } = require("../../models");
const { QueryTypes } = require("sequelize");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { where, Sequelize, DATE, Op } = require("sequelize");
const { render } = require("ejs");
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

    this.Reports = asyncHandler(async (req, res) => {
      try {
        // console.log("Body", req.body);
        const user = req.session.user;
        // console.log(user);
        const { topic } = req.body;
        const topic_data = await Topics.findOne({
          where: {
            id: topic,
            is_deleted: null,
          },
        });
        const level = await Level.findOne({
          where: {
            id: topic_data.level,
            is_deleted: null,
          },
        });
        // console.log("level", level);
        // console.log("level.game_templates =", level.game_templates);
        // console.log("Type:", typeof level.game_templates);
        let templates = level.game_templates;

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

        // console.log("Final parsed templates =", templates);
        const question_types = await QuestionType.findAll({
          where: {
            id: {
              [Op.in]: templates,
            },
            is_deleted: null,
          },
        });
        // console.log("question_types", question_types);
        const subtopics = await Subtopic.findAll({
          where: {
            topic: topic_data.id,
            level: topic_data.level,
            is_deleted: null,
          },
        });
        // console.log("subtopics.length", subtopics.length);
        const data = await Promise.all(
          subtopics.map(async (subtopic) => {
            const skills = await SkillReportOfUserBySubtopic(
              user.id,
              subtopic.id
            );
            const percents = await Promise.all(
              templates.map(async (id) => {
                const test_history = await TestHistory.findOne({
                  where: {
                    user_id: user.id,
                    sub_topic: subtopic.id,
                    question_type: id,
                    is_deleted: null,
                  },
                  order: [["id", "DESC"]],
                });
                if (!test_history) return 0;
                const ttl_mark =
                  test_history.correct_ans + test_history.wrong_ans;
                if (ttl_mark === 0) return 0;
                return (test_history.correct_ans / ttl_mark) * 100;
              })
            );

            const ttl_percent =
              percents.reduce((sum, p) => sum + p, 0) / percents.length;

            return {
              id: subtopic.id,
              title: subtopic.title,
              percent: Math.round(ttl_percent > 100 ? 100 : ttl_percent),
              skill_report: convertSkillObjectToArray(
                skills[0]?.overall_skill_improvements
              ),
            };
          })
        );
        return res.status(200).json({ status: 200, data: data });
      } catch (error) {
        console.error("Login error:", error);
        return res
          .status(200)
          .json({ status: 500, message: "Internal server error", error });
      }
    });

    async function SkillReportOfUserBySubtopic(userId, subtopicId) {
      try {
        // console.log("userid", userId);
        // console.log("subtopic", subtopicId);

        const histories = await TestHistory.findAll({
          where: {
            user_id: userId,
            sub_topic: subtopicId,
            is_deleted: null,
          },
          attributes: ["question_ids"],
          raw: true,
        });

        const questionIdsArray = histories
          .map((h) => (Array.isArray(h.question_ids) ? h.question_ids : []))
          .flat();

        const uniqueQuestionIds = [...new Set(questionIdsArray)];

        // console.log("questionIdsArray", questionIdsArray);
        // console.log("uniqueQuestionIds", uniqueQuestionIds);

        // PREVENT API CALL WHEN EMPTY
        if (uniqueQuestionIds.length === 0) {
          return [
            {
              user_id: userId,
              questions: [],
              overall_skill_improvements: {},
            },
          ];
        }

        const questions = (
          await Promise.all(
            uniqueQuestionIds.map(async (qid) => {
              const attempts = await AttendedTestQuestion.findAll({
                where: { question_id: qid },
                order: [["is_entered", "DESC"]],
                limit: 2,
                raw: true,
              });

              const last = attempts[0] || null;
              const secondLast = attempts[1] || null;

              const convert = (a) =>
                a ? (a.is_correct == 1 ? "wrong" : "correct") : null;

              return {
                // question_id: qid,
                question: (
                  last?.question ||
                  secondLast?.question ||
                  "Unknown Question"
                ).trim(),
                last_complete_time: Number(last?.comp_time ?? 0),
                second_last_complete_time: Number(secondLast?.comp_time ?? 0),
                last_result: convert(last) || "unknown",
                second_last_result: convert(secondLast) || "unknown",
              };
            })
          )
        ).filter((q) => q.question && q.question.trim().length > 0);

        const final = [
          {
            user_id: userId,
            questions,
          },
        ];
        // console.log(JSON.stringify(final, null, 2));
        let skills = [];
        if (final[0].questions.length > 0) {
          skills = await getSkillsReportByML(final);
        }

        return skills;
      } catch (error) {
        console.error("SkillReportOfUserBySubtopic ERROR:", error);
        return { status: 500, error };
      }
    }

    async function getSkillsReportByML(data) {
      try {
        // console.log("data", data);
        const res = await axios.post(
          "https://skillcalci.fefdybraingym.com/calci/skills-calci",
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
      return Object.entries(skillObj).map(([key, value]) => {
        return {
          skill: key,
          value: Math.round(Number(value) || 0),
        };
      });
    }

    this.ReportsByLevel = asyncHandler(async (req, res) => {
      try {
        const user = req.session.user;
        const { level } = req.body;
        const histories = await TestHistory.findAll({
          where: {
            user_id: user.id,
            level: level,
            is_deleted: null,
          },
          attributes: ["question_ids"],
          raw: true,
        });

        const questionIdsArray = histories
          .map((h) => (Array.isArray(h.question_ids) ? h.question_ids : []))
          .flat();

        const uniqueQuestionIds = [...new Set(questionIdsArray)];

        // console.log("questionIdsArray", questionIdsArray);
        // console.log("uniqueQuestionIds", uniqueQuestionIds);

        // PREVENT API CALL WHEN EMPTY
        if (uniqueQuestionIds.length === 0) {
          return [
            {
              user_id: user.id,
              questions: [],
              overall_skill_improvements: {},
            },
          ];
        }

        const questions = (
          await Promise.all(
            uniqueQuestionIds.map(async (qid) => {
              const attempts = await AttendedTestQuestion.findAll({
                where: { question_id: qid },
                order: [["is_entered", "DESC"]],
                limit: 2,
                raw: true,
              });

              const last = attempts[0] || null;
              const secondLast = attempts[1] || null;

              const convert = (a) =>
                a ? (a.is_correct == 1 ? "wrong" : "correct") : null;

              return {
                // question_id: qid,
                question: (
                  last?.question ||
                  secondLast?.question ||
                  "Unknown Question"
                ).trim(),
                last_complete_time: Number(last?.comp_time ?? 0),
                second_last_complete_time: Number(secondLast?.comp_time ?? 0),
                last_result: convert(last) || "unknown",
                second_last_result: convert(secondLast) || "unknown",
              };
            })
          )
        ).filter((q) => q.question && q.question.trim().length > 0);

        const final = [
          {
            user_id: user.id,
            questions,
          },
        ];
        // console.log(JSON.stringify(final, null, 2));
        let skills = [];
        if (final[0].questions.length > 0) {
          skills = await getSkillsReportByML(final);
        }
        // console.log(JSON.stringify(skills, null, 2))
        const fnl_skills = convertSkillObjectToArray(
          skills[0]?.overall_skill_improvements
        );
        return res.status(200).json({ status: 200, skills_report: fnl_skills });
      } catch (error) {
        console.error("Login error:", error);
        return res
          .status(200)
          .json({ status: 500, message: "Internal server error", error });
      }
    });
  }
}

module.exports = new ReportsController();
