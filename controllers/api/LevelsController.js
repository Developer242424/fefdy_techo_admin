const asyncHandler = require("express-async-handler");
const { check, validationResult } = require("express-validator");
const multer = require("multer");
const User = require("../../models/user");
const LoginUsers = require("../../models/loginusers");
const Topics = require("../../models/topics");
const Subtopic = require("../../models/subtopic");
const Level = require("../../models/level");
const CategoryData = require("../../models/categorydata");
const Category = require("../../models/category");
const WatchHistory = require("../../models/watchhistory");
const QuestionType = require("../../models/questiontype");
const Questions = require("../../models/questions");
const TestHistory = require("../../models/test_history");
const OrgDetails = require("../../models/org_details");
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
const { login } = require("./AuthController");

class LevelsController {
  constructor() {
    this.data = asyncHandler(async (req, res) => {
      const user = req.session.user;
      const { subject } = req.body;
      if (!subject)
        return res
          .status(400)
          .json({ status: 400, message: "Subject is required" });
      const loginuser = await LoginUsers.findOne({
        where: { id: user.id },
      });
      let org_details = [];
      if (loginuser.type == "individual") {
        org_details = await OrgDetails.findAll({
          where: {
            is_deleted: null,
            user_id: loginuser.id,
            subject: subject,
          },
        });
      } else {
        org_details = await OrgDetails.findAll({
          where: {
            is_deleted: null,
            org_id: loginuser.org_id,
            standard: loginuser.standard,
            section: loginuser.section,
            subject: subject,
          },
        });
      }
      //   console.log("org details", org_details);
      let lvl_ids = org_details
        .flatMap((value) => {
          if (!value.level) return [];
          return Array.isArray(value.level)
            ? value.level
            : JSON.parse(value.level);
        })
        .filter((v, i, a) => v && a.indexOf(v) === i);

      //   console.log("level ids", lvl_ids);

      const levels = await Level.findAll({
        where: {
          is_deleted: null,
        },
      });
      //   console.log("all levels", levels);

      const data = await Promise.all(
        levels.map(async (value) => {
          // const is_completed = await this.LevelsCompletionsCount(user, value);
          const percentage = await this.LevelsCompletionsCountPercentage(
            user,
            value
          );
          return {
            id: value.id,
            level: value.level,
            is_purchased: lvl_ids.includes(String(value.id)) ? 1 : 0,
            // is_completed: is_completed ? 1 : 0,
            percentage: percentage,
          };
        })
      );
      return res.status(200).json({ status: 200, data });
    });
  }

  LevelsCompletionsCountPercentage = async (user, level) => {
    try {
      if (!level) {
        throw new Error("Level ID is required");
      }

      let totalUnits = 0;
      let completedUnits = 0;

      const topics = await Topics.findAll({
        where: { level: level.id, is_deleted: null },
      });

      if (!topics.length) {
        return 0;
      }

      for (const topic of topics) {
        const subtopics = await Subtopic.findAll({
          where: {
            level: level.id,
            topic: topic.id,
            is_deleted: null,
          },
        });

        for (const subtopic of subtopics) {
          /* =======================
           PAGE COMPLETION
        ======================== */

          totalUnits += 1;

          const categories = JSON.parse(subtopic.category || "[]");

          let pageCompleted = false;

          if (categories.length) {
            const watchHistory = await WatchHistory.findAll({
              where: {
                user_id: user.id,
                subtopic: subtopic.id,
                category: { [Op.in]: categories },
                status: "1",
                is_deleted: null,
              },
              attributes: ["category"],
              group: ["category"],
            });

            if (watchHistory.length === categories.length) {
              pageCompleted = true;
              completedUnits += 1;
            }
          }

          /* =======================
           TEST COMPLETION
        ======================== */

          totalUnits += 1;

          let testCompleted = false;

          const quesTypesData = await Questions.findAll({
            where: {
              topic: topic.id,
              sub_topic: subtopic.id,
              is_deleted: null,
            },
            attributes: ["question_type"],
            group: ["question_type"],
          });

          if (quesTypesData.length) {
            const whQuesTypesData = await TestHistory.findAll({
              where: {
                user_id: user.id,
                topic: topic.id,
                sub_topic: subtopic.id,
                is_deleted: null,
              },
              attributes: ["question_type"],
              group: ["question_type"],
            });

            if (whQuesTypesData.length === quesTypesData.length) {
              testCompleted = true;
              completedUnits += 1;
            }
          }
        }
      }

      const percentage = totalUnits
        ? Math.round((completedUnits / totalUnits) * 100)
        : 0;

      return percentage;
    } catch (error) {
      console.error("LevelsCompletionsCount Error:", error);
      throw error;
    }
  };

  // LevelsCompletionsCount = async (user, level) => {
  //   try {
  //     if (!level) {
  //       throw new Error("Level ID is required");
  //     }

  //     // Start optimistic
  //     let is_page_completed = true;
  //     let is_test_completed = true;

  //     const topics = await Topics.findAll({
  //       where: { level: level.id, is_deleted: null },
  //     });

  //     // If no topics → nothing completed
  //     if (!topics.length) {
  //       is_page_completed = false;
  //       is_test_completed = false;
  //     }

  //     for (const topic of topics) {
  //       const subtopics = await Subtopic.findAll({
  //         where: {
  //           level: level.id,
  //           topic: topic.id,
  //           is_deleted: null,
  //         },
  //       });

  //       if (!subtopics.length) {
  //         is_page_completed = false;
  //         is_test_completed = false;
  //       }

  //       for (const subtopic of subtopics) {
  //         /* =======================
  //          PAGE COMPLETION CHECK
  //       ======================== */

