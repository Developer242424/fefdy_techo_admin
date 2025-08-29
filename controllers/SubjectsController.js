const asyncHandler = require("express-async-handler");
const { check, validationResult } = require("express-validator");
const multer = require("multer");
const User = require("../models/user");
const Subjects = require("../models/subjects");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { where, Sequelize } = require("sequelize");
const { render } = require("ejs");
require("dotenv").config();
const session = require("express-session");
const getDynamicUploader = require("../middleware/upload");
const moment = require("moment");
const { fn } = require("sequelize");
const path = require("path");
const fs = require("fs");

class SubjectsController {
  constructor() {
    this.index = asyncHandler(async (req, res) => {
      return res.render("admin/layout", {
        title: "Subjects",
        content: "../admin/subject/index",
        url: req.originalUrl,
        baseurl: "/admin",
        homeurl: "/admin/dashboard",
      });
    });

    this.create = [
      (req, res, next) => {
        const upload = getDynamicUploader("subjects").fields([
          { name: "thumbnail", maxCount: 1 },
          { name: "background", maxCount: 1 },
        ]);
        upload(req, res, function (err) {
          if (err) {
            return res.status(200).json({ status: 400, message: err.message });
          }
          next();
        });
      },

      check("subject").notEmpty().withMessage("Subject is required"),

      asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(200).json({ status: 401, errors: errors.array() });
        }

        try {
          const { subject } = req.body;
          const thumbnailFile = req.files?.thumbnail?.[0];
          const backgroundFile = req.files?.background?.[0];

          if (!thumbnailFile) {
            return res
              .status(200)
              .json({ status: 400, message: "Thumbnail is required" });
          }

          if (!backgroundFile) {
            return res
              .status(200)
              .json({ status: 400, message: "Background is required" });
          }
          const insert = await Subjects.create({
            subject: subject,
            thumbnail: `uploads/subjects/${thumbnailFile.filename}`,
            background: `uploads/subjects/${backgroundFile.filename}`,
          });
          return res.status(200).json({
            status: 200,
            message: "Subject created successfully",
            data: {
              subject,
              thumbnail: `uploads/subjects/${thumbnailFile.filename}`,
              background: `uploads/subjects/${backgroundFile.filename}`,
            },
          });
        } catch (error) {
          return res.status(200).json({
            status: 500,
            message: "Internal server error" + error.message,
            error,
          });
        }
      }),
    ];

    this.list = asyncHandler(async (req, res) => {
      try {
        const get = await Subjects.findAll({
          where: {
            is_deleted: null,
          },
          order: [["id", "DESC"]],
        });

        // if (get.length === 0) {
        //   return res
        //     .status(200)
        //     .json({ status: 400, message: "Data Not found", data: [] });
        // }

        const data = get.map((value) => {
          return {
            id: value.id,
            subject: value.subject,
            thumbnail: `<img src="../${value.thumbnail}" alt="Thumbnail" style="width: 50px;">`,
            action: `<button class='btn btn-primary btn-sm' onclick="OpenEditModal(${value.id})">Edit</button> <button class='btn btn-danger btn-sm' onclick="DeleteData(${value.id})">Delete</button>`,
          };
        });

        return res.status(200).json({ status: 200, data });
      } catch (error) {
        return res.status(200).json({
          status: 500,
          message: "Internal server error - " + error.message,
        });
      }
    });

    this.destroy = asyncHandler(async (req, res) => {
      try {
        const { id } = req.body;

        if (!id) {
          return res
            .status(200)
            .json({ status: 400, message: "Subject ID is required" });
        }

        const subject = await Subjects.findOne({ where: { id } });

        if (!subject) {
          return res
            .status(200)
            .json({ status: 400, message: "Subject not found" });
        }

        // Soft delete
        // console.log(new Date())
        await Subjects.update({ is_deleted: new Date() }, { where: { id } });
        // await Subjects.destroy({ where: { id } });

        return res.status(200).json({
          status: 200,
          message: "Subject deleted successfully",
        });
      } catch (error) {
        console.error("Delete error:", error);
        return res.status(200).json({
          status: 500,
          message: "Internal server error - " + error.message,
        });
      }
    });

    this.data = asyncHandler(async (req, res) => {
      try {
        const { id } = req.body;
        if (!id) {
          return res
            .status(200)
            .json({ status: 400, message: "Subject ID is required" });
        }
        const data = await Subjects.findOne({ where: { id } });
        return res.status(200).json({ status: 200, data });
      } catch (error) {
        console.error("Get error:", error);
        return res.status(200).json({
          status: 500,
          message: "Internal server error - " + error.message,
        });
      }
    });

    this.update = [
      (req, res, next) => {
        const upload = getDynamicUploader("subjects").fields([
          { name: "edit_thumbnail", maxCount: 1 },
          { name: "edit_background", maxCount: 1 },
        ]);
        upload(req, res, function (err) {
          if (err) {
            return res.status(200).json({ status: 400, message: err.message });
          }
          next();
        });
      },

      check("edit_subject").notEmpty().withMessage("Subject is required"),
      check("edit_id").notEmpty().withMessage("Subject id is required"),

      asyncHandler(async (req, res) => {
        const { edit_subject, edit_id } = req.body;
        const thumbnailFile = req.files?.edit_thumbnail?.[0];
        const backgroundFile = req.files?.edit_background?.[0];

        const subject = await Subjects.findOne({ where: { id: edit_id } });
        if (!subject) {
          return res
            .status(404)
            .json({ status: 404, message: "Subject not found" });
        }

        if (thumbnailFile) {
          if (subject.thumbnail) {
            const oldThumbPath = path.join(
              __dirname,
              "../public/",
              subject.thumbnail
            );
            fs.unlink(oldThumbPath, (err) => {
              if (err) console.warn(`Thumbnail delete warning: ${err.message}`);
            });
          }
          subject.thumbnail = `uploads/subjects/${thumbnailFile.filename}`;
        }

        if (backgroundFile) {
          if (subject.background) {
            const oldBgPath = path.join(
              __dirname,
              "../public/",
              subject.background
            );
            fs.unlink(oldBgPath, (err) => {
              if (err)
                console.warn(`Background delete warning: ${err.message}`);
            });
          }
          subject.background = `uploads/subjects/${backgroundFile.filename}`;
        }

        subject.subject = edit_subject;

        await subject.save();

        return res
          .status(200)
          .json({ status: 200, message: "Successfully updated" });
      }),
    ];
  }
}

module.exports = new SubjectsController();
