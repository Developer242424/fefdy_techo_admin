const asyncHandler = require("express-async-handler");
const { check, validationResult } = require("express-validator");
const Subjects = require("../models/subjects");
const Level = require("../models/level");
const Topics = require("../models/topics");
const Subtopic = require("../models/subtopic");
const Standards = require("../models/standards");
const Organisation = require("../models/organisation");
const QuestionType = require("../models/questiontype");
require("dotenv").config();

class HandlerController {
  constructor() {
    this.getSubjectForDrop = asyncHandler(async (req, res) => {
      const data = await Subjects.findAll({
        where: {
          is_deleted: null,
        },
        order: [["id", "ASC"]],
      });
      return res.status(200).json({ status: 200, data });
    });

    this.getLevelForDrop = asyncHandler(async (req, res) => {
      const data = await Level.findAll({
        where: {
          is_deleted: null,
        },
        order: [["id", "ASC"]],
      });
      return res.status(200).json({ status: 200, data });
    });

    this.getTopicBySubjectForDrop = asyncHandler(async (req, res) => {
      const { id, level } = req.body;
      const data = await Topics.findAll({
        where: {
          is_deleted: null,
          subject: id,
          level: level,
        },
        order: [["id", "ASC"]],
      });
      return res.status(200).json({ status: 200, data });
    });

    this.getLevelCountForDrop = asyncHandler(async (req, res) => {
      try {
        const { id } = req.body;
        if (!id) {
          return res
            .status(200)
            .json({ status: 400, message: "Topic ID is required." });
        }
        const data = await Topics.findOne({
          where: {
            id: id,
            is_deleted: null,
          },
        });
        if (!data) {
          return res
            .status(200)
            .json({ status: 400, message: "Topic not found." });
        }
        return res
          .status(200)
          .json({ status: 200, levelCount: parseInt(data.levels) || 0 });
      } catch (error) {
        return res.status(500).json({
          status: 500,
          message: "Internal server error",
          error: error.message,
        });
      }
    });

    this.getSubTopicByTopicForDrop = asyncHandler(async (req, res) => {
      const { id } = req.body;
      const data = await Subtopic.findAll({
        where: {
          is_deleted: null,
          topic: id,
        },
        order: [["id", "ASC"]],
      });
      return res.status(200).json({ status: 200, data });
    });

    this.getStandardsForDrop = asyncHandler(async (req, res) => {
      const data = await Standards.findAll({
        where: {
          is_deleted: null,
        },
        order: [["id", "ASC"]],
      });
      return res.status(200).json({ status: 200, data });
    });

    this.getOrganisationsForDrop = asyncHandler(async (req, res) => {
      const data = await Organisation.findAll({
        where: {
          is_deleted: null,
        },
        order: [["id", "ASC"]],
      });
      return res.status(200).json({ status: 200, data });
    });

    this.getQuestionTypesForDrop = asyncHandler(async (req, res) => {
      const data = await QuestionType.findAll({
        where: {
          is_deleted: null,
        },
        order: [["id", "ASC"]],
      });
      return res.status(200).json({ status: 200, data });
    });
  }
}

module.exports = new HandlerController();