  //         const categories = JSON.parse(subtopic.category || "[]");

  //         if (!categories.length) {
  //           is_page_completed = false;
  //         }

  //         const watchHistory = await WatchHistory.findAll({
  //           where: {
  //             user_id: user.id,
  //             subtopic: subtopic.id,
  //             category: { [Op.in]: categories },
  //             status: "1",
  //             is_deleted: null,
  //           },
  //           attributes: ["category"],
  //           group: ["category"],
  //         });

  //         // console.log(
  //         //   `Categories length: ${level.level}, ${topic.title}, ${subtopic.title}`,
  //         //   categories.length
  //         // );
  //         // console.log(
  //         //   `Watch History length: ${level.level}, ${topic.title}, ${subtopic.title}`,
  //         //   watchHistory.length
  //         // );

  //         if (watchHistory.length !== categories.length) {
  //           is_page_completed = false;
  //         }

  //         /* =======================
  //          TEST COMPLETION CHECK
  //       ======================== */

  //         const quesTypesData = await Questions.findAll({
  //           where: {
  //             topic: topic.id,
  //             sub_topic: subtopic.id,
  //             is_deleted: null,
  //           },
  //           attributes: ["question_type"],
  //           group: ["question_type"],
  //         });

  //         if (!quesTypesData.length) {
  //           is_test_completed = false;
  //         }

  //         const whQuesTypesData = await TestHistory.findAll({
  //           where: {
  //             user_id: user.id,
  //             topic: topic.id,
  //             sub_topic: subtopic.id,
  //             is_deleted: null,
  //           },
  //           attributes: ["question_type"],
  //           group: ["question_type"],
  //         });

  //         if (whQuesTypesData.length !== quesTypesData.length) {
  //           is_test_completed = false;
  //         }
  //       }
  //     }

  //     // return { is_page_completed, is_test_completed };
  //     return is_page_completed && is_test_completed;
  //   } catch (error) {
  //     console.error("LevelsCompletionsCount Error:", error);
  //     throw error;
  //   }
  // };

  // LevelsCompletionsCount = async (user, level) => {
  //   try {
  //     let is_page_completed = false;
  //     let is_test_completed = false;

  //     if (!level) {
  //       throw new Error("Level ID is required");
  //     }
  //     const topics = await Topics.findAll({
  //       where: { level: level.id, is_deleted: null },
  //     });

  //     for (const topic of topics) {
  //       const subtopics = await Subtopic.findAll({
  //         where: {
  //           level: level.id,
  //           topic: topic.id,
  //           is_deleted: null,
  //         },
  //       });
  //       for (const subtopic of subtopics) {
  //         // for page completion
  //         const categories = JSON.parse(subtopic.category || "[]");
  //         const watchHistory = await WatchHistory.findAll({
  //           where: {
  //             user_id: user.id,
  //             subtopic: subtopic.id,
  //             category: {
  //               [Op.in]: categories,
  //             },
  //             status: "1",
  //             is_deleted: null,
  //           },
  //           group: ["category"],
  //         });
  //         // console.log(
  //         //   `Watch History: ${level.level}, ${topic.title}, ${subtopic.title}`,
  //         //   watchHistory
  //         // );
  //         console.log(
  //           `Categories length: ${level.level}, ${topic.title}, ${subtopic.title}`,
  //           categories.length
  //         );
  //         console.log(
  //           `Watch History length: ${level.level}, ${topic.title}, ${subtopic.title}`,
  //           watchHistory.length
  //         );
  //         if (
  //           categories.length === watchHistory.length &&
  //           categories.length > 0
  //         ) {
  //           is_page_completed = true;
  //         } else {
  //           is_page_completed = false;
  //         }

  //         // for test completion
  //         const quesTypesData = await Questions.findAll({
  //           where: {
  //             topic: topic.id,
  //             sub_topic: subtopic.id,
  //             is_deleted: null,
  //           },
  //           group: ["question_type"],
  //           attributes: [
  //             "question_type",
  //             [fn("COUNT", Sequelize.col("id")), "total_questions"],
  //           ],
  //         });
  //         // console.log(
  //         //   `Question Types: ${level.level}, ${topic.title}, ${subtopic.title}`,
  //         //   quesTypesData
  //         // );
  //         // console.log(
  //         //   `Question length: ${level.level}, ${topic.title}, ${subtopic.title}`,
  //         //   quesTypesData.length
  //         // );
  //         const whQuesTypesData = await TestHistory.findAll({
  //           where: {
  //             user_id: user.id,
  //             topic: topic.id,
  //             sub_topic: subtopic.id,
  //             is_deleted: null,
  //           },
  //           group: ["question_type"],
  //           attributes: [
  //             "question_type",
  //             [fn("COUNT", Sequelize.col("id")), "total_questions"],
  //           ],
  //         });
  //         // console.log(
  //         //   `Test History Question Types: ${topic.title}, ${subtopic.title}`,
  //         //   whQuesTypesData
  //         // );
  //         // console.log(
  //         //   `Test History Question length: ${topic.title}, ${subtopic.title}`,
  //         //   whQuesTypesData.length
  //         // );
  //         if (
  //           quesTypesData.length === whQuesTypesData.length &&
  //           quesTypesData.length > 0
  //         ) {
  //           is_test_completed = true;
  //         } else {
  //           is_test_completed = false;
  //         }
  //       }
  //     }

  //     return { is_page_completed, is_test_completed };
  //   } catch (error) {
  //     console.error("Create Subtopic Error:", error);
  //     throw error;
  //   }
  // };
}

module.exports = new LevelsController();