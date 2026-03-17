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
const TestHistory = require("../../models/test_history");
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
const TopicsController = require("./TopicsController");
const OrgDetails = require("../../models/org_details");

class CertificateController {
  constructor() {
    // this.cerificateContent = asyncHandler(async (req, res) => {
    //   //   console.log("Body", req.body);
    //   const user = req.session.user;
    //   const { subjects } = req.body;
    //   const topics = await Topics.findAll({
    //     where: {
    //       subject: { [Op.in]: subjects },
    //       is_deleted: null,
    //     },
    //     order: [["sort_order", "ASC"]],
    //   });
    //   const data = await Promise.all(
    //     topics.map(async (value) => {
    //       const completedLevels = await TopicsController.LevelsCompletionsCount(
    //         user,
    //         value.id
    //       );
    //       return {
    //         id: value.id,
    //         subject: value.subject,
    //         title: value.title,
    //         description: value.description,
    //         thumbnail: value.thumbnail,
    //         levels: value.levels,
    //         comp_levels: completedLevels,
    //       };
    //     })
    //   );
    //   res.status(200).json({ status: 200, data });
    // });

    this.cerificateContent = asyncHandler(async (req, res) => {
      try {
        //   console.log("Body", req.body);
        const user = req.session.user;

        const formatDate = (date) => {
          if (!date) return null;
          const d = new Date(date);
          const day = String(d.getDate()).padStart(2, "0");
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const year = d.getFullYear();
          return `${day}-${month}-${year}`;
        };

        const test_history = await TestHistory.findOne({
          where: {
            is_deleted: null,
          },
          order: [["id", "DESC"]],
        });
        // console.log("test_history", test_history);

        const { subjects } = req.body;
        const subjects_dt = await Subjects.findAll({
          where: {
            // id: { [Op.in]: subjects },
            is_deleted: null,
          },
        });
        const loginuser = await LoginUsers.findOne({
          where: { id: user.id },
        });
        const sub_ids = JSON.parse(loginuser.subject);

        const levels = await Level.findAll({
          where: {
            is_deleted: null,
          },
        });
        // console.log("levels", levels);
        const data = await Promise.all(
          subjects_dt.map(async (subject_val) => {
            // console.log(
            //   "loginuser.org_id",
            //   loginuser.org_id,
            //   "subject_val.id",
            //   subject_val.id,
            //   "loginuser.standard",
            //   loginuser.standard,
            //   "loginuser.section",
            //   loginuser.section
            // );
            let lvl_ids = await OrgDetails.findOne({
              where: {
                org_id: loginuser.org_id,
                subject: subject_val.id,
                standard: loginuser.standard,
                section: loginuser.section,
                is_deleted: null,
              },
              attributes: ["level"],
            });
            lvl_ids = lvl_ids?.level || [];
            // console.log("lvl_ids", lvl_ids);
            const levels_dt = await Promise.all(
              levels.map(async (level_val) => {
                const topics = await Topics.findAll({
                  where: {
                    subject: subject_val.id,
                    level: level_val.id,
                    is_deleted: null,
                  },
                });

                const topic_dt = await Promise.all(
                  topics.map(async (topic_val) => {
                    const subtopics_dt = await subtopicWithCompletion(
                      user,
                      topic_val.id
                    );
                    return {
                      topic_id: topic_val.id,
                      name: topic_val.title,
                      is_completed: subtopics_dt.is_completed,
                      subtopics_data: subtopics_dt.data,
                    };
                  })
                );

                const completed_topics =
                  topic_dt.length > 0 &&
                  topic_dt.every((item) => item.is_completed === 1);

                return {
                  level_id: level_val.id,
                  name: level_val.level,
                  is_completed: completed_topics ? 1 : 0,
                  is_purchased: lvl_ids.includes(String(level_val.id)) ? 1 : 0,
                  topics: topic_dt,
                };
              })
            );

            const completed_levels =
              levels_dt.length > 0 &&
              levels_dt.every((item) => item.is_completed === 1);

            return {
              id: subject_val.id,
              name: subject_val.subject,
              is_completed: completed_levels ? 1 : 0,
              is_purchased: sub_ids.includes(String(subject_val.id)) ? 1 : 0,
              levels: levels_dt,
            };
          })
        );

        const completed_subs =
          data.length > 0 && data.every((item) => item.is_completed === 1);

        res.status(200).json({
          status: 200,
          is_completed: completed_subs ? 1 : 0,
          last_test_date: formatDate(test_history?.entered_at),
          data,
        });
      } catch (error) {
        console.error("Create Subtopic Error:", error);
        return res.status(200).json({
          status: 500,
          message: "Internal server error - " + error.message,
          error,
        });
      }
    });

    async function subtopicWithCompletion(user, topic) {
      try {
        const subtopics = await Subtopic.findAll({
          where: { topic, is_deleted: null },
          order: [["sort_order", "ASC"]],
        });
        const data = await Promise.all(
          subtopics.map(async (value, index) => {
            const catDataIds = JSON.parse(value.cat_data_ids || "[]");
            const categories = JSON.parse(value.category || "[]");

            const ques_type_ids = await Questions.findAll({
              where: {
                is_deleted: null,
                sub_topic: value.id,
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
            const ques_type = await QuestionType.findAll({
              where: {
                id: {
                  [Op.in]: templates,
                },
                is_deleted: null,
              },
            });
            const ques_ids = ques_type.map((q) => q.id);

            const history = await sequelize.query(
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
                  subtopic_id: value.id,
                  subtopicData: catDataIds.length ? catDataIds : [null], // avoid SQL error
                  category: categories.length ? categories : [null],
                },
                type: QueryTypes.SELECT,
              }
            );
            // console.log("index:" + index);
            // console.log("history length" + history.length);
            // console.log("cat length" + JSON.parse(value.category).length);
            // console.log("ques_type.length ", ques_type.length);
            // console.log("User id ", user.id);
            // console.log("subtopic id ", value.id);
            // console.log("question ids ", ques_ids);
            const testHistories = await TestHistory.findAll({
              where: {
                is_deleted: null,
                user_id: user.id,
                sub_topic: value.id,
                question_type: {
                  [Op.in]: ques_ids,
                },
              },
              attributes: ["question_type"],
              group: ["question_type"],
            });
            // console.log("testHistories length", testHistories.length);

            const is_completed =
              categories.length === history.length &&
              ques_type.length === testHistories.length
                ? true
                : false;

            const test_history = await TestHistory.findAll({
              where: {
                user_id: user.id,
                sub_topic: value.id,
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

            return {
              id: value.id,
              subject: value.subject,
              category: value.category,
              title: value.title,
              percent: Math.round(percent > 100 ? 100 : percent),
              is_completed: is_completed ? 1 : 0,
            };
          })
        );
        // console.log("data", data);
        const completed_dts =
          data.length > 0 && data.every((item) => item.is_completed === 1);
        // console.log("completed_dts", completed_dts);
        return {
          is_completed: completed_dts ? 1 : 0,
          data,
        };
      } catch (error) {
        console.error("Create Subtopic Error:", error);
        return res.status(200).json({
          status: 500,
          message: "Internal server error - " + error.message,
          error,
        });
      }
    }
  }
}

module.exports = new CertificateController();
