const asyncHandler = require("express-async-handler");
const { check, validationResult } = require("express-validator");
const multer = require("multer");
const User = require("../models/user");
const LoginUsers = require("../models/loginusers");
const Subjects = require("../models/subjects");
const Topics = require("../models/topics");
const Level = require("../models/level");
const Category = require("../models/category");
const QuestionType = require("../models/questiontype");
const Questions = require("../models/questions");
const TestHistory = require("../models/test_history");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { where, Sequelize, DATE, Op } = require("sequelize");
const { render } = require("ejs");
require("dotenv").config();
const session = require("express-session");
const getDynamicUploader = require("../middleware/upload");
const moment = require("moment");
const { fn } = require("sequelize");
const path = require("path");
const fs = require("fs");
const { title } = require("process");
const { data } = require("./SubtopicController");
let previouslyServedIds = new Set();

class ActivityController {
  constructor() {
    this.getQuestions = asyncHandler(async (req, res) => {
      try {
        // console.log("Body....", req.body);
        const { sid, tid, lid, stid, qid, ust } = req.body;
        const questionsData = await Questions.findAll({
          where: {
            subject: sid,
            topic: tid,
            level_id: lid,
            sub_topic: stid,
            question_type: qid,
            is_deleted: null,
            id: {
              [Op.notIn]: Array.from(previouslyServedIds),
            },
          },
          order: [Sequelize.literal("RAND()")],
          limit: 5,
          raw: true,
        });

        // questionsData.forEach((q) => previouslyServedIds.add(q.id));
        const formattedQuestions = questionsData.map((qItem) => {
          const rawData = qItem.data || {};
          const options = [];
          const correct = [];

          const optionKeys = ["option_a", "option_b", "option_c", "option_d"];

          optionKeys.forEach((key, index) => {
            const opt = rawData.option?.[key];
            if (!opt) return;

            options.push({
              text: opt.text || "",
              image: opt.thumbnail || "",
            });

            if (opt.is_answer === "on" || opt.is_answer === true) {
              correct.push(index);
            }
          });

          return {
            questionid: qItem.id || "",
            question: rawData.question?.text || "",
            image: rawData.question?.thumbnail || "",
            options,
            correct: correct.length === 1 ? [correct[0]] : correct,
          };
        });

        return res.json(formattedQuestions);
      } catch (error) {
        console.error("Error fetching random questions:", error);
        return res.status(500).json({
          message: "Internal server error",
          error,
        });
      }
    });

    this.entryHistory = asyncHandler(async (req, res) => {
      try {
        const {
          sid,
          tid,
          lid,
          stid,
          qid,
          ust,
          correctAnswers,
          wrongAnswers,
          totalTime,
          questionIds,
        } = req.body;
        // console.log("Body....", req.body);
        const user = await LoginUsers.findOne({
          where: {
            web_token: ust,
          },
        });
        // console.log("user....", user);
        const obj = {
          user_id: user.id,
          subject: sid,
          topic: tid,
          level_id: lid,
          sub_topic: stid,
          question_type: qid,
          question_ids: questionIds,
          correct_ans: correctAnswers,
          wrong_ans: wrongAnswers,
          time_taken: totalTime,
        };
        // console.log("obj....", obj);
        await TestHistory.create(obj);
        return res
          .status(200)
          .json({ status: 200, message: "Successfully added" });
      } catch (error) {
        console.error("Error fetching random questions:", error);
        return res.status(500).json({
          message: "Internal server error",
          error,
        });
      }
    });

    this.getQuestionsMatchup = asyncHandler(async (req, res) => {
      try {
        // console.log("Body....", req.body);
        const { sid, tid, lid, stid, qid, ust } = req.body;
        const questionsData = await Questions.findAll({
          where: {
            subject: sid,
            topic: tid,
            level_id: lid,
            sub_topic: stid,
            question_type: qid,
            is_deleted: null,
            id: {
              [Op.notIn]: Array.from(previouslyServedIds),
            },
          },
          order: [Sequelize.literal("RAND()")],
          limit: 1,
          raw: true,
        });

        // console.log("Questions match  up", questionsData)
        // console.log("Questions match  up onedata only", questionsData[0].data)
        const rawGameData = questionsData[0].data;

        const transformedGameData = rawGameData.map((item, index) => {
          if (index === 0 && item.question) {
            return {
              questionid: [questionsData[0].id],
              question: item.question,
            };
          }

          const left = item.is_euqal_one || {};
          const right = item.is_euqal_two || {};

          const leftText = left.text || "";
          const leftThumbnail = left.thumbnail || "";

          const rightText = right.text || "";
          const rightThumbnail = right.thumbnail || "";

          return {
            instruction: item.instruction,
            is_equal_one: {
              text: leftText,
              thumbnail: leftThumbnail,
            },
            is_equal_two: {
              text: rightText,
              thumbnail: rightThumbnail,
            },
          };
        });

        return res.json(transformedGameData);
      } catch (error) {
        console.error("Error fetching random questions:", error);
        return res.status(500).json({
          message: "Internal server error",
          error,
        });
      }
    });

    this.getQuestionsDragDropOne = asyncHandler(async (req, res) => {
      try {
        // console.log("Body....", req.body);
        const { sid, tid, lid, stid, qid, ust } = req.body;
        const questionsData = await Questions.findOne({
          where: {
            subject: sid,
            topic: tid,
            level_id: lid,
            sub_topic: stid,
            question_type: qid,
            is_deleted: null,
            id: {
              [Op.notIn]: Array.from(previouslyServedIds),
            },
          },
          order: [Sequelize.literal("RAND()")],
          limit: 1,
          raw: true,
        });

        // console.log("Questions match  up", questionsData)
        // console.log("Questions match  up onedata only", questionsData[0].data)
        const rawGameData = questionsData.data;
        const transformedGameData = rawGameData.map((item, index) => {
          if (index === 0 && item.question) {
            return {
              questionid: [questionsData.id],
              question: item.question,
            };
          }

          return {
            name: item.name,
            images: item.images || [],
          };
        });

        return res.json(transformedGameData);
      } catch (error) {
        console.error("Error fetching random questions:", error);
        return res.status(500).json({
          message: "Internal server error",
          error,
        });
      }
    });
  }
}

module.exports = new ActivityController();
