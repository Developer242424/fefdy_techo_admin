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

    this.Reports = asyncHandler(async (req, res) => {
      try {
        const user = req.session.user;
        const { topic } = req.body;

        /** ───────────────────────────────────────────
         *  TOPIC + LEVEL LOAD
         * ─────────────────────────────────────────── */
        const topic_data = await Topics.findOne({
          where: { id: topic, is_deleted: null },
        });
        if (!topic_data)
          return res.json({ status: 404, message: "Topic not found" });

        const level = await Level.findOne({
          where: { id: topic_data.level, is_deleted: null },
        });

        /** ───────────────────────────────────────────
         *  PARSE TEMPLATE IDS
         * ─────────────────────────────────────────── */
        let templates = level?.game_templates ?? [];
        if (typeof templates === "string") {
          try {
            templates = JSON.parse(templates);
          } catch {
            templates = [];
          }
        }
        templates = Array.isArray(templates)
          ? templates.filter((x) => x != null).map(Number)
          : [];

        if (templates.length === 0) return res.json({ status: 200, data: [] });

        /** ───────────────────────────────────────────
         *  SUBTOPICS LOAD
         * ─────────────────────────────────────────── */
        const subtopics = await Subtopic.findAll({
          where: {
            topic: topic_data.id,
            level: topic_data.level,
            is_deleted: null,
          },
        });

        const subtopicIds = subtopics.map((s) => s.id);
        if (!subtopicIds.length) return res.json({ status: 200, data: [] });

        /** ───────────────────────────────────────────
         *  LOAD ALL TEST HISTORIES IN ONE CALL
         * ─────────────────────────────────────────── */
        const testHistories = await TestHistory.findAll({
          where: {
            user_id: user.id,
            sub_topic: subtopicIds,
            is_deleted: null,
          },
          order: [["id", "DESC"]],
          attributes: [
            "id",
            "sub_topic",
            "question_type",
            "question_ids",
            "correct_ans",
            "wrong_ans",
          ],
        });

        /** ───────────────────────────────────────────
         *  BUILD FAST MAPS
         * ─────────────────────────────────────────── */

        // last history per subtopic + template
        const historyMap = new Map();
        // all question IDs from all histories
        const allQids = new Set();

        for (const h of testHistories) {
          const key = `${h.sub_topic}_${h.question_type}`;
          if (!historyMap.has(key)) historyMap.set(key, h);

          if (Array.isArray(h.question_ids)) {
            for (const q of h.question_ids) allQids.add(q);
          }
        }

        const allQuestionIds = [...allQids];
        if (!allQuestionIds.length) return res.json({ status: 200, data: [] });

        /** ───────────────────────────────────────────
         *  BULK LOAD ATTEMPTS (2 last per question)
         * ─────────────────────────────────────────── */
        const attempts = await AttendedTestQuestion.findAll({
          where: { question_id: allQuestionIds },
          order: [
            ["question_id", "ASC"],
            ["is_entered", "DESC"],
          ],
          attributes: [
            "question_id",
            "question",
            "is_correct",
            "comp_time",
            "is_entered",
          ],
        });

        // group question attempts
        const attemptMap = new Map();
        for (const att of attempts) {
          if (!attemptMap.has(att.question_id))
            attemptMap.set(att.question_id, []);
          const arr = attemptMap.get(att.question_id);
          if (arr.length < 2) arr.push(att); // keep only last 2
        }

        /** ───────────────────────────────────────────
         *  BUILD FINAL RESPONSE FOR EACH SUBTOPIC
         * ─────────────────────────────────────────── */
        const resultData = [];

        for (const sub of subtopics) {
          /** Collect questions */
          const historiesForSub = testHistories.filter(
            (h) => h.sub_topic === sub.id
          );

          const subQids = new Set();
          for (const h of historiesForSub) {
            if (Array.isArray(h.question_ids)) {
              for (const q of h.question_ids) subQids.add(q);
            }
          }

          // build question stats
          const questions = [];
          for (const qid of subQids) {
            const arr = attemptMap.get(qid) || [];
            const last = arr[0] || null;
            const second = arr[1] || null;

            const convert = (a) =>
              a ? (a.is_correct == 1 ? "wrong" : "correct") : "unknown";

            const questionText =
              last?.question || second?.question || "Unknown Question";

            questions.push({
              question: questionText.trim(),
              last_complete_time: Number(last?.comp_time || 0),
              second_last_complete_time: Number(second?.comp_time || 0),
              last_result: convert(last),
              second_last_result: convert(second),
            });
          }

          /** ML skills call */
          let skills = [];
          if (questions.length)
            skills = await getSkillsReportByML([
              { user_id: user.id, questions },
            ]);

          /** Percent calculation */
          let percents = [];
          for (const tpl of templates) {
            const h = historyMap.get(`${sub.id}_${tpl}`);
            if (!h) {
              percents.push(0);
              continue;
            }
            const total = h.correct_ans + h.wrong_ans;
            percents.push(total === 0 ? 0 : (h.correct_ans / total) * 100);
          }

          const totalPercent =
            percents.reduce((a, b) => a + b, 0) / (percents.length || 1);

          resultData.push({
            id: sub.id,
            title: sub.title,
            percent: Math.round(Math.min(totalPercent, 100)),
            skill_report: convertSkillObjectToArray(
              skills[0]?.overall_skill_improvements
            ),
          });
        }

        return res.status(200).json({ status: 200, data: resultData });
      } catch (error) {
        console.error("Reports error:", error);
        return res.json({
          status: 500,
          message: "Internal server error",
          error,
        });
      }
    });

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
      const safeObj = skillObj && typeof skillObj === "object" ? skillObj : {};
      return Object.entries(safeObj).map(([key, value]) => ({
        skill: key,
        value: Math.round(Number(value) || 0),
      }));
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

    this.ReportsAsMarks = asyncHandler(async (req, res) => {
      try {
        const user = req.session.user;
        const { topic } = req.body;

        // Fetch topic & level
        const topic_data = await Topics.findOne({
          where: { id: topic, is_deleted: null },
          raw: true,
        });

        const level = await Level.findOne({
          where: { id: topic_data.level, is_deleted: null },
          raw: true,
        });

        // Parse templates safely
        let templates = level.game_templates || [];
        if (typeof templates === "string") {
          try {
            templates = JSON.parse(templates);
          } catch {
            templates = [];
          }
        }
        if (!Array.isArray(templates)) templates = [];
        templates = templates.filter((x) => x != null).map(Number);

        // Preload question types
        const question_types = await QuestionType.findAll({
          where: { id: { [Op.in]: templates }, is_deleted: null },
          raw: true,
        });

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
  }
}

module.exports = new ReportsController();
