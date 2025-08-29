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

class SubtopicController {
  constructor() {
    this.data = asyncHandler(async (req, res) => {
      try {
        const user = req.session.user;
        const { level } = req.body;

        if (!level) {
          return res.status(200).json({
            status: 400,
            message: "Level ID is required",
          });
        }

        const subtopics = await Subtopic.findAll({
          where: { level_id: level, is_deleted: null },
          order: [["sort_order", "ASC"]],
        });

        const data = await Promise.all(
          subtopics.map(async (value, index) => {
            const catDataIds = JSON.parse(value.cat_data_ids || "[]");
            const categories = JSON.parse(value.category || "[]");

            const history = await sequelize.query(
              `
          SELECT *
          FROM (
            SELECT *,
                   ROW_NUMBER() OVER (PARTITION BY category ORDER BY id DESC) AS row_num
            FROM watch_history
            WHERE org_id = :org_id
              AND user_id = :user_id
              AND subtopic = :subtopic_id
              AND subtopic_data IN (:subtopicData)
              AND category IN (:category)
              AND is_deleted IS NULL
              AND status = '1'
          ) AS t
          WHERE row_num = 1
          `,
              {
                replacements: {
                  org_id: user.org_id,
                  user_id: user.id,
                  subtopic_id: value.id,
                  subtopicData: catDataIds.length ? catDataIds : [null], // avoid SQL error
                  category: categories.length ? categories : [null],
                },
                type: QueryTypes.SELECT,
              }
            );
            // console.log("index:" + index);
            // console.log("history length" + history.length);
            // console.log("cat length" + JSON.parse(value.category).length);

            return {
              id: value.id,
              subject: value.subject,
              topic: value.topic,
              category: value.category,
              title: value.title,
              description: value.description,
              thumbnail: value.thumbnail,
              cat_data_ids: value.cat_data_ids,
              is_completed: categories.length === history.length ? 1 : 0,
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

    this.subtopicData = asyncHandler(async (req, res) => {
      try {
        const { subtopic } = req.body;
        const get = await Subtopic.findOne({
          where: {
            id: subtopic,
          },
        });
        const category = JSON.parse(get.category);
        const cat_data_ids = JSON.parse(get.cat_data_ids);
        const cat_get = await Category.findAll({
          where: {
            id: {
              [Op.in]: category,
            },
          },
        });
        const data = await Promise.all(
          cat_get.map(async (value) => {
            const cat_data = await CategoryData.findOne({
              where: {
                subtopic: subtopic,
                category: value.id,
                is_deleted: null,
              },
              attributes: ["id", "source", "type"],
            });
            return {
              id: value.id,
              title: value.title,
              type: value.type,
              thumbnail: value.thumbnail,
              cat_data: cat_data,
            };
          })
        );
        return res.status(200).json({ status: 200, data });
      } catch (error) {
        console.error("Get error:", error);
        return res.status(200).json({
          status: 500,
          message: "Internal server error - " + error.message,
        });
      }
    });
  }
}

module.exports = new SubtopicController();
