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
const { connect } = require("http2");

class QuestionsController {
  constructor() {
    this.QuestionTypeList = asyncHandler(async (req, res) => {
      try {
        const user = req.session.user;
        const { subtopic } = req.body;
        const question_types = await QuestionType.findAll({
          where: {
            is_deleted: null,
          },
        });
        const data = await Promise.all(
          question_types.map(async (value, index) => {
            const test_history = await TestHistory.findOne({
              where: {
                user_id: user.id,
                sub_topic: subtopic,
                question_type: value.id,
                is_deleted: null,
              },
            });
            return {
              id: value.id,
              type: value.type,
              thumbnail: value.thumbnail,
              template: value.template,
              is_completed: test_history ? 1 : 0,
            };
          })
        );
        return res.status(200).json({ status: 200, data });
      } catch (error) {
        console.error("Create Subtopic Error:", error);
        return res.status(200).json({
          status: 500,
          message: "Internal server error - " + error.message,
          error,
        });
      }
    });
  }
}

module.exports = new QuestionsController();
