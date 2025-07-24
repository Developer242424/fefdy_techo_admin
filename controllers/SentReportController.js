const asyncHandler = require("express-async-handler");
const { check, validationResult } = require("express-validator");
const multer = require("multer");
const User = require("../models/user");
const Subjects = require("../models/subjects");
const Topics = require("../models/topics");
const Level = require("../models/level");
const Category = require("../models/category");
const QuestionType = require("../models/questiontype");
const Questions = require("../models/questions");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { where, Sequelize, DATE } = require("sequelize");
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
const nodemailer = require("nodemailer");

class SentReportController {
  constructor() {
    this.index = asyncHandler(async (req, res) => {
      return res.render("admin/layout", {
        title: "Sent Report",
        content: "../admin/sentreport/index",
        url: req.originalUrl,
        baseurl: "/admin",
        homeurl: "/admin/dashboard",
      });
    });

    this.sentMail = asyncHandler(async (req, res) => {
      try {
        // const email = "cooltimesv7@gmail.com";
        const email = "developer@fefdypartners.com";

        const htmlElement = await new Promise((resolve, reject) => {
          res.render(
            "admin/sentreport/template",
            { layout: false },
            (err, html) => {
              if (err) reject(err);
              else resolve(html);
            }
          );
        });

        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Test mail from fefdybrain gym",
          html: htmlElement,
        };

        await transporter.sendMail(mailOptions);

        return res
          .status(200)
          .json({ status: 200, message: "Email sent successfully!" });
      } catch (err) {
        console.error("Render error:", err);
        return res
          .status(200)
          .json({ status: 400, message: "Render error:", err });
      }
    });
  }
}

module.exports = new SentReportController();
