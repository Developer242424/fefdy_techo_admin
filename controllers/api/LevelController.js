const asyncHandler = require("express-async-handler");
const { check, validationResult } = require("express-validator");
const multer = require("multer");
const User = require("../../models/user");
const Subjects = require("../../models/subjects");
const Topics = require("../../models/topics");
const Level = require("../../models/level");
const Organisation = require("../../models/organisation");
const OrgDetails = require("../../models/org_details");
const WatchHistory = require("../../models/watchhistory");
const QuestionType = require("../../models/questiontype");
const Questions = require("../../models/questions");
const TestHistory = require("../../models/test_history");
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
const Subtopic = require("../../models/subtopic");

class LevelController {
  constructor() {
    this.data = asyncHandler(async (req, res) => {
      try {
        const user = req.session.user;
        const { topic } = req.body;
        const topics = await Topics.findOne({
          where: {
            id: topic,
            is_deleted: null,
          },
        });
        if (!topic) {
          return res
            .status(200)
            .json({ status: 400, message: "Topic ID is required" });
        }
        const org_details = await OrgDetails.findOne({
          where: {
            org_id: user.org_id,
            subject: topics.subject,
            standard: user.standard,
            section: user.section,
            is_deleted: null,
          },
        });
        // console.log(org_details);
        if (!org_details) {
          return res
            .status(200)
            .json({ status: 400, message: "Organisation details not found" });
        }
        const levels = await Level.findAll({
          where: { topic, is_deleted: null },
          order: [["level", "ASC"]],
        });
        const ques_type = await QuestionType.findAll({
          where: {
            is_deleted: null,
          },
        });
        const ques_ids = ques_type.map((q) => q.id);
        const data = await Promise.all(
          levels.map(async (value) => {
            const subtopic = await Subtopic.findAll({
              where: {
                level_id: value.id,
                is_deleted: null,
              },
            });

            let completedCount = 0;
            // console.log("Subtopic count::::"+subtopic.length);
            for (const sub of subtopic) {
              const categories = JSON.parse(sub.category || "[]");
              const subtopic_datas = JSON.parse(sub.cat_data_ids || "[]");

              if (subtopic_datas.length > 0 && categories.length > 0) {
                const watch_history_one = await sequelize.query(
                  `
    SELECT *
    FROM (
      SELECT *,
             ROW_NUMBER() OVER (PARTITION BY category ORDER BY id DESC) AS row_num
      FROM watch_history
      WHERE org_id = :org_id
        AND user_id = :user_id
        AND subtopic = :subtopic_id
        AND subtopic_data IN (:subtopicData)
        AND category IN (:category)
        AND is_deleted IS NULL
        AND status = '1'
    ) AS t
    WHERE row_num = 1
    `,
                  {
                    replacements: {
                      org_id: user.org_id,
                      user_id: user.id,
                      subtopic_id: sub.id,
                      subtopicData: subtopic_datas,
                      category: categories,
                    },
                    type: QueryTypes.SELECT,
                  }
                );
                const testHistories = await TestHistory.findAll({
                  where: {
                    is_deleted: null,
                    user_id: user.id,
                    sub_topic: sub.id,
                    question_type: {
                      [Op.in]: ques_ids,
                    },
                  },
                  attributes: ["question_type"],
                  group: ["question_type"],
                });
                if (
                  watch_history_one.length === categories.length &&
                  ques_type.length === testHistories.length
                ) {
                  completedCount++;
                }
              }
            }
            // console.log("Completed count:::"+completedCount)

            return {
              id: value.id,
              subject: value.subject,
              topic: value.topic,
              level: value.level,
              title: value.title,
              description: value.description,
              thumbnail: value.thumbnail,
              is_enabled: value.level <= org_details.levels ? 0 : null,
              is_completed:
                subtopic.length > 0
                  ? subtopic.length === completedCount
                    ? 1
                    : 0
                  : 0,
            };
          })
        );

        return res.status(200).json({ status: 200, data });
      } catch (error) {
        return res.status(200).json({
          status: 500,
          message: "Internal server error - " + error.message,
          error,
        });
      }
    });
  }
}

module.exports = new LevelController();
