const asyncHandler = require("express-async-handler");
const { check, validationResult } = require("express-validator");
const Subjects = require("../models/subjects");
const Level = require("../models/level");
const Topics = require("../models/topics");
const QuestionType = require("../models/questiontype");
const Category = require("../models/category");
require("dotenv").config();
const getDynamicUploader = require("../middleware/upload");
const path = require("path");
const fs = require("fs");

class TopicsController {
  constructor() {
    this.index = asyncHandler(async (req, res) => {
      const subjects = await Subjects.findAll({
        where: {
          is_deleted: null,
        },
        order: [["id", "ASC"]],
      });
      return res.render("admin/layout", {
        title: "Topics",
        content: "../admin/topics/index",
        url: req.originalUrl,
        baseurl: "/admin",
        homeurl: "/admin/dashboard",
        subjects: subjects,
      });
    });

    this.create = [
      (req, res, next) => {
        const upload = getDynamicUploader("topics").single("thumbnail");
        upload(req, res, function (err) {
          if (err) {
            return res.status(200).json({ status: 400, message: err.message });
          }
          next();
        });
      },
      check("subject")
        .notEmpty()
        .withMessage("Subject is required")
        .bail()
        .isNumeric()
        .withMessage("Subject is need to be numeric"),
      check("level")
        .notEmpty()
        .withMessage("Level is required")
        .bail()
        .isNumeric()
        .withMessage("Level is need to be numeric"),
      check("title")
        .notEmpty()
        .withMessage("Title is required")
        .bail()
        .isLength({ min: 3 })
        .withMessage("Title must be at least 3 characters long"),
      check("description")
        .notEmpty()
        .withMessage("Description is required")
        .bail()
        .isLength({ min: 3 })
        .withMessage("Description must be at least 3 characters long"),
      check("sort_order")
        .notEmpty()
        .withMessage("Sort Order is required")
        .bail()
        .isNumeric()
        .withMessage("Sort Order is need to be numeric"),

      asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(200).json({ status: 401, errors: errors.array() });
        }

        try {
          const { subject, level, title, description, levels, sort_order } =
            req.body;
          const file = req.file;

          if (!file) {
            return res
              .status(200)
              .json({ status: 400, message: "Thumbnail is required" });
          }

          const insert = await Topics.create({
            subject: subject,
            level: level,
            title: title,
            description: description,
            sort_order: sort_order,
            thumbnail: `uploads/topics/${file.filename}`,
          });
          return res.status(200).json({
            status: 200,
            message: "Topic is created successfully",
          });
        } catch (error) {
          return res.status(200).json({
            status: 500,
            message: "Internal server error - " + error.message,
            error,
          });
        }
      }),
    ];

    this.list = asyncHandler(async (req, res) => {
      try {
        const topics = await Topics.findAll({
          where: {
            is_deleted: null,
          },
          order: [["id", "DESC"]],
        });

        const data = await Promise.all(
          topics.map(async (value) => {
            const subject = await Subjects.findOne({
              where: { id: value.subject },
              attributes: ["subject"],
            });
            const level = await Level.findOne({
              where: { id: value.level },
              attributes: ["level"],
            });

            return {
              id: value.id,
              title: value.title,
              subject: value.subject,
              level: value.level,
              subject_name: subject ? subject.subject : "",
              level_name: level ? level.level : "",
              description: value.description,
              thumbnail: `<img src="../${value.thumbnail}" alt="Thumbnail" style="width: 50px;">`,
              action: `
                  <button class='btn btn-primary btn-sm' onclick="OpenEditModal(${value.id})">Edit</button>
                  <button class='btn btn-primary btn-sm' onclick="OpenAudioMessagesModal(${value.id})"><span><i class="ti ti-code-plus px-1"></i><span>Messages</span></span></button>
                  <button class='btn btn-danger btn-sm' onclick="DeleteData(${value.id})">Delete</button>
                `,
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

    this.destroy = asyncHandler(async (req, res) => {
      try {
        const { id } = req.body;
        if (!id) {
          return res
            .status(200)
            .json({ status: 400, message: "Topic ID is required" });
        }
        const get = await Topics.findOne({ where: { id } });
        if (!get) {
          return res
            .status(200)
            .json({ status: 400, message: "Topic not found" });
        }

        await Topics.update({ is_deleted: new Date() }, { where: { id } });
        return res.status(200).json({
          status: 200,
          message: "Topic deleted successfully",
        });
      } catch (error) {
        return res.status(200).json({
          status: 500,
          message: "Internal server error - " + error.message,
          error,
        });
      }
    });

    this.data = asyncHandler(async (req, res) => {
      try {
        const { id } = req.body;
        if (!id) {
          return res
            .status(200)
            .json({ status: 400, message: "Topic ID is required" });
        }
        const data = await Topics.findOne({ where: { id } });
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
        const upload = getDynamicUploader("topics").single("edit_thumbnail");
        upload(req, res, function (err) {
          if (err) {
            return res.status(200).json({ status: 400, message: err.message });
          }
          next();
        });
      },
      check("edit_subject")
        .notEmpty()
        .withMessage("Subject is required")
        .bail()
        .isNumeric()
        .withMessage("Subject is need to be numeric"),
      check("edit_level")
        .notEmpty()
        .withMessage("Level is required")
        .bail()
        .isNumeric()
        .withMessage("Level is need to be numeric"),
      check("edit_title")
        .notEmpty()
        .withMessage("Title is required")
        .bail()
        .isLength({ min: 3 })
        .withMessage("Title must be at least 3 characters long"),
      check("edit_description")
        .notEmpty()
        .withMessage("Description is required")
        .bail()
        .isLength({ min: 3 })
        .withMessage("Description must be at least 3 characters long"),
      check("edit_sort_order")
        .notEmpty()
        .withMessage("Sort Order is required")
        .bail()
        .isNumeric()
        .withMessage("Sort Order is need to be numeric"),

      asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(200).json({ status: 401, errors: errors.array() });
        }

        try {
          const {
            edit_subject,
            edit_level,
            edit_title,
            edit_description,
            edit_id,
            edit_sort_order,
          } = req.body;
          const file = req.file;

          const topic = await Topics.findOne({ where: { id: edit_id } });
          if (!topic) {
            return res
              .status(404)
              .json({ status: 404, message: "Topic not found" });
          }

          if (file && topic.thumbnail) {
            // console.log(topic.thumbnail);
            const oldPath = path.join(__dirname, "../public/", topic.thumbnail);
            fs.unlink(oldPath, (err) => {
              if (err) {
                console.warn(`Old file delete warning: ${err.message}`);
              }
            });
            topic.thumbnail = `uploads/topics/${file.filename}`;
          }

          (topic.subject = edit_subject),
            (topic.level = edit_level),
            (topic.title = edit_title),
            (topic.description = edit_description),
            (topic.sort_order = edit_sort_order);

          await topic.save();

          return res.status(200).json({
            status: 200,
            message: "Topic is updated successfully",
          });
        } catch (error) {
          return res.status(200).json({
            status: 500,
            message: "Internal server error - " + error.message,
            error,
          });
        }
      }),
    ];

    this.getAudioMessagesData = asyncHandler(async (req, res) => {
      try {
        const { topic } = req.body;
        if (!topic) {
          return res.status(200).json({
            status: 400,
            message: "Topic ID is required",
          });
        }
        const topicData = await Topics.findOne({ where: { id: topic } });
        if (!topicData) {
          return res.status(200).json({
            status: 400,
            message: "Topic not found",
          });
        }
        if (topicData.audio_messages) {
          return res.status(200).json({
            status: 200,
            type: "update",
            data: topicData.audio_messages,
          });
        } else {
          const categories = await Category.findAll({
            where: {
              is_deleted: null,
            },
          });
          const question_type = await QuestionType.findAll({
            where: {
              is_deleted: null,
            },
          });
          return res
            .status(200)
            .json({ status: 200, type: "fresh", categories, question_type });
        }
      } catch (error) {
        return res.status(200).json({
          status: 500,
          message: "Internal server error - " + error.message,
          error,
        });
      }
    });

    this.audioMessagesUpdate = [
      // 1️⃣ Handle file uploads (multer dynamic uploader)
      (req, res, next) => {
        const upload = getDynamicUploader("topics_messages").any();
        upload(req, res, function (err) {
          if (err) {
            return res.status(200).json({
              status: 400,
              message: err.message || "File upload error",
            });
          }
          next();
        });
      },

      // 2️⃣ Process and save
      asyncHandler(async (req, res) => {
        try {
          const files = req.files || [];
          const { audio_messages_data, topic_id } = req.body;

          if (!topic_id) {
            return res.status(200).json({
              status: 400,
              message: "Topic ID is required",
            });
          }

          // 🔹 Parse JSON safely
          let parsedData;
          try {
            parsedData =
              typeof audio_messages_data === "string"
                ? JSON.parse(audio_messages_data)
                : audio_messages_data;
          } catch (e) {
            parsedData = { categories: [], question_type: [] };
          }

          // 🔹 Get the existing topic and its current audio JSON (if any)
          const topic = await Topics.findOne({ where: { id: topic_id } });
          if (!topic) {
            return res.status(200).json({
              status: 400,
              message: "Topic not found",
            });
          }

          const existingAudioData = topic.audio_messages || {
            categories: [],
            question_type: [],
          };

          // 🔹 Build a lookup for uploaded files (multer style)
          const fileMap = {};
          for (const f of files) {
            fileMap[f.fieldname] = f.filename;
          }

          // 🟢 Final result JSON to store
          const result = { categories: [], question_type: [] };

          // ========== 🟢 Update Categories ==========
          if (Array.isArray(parsedData.categories)) {
            parsedData.categories.forEach((cat, index) => {
              const introKey = `audio_messages_data[categories][${index}][intro_audio]`;
              const compKey = `audio_messages_data[categories][${index}][completion_audio]`;

              // find existing data if present
              const existingCat =
                existingAudioData.categories?.find((c) => c.id == cat.id) || {};

              result.categories.push({
                id: cat.id,
                name: cat.name,
                intro_audio: fileMap[introKey]
                  ? `uploads/topics_messages/${fileMap[introKey]}`
                  : existingCat.intro_audio || "",
                completion_audio: fileMap[compKey]
                  ? `uploads/topics_messages/${fileMap[compKey]}`
                  : existingCat.completion_audio || "",
              });
            });
          }

          // ========== 🔵 Update Question Types ==========
          if (Array.isArray(parsedData.question_type)) {
            parsedData.question_type.forEach((qt, index) => {
              const introKey = `audio_messages_data[question_type][${index}][intro_audio]`;
              const compKey = `audio_messages_data[question_type][${index}][completion_audio]`;

              const existingQT =
                existingAudioData.question_type?.find((q) => q.id == qt.id) ||
                {};

              result.question_type.push({
                id: qt.id,
                name: qt.name,
                intro_audio: fileMap[introKey]
                  ? `uploads/topics_messages/${fileMap[introKey]}`
                  : existingQT.intro_audio || "",
                completion_audio: fileMap[compKey]
                  ? `uploads/topics_messages/${fileMap[compKey]}`
                  : existingQT.completion_audio || "",
              });
            });
          }

          // 🧩 Update the DB — column is already JSON type
          await Topics.update(
            { audio_messages: result },
            { where: { id: topic_id } }
          );

          // ✅ Success response
          return res.status(200).json({
            status: 200,
            message: "Audio messages updated successfully",
            data: result,
          });
        } catch (error) {
          console.error("❌ Audio message update error:", error);
          return res.status(200).json({
            status: 500,
            message: "Internal server error - " + error.message,
            error,
          });
        }
      }),
    ];
  }
}

module.exports = new TopicsController();
