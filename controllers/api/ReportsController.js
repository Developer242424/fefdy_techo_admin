const asyncHandler = require("express-async-handler");
const { check, validationResult } = require("express-validator");
const multer = require("multer");
const User = require("../../models/user");
const Subjects = require("../../models/subjects");
const Topics = require("../../models/topics");
const Level = require("../../models/level");
const Subtopic = require("../../models/subtopic");
const CategoryData = require("../../models/categorydata");
const Category = require("../../models/category");
const WatchHistory = require("../../models/watchhistory");
const LoginUsers = require("../../models/loginusers");
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
  }
}

module.exports = new ReportsController();
