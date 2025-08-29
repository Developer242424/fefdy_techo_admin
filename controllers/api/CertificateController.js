const asyncHandler = require("express-async-handler");
const { check, validationResult } = require("express-validator");
const multer = require("multer");
const User = require("../../models/user");
const Subjects = require("../../models/subjects");
const Topics = require("../../models/topics");
const LoginUsers = require("../../models/loginusers");
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

class CertificateController {
  constructor() {
    this.cerificateContent = asyncHandler(async (req, res) => {
      //   console.log("Body", req.body);
      const user = req.session.user;
      const { subjects } = req.body;
      const topics = await Topics.findAll({
        where: {
          subject: { [Op.in]: subjects },
          is_deleted: null,
        },
        order: [["sort_order", "ASC"]],
      });
      const data = await Promise.all(
        topics.map(async (value) => {
          const completedLevels = await TopicsController.LevelsCompletionsCount(
            user,
            value.id
          );
          return {
            id: value.id,
            subject: value.subject,
            title: value.title,
            description: value.description,
            thumbnail: value.thumbnail,
            levels: value.levels,
            comp_levels: completedLevels,
          };
        })
      );
      res.status(200).json({ status: 200, data });
    });
  }
}

module.exports = new CertificateController();
