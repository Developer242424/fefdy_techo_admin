const asyncHandler = require("express-async-handler");
const { check, validationResult } = require("express-validator");
const multer = require("multer");
const User = require("../models/user");
const Level = require("../models/level");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { where, Sequelize, Op } = require("sequelize");
const { render } = require("ejs");
require("dotenv").config();
const session = require("express-session");
const getDynamicUploader = require("../middleware/upload");
const moment = require("moment");
const { fn } = require("sequelize");
const path = require("path");
const fs = require("fs");

class LevelListController {
  constructor() {
    this.index = asyncHandler(async (req, res) => {
      return res.render("admin/layout", {
        title: "Level List",
        content: "../admin/levellist/index",
        url: req.originalUrl,
        baseurl: "/admin",
        homeurl: "/admin/dashboard",
      });
    });

    this.create = [
      multer().none(),
      check("level").notEmpty().withMessage("Level is required"),
      check("game_templates").notEmpty().withMessage("Template is required"),
      asyncHandler(async (req, res) => {
        try {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
            return res
              .status(200)
              .json({ status: 401, errors: errors.array() });
          }
          const { level, game_templates } = req.body;
            console.log("body ", req.body);
          await Level.create({ level, game_templates });
          res
            .status(200)
            .json({ status: 200, message: "Successfully added..!" });
        } catch (error) {
          res
            .status(200)
            .json({ status: 500, error: `Internal server error, ${error}` });
        }
      }),
    ];

    this.list = asyncHandler(async (req, res) => {
      try {
        const levels = await Level.findAll({
          where: {
            is_deleted: {
              [Op.is]: null,
            },
          },
          order: [["id", "DESC"]],
        });
        // console.log(levels);
        const data = levels.map((value) => {
          return {
            id: value.id,
            level: value.level,
            action: `<button class='btn btn-primary btn-sm' onclick="OpenEditModal(${value.id})">Edit</button> <button class='btn btn-danger btn-sm' onclick="DeleteData(${value.id})">Delete</button>`,
          };
        });

        return res.status(200).json({ status: 200, data });
      } catch (error) {
        res
          .status(200)
          .json({ status: 500, error: `Internal server error, ${error}` });
      }
    });

    this.data = asyncHandler(async (req, res) => {
      try {
        const { id } = req.body;
        if (!id) {
          return res
            .status(200)
            .json({ status: 400, message: "Level ID is required" });
        }
        const data = await Level.findOne({ where: { id } });
        return res.status(200).json({ status: 200, data });
      } catch (error) {
        res
          .status(200)
          .json({ status: 500, error: `Internal server error, ${error}` });
      }
    });

    this.update = [
      multer().none(),
      check("edit_level").notEmpty().withMessage("Level is required"),
      check("edit_game_templates").notEmpty().withMessage("Template is required"),
      asyncHandler(async (req, res) => {
        try {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
            return res
              .status(200)
              .json({ status: 401, errors: errors.array() });
          }
          const { edit_level, edit_game_templates, edit_id } = req.body;
          const level = await Level.findOne({
            where: {
              id: edit_id,
            },
          });
          if (!level) {
            return res
              .status(200)
              .json({ status: 400, message: "Subject not found" });
          }
          level.level = edit_level;
          level.game_templates = edit_game_templates;
          await level.save();
          res
            .status(200)
            .json({ status: 200, message: "Successfully updated..!" });
        } catch (error) {
          res
            .status(200)
            .json({ status: 500, error: `Internal server error, ${error}` });
        }
      }),
    ];

    this.destroy = asyncHandler(async (req, res) => {
      try {
        const { id } = req.body;

        if (!id) {
          return res
            .status(200)
            .json({ status: 400, message: "Level ID is required" });
        }

        const level = await Level.findOne({ where: { id } });

        if (!level) {
          return res
            .status(200)
            .json({ status: 400, message: "Level not found" });
        }

        await Level.update({ is_deleted: new Date() }, { where: { id } });

        return res.status(200).json({
          status: 200,
          message: "Level deleted successfully",
        });
      } catch (error) {
        console.error("Delete error:", error);
        return res.status(200).json({
          status: 500,
          message: "Internal server error - " + error.message,
        });
      }
    });
  }
}

module.exports = new LevelListController();
