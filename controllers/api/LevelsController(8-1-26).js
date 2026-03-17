const asyncHandler = require("express-async-handler");
const { check, validationResult } = require("express-validator");
const multer = require("multer");
const User = require("../../models/user");
const LoginUsers = require("../../models/loginusers");
const Level = require("../../models/level");
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
          return {
            id: value.id,
            level: value.level,
            is_purchased: lvl_ids.includes(String(value.id)) ? 1 : 0,
          };
        })
      );
      return res.status(200).json({ status: 200, data });
    });
  }
}

module.exports = new LevelsController();
