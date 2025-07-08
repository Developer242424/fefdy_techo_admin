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

class CertificateController {
  constructor() {
    this.cerificateContent = asyncHandler(async (req, res) => {
      //   console.log("Body", req.body);
      const { subjects } = req.body;
      const topic = Topics.findAll({
        where: {
          subject: { [Op.in]: subjects },
          is_deleted: null,
        },
      });
      console.log(topic);
    });
  }
}

module.exports = new CertificateController();
