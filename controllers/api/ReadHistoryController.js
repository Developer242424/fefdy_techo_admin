const asyncHandler = require("express-async-handler");
const { check, validationResult } = require("express-validator");
const multer = require("multer");
const User = require("../../models/user");
const Subjects = require("../../models/subjects");
const Topics = require("../../models/topics");
const Organisation = require("../../models/organisation");
const OrgDetails = require("../../models/org_details");
const WatchHistory = require("../../models/watchhistory");
const ReadHistory = require("../../models/read_history");
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
const Category = require("../../models/category");

class ReadHistoryController {
  constructor() {
    this.index = asyncHandler(async (req, res) => {
      try {
        const user = req.session.user;
        // console.log("user", user);
        const {
          audio_ids,
          type,
          category,
          subtopic,
          subtopic_data,
          comp_audio_ids,
        } = req.body;
        // console.log("Body", req.body);
        const read_history = await ReadHistory.findAll({
          where: {
            user_id: user.id,
            audio_id: {
              [Op.in]: audio_ids,
            },
          },
        });
        const comp_read_history = await ReadHistory.findAll({
          where: {
            user_id: user.id,
            audio_id: {
              [Op.in]: audio_ids,
            },
            is_complete: "1",
          },
        });
        const existingRecords = await ReadHistory.findAll({
          where: {
            user_id: user.id,
            audio_id: {
              [Op.in]: audio_ids,
            },
          },
          attributes: ["audio_id"],
        });
        const existingIds = existingRecords.map((r) => r.audio_id);
        const newIdsEntry = audio_ids.filter((id) => !existingIds.includes(id));

        const existingCompIds = comp_read_history.map((r) => r.audio_id);
        const newIds = existingIds.filter(
          (id) => !existingCompIds.includes(id)
        );
        // console.log("New IDs not in comp_read_history:", newIds);
        //   console.log("read_history", read_history);
        let isAll = false;

        if (type === "check") {
          if (newIdsEntry.length > 0) {
            // console.log("existingIds 123", existingIds);
            // console.log("newIdsEntry 123", newIdsEntry);
            const records = newIdsEntry.map((id) => ({
              user_id: user.id,
              audio_id: id,
              is_complete: "0",
            }));
            await ReadHistory.bulkCreate(records);
            return res.status(200).json({
              status: 200,
              message: "Read History list added..!",
              ret_audio_ids: newIds,
            });
          } else if (read_history.length > 0) {
            isAll = comp_read_history.length === audio_ids.length;
          }
          //   console.log("isAll", isAll);
          if (isAll) {
            const category_dt = await Category.findOne({
              where: {
                id: category,
              },
            });
            const check = await WatchHistory.findOne({
              where: {
                subtopic: subtopic,
                category: category,
                subtopic_data: subtopic_data,
                is_deleted: null,
                user_id: user.id,
              },
            });
            if (!check) {
              await WatchHistory.create({
                org_id: user.org_id,
                user_id: user.id,
                subtopic: subtopic,
                subtopic_data: subtopic_data,
                category: category,
                category_type: category_dt.type,
                ttl_time: "00:00",
                seen_time: "00:00",
                seen_percent: 100,
                status: "1",
              });
              return res.status(200).json({
                status: 200,
                message: "Read History is added to watch history..!",
                ret_audio_ids: [],
              });
            } else {
              return res.status(200).json({
                status: 200,
                message: "Read History is already added in watch history..!",
                ret_audio_ids: [],
              });
            }
          } else {
            return res.status(200).json({
              status: 400,
              message: "Not all the audios are read..!",
              ret_audio_ids: newIds,
            });
          }
        } else if (type === "update") {
          if (read_history.length > 0) {
            await ReadHistory.update(
              { is_complete: "1" },
              {
                where: {
                  user_id: user.id,
                  audio_id: {
                    [Op.in]: comp_audio_ids,
                  },
                },
              }
            );
            const current_comp_read_history = await ReadHistory.findAll({
              where: {
                user_id: user.id,
                audio_id: {
                  [Op.in]: audio_ids,
                },
                is_complete: "1",
              },
            });
            // console.log("current_comp_read_history", current_comp_read_history);
            // console.log("audio_ids", audio_ids);
            const completedAudioIds = current_comp_read_history.map(
              (item) => item.audio_id
            );
            const allCompleted = audio_ids.every((id) =>
              completedAudioIds.includes(id)
            );
            if (allCompleted) {
              const category_dt = await Category.findOne({
                where: {
                  id: category,
                },
              });
              const check = await WatchHistory.findOne({
                where: {
                  subtopic: subtopic,
                  category: category,
                  subtopic_data: subtopic_data,
                  is_deleted: null,
                  user_id: user.id,
                },
              });
              if (!check) {
                await WatchHistory.create({
                  org_id: user.org_id,
                  user_id: user.id,
                  subtopic: subtopic,
                  subtopic_data: subtopic_data,
                  category: category,
                  category_type: category_dt.type,
                  ttl_time: "00:00",
                  seen_time: "00:00",
                  seen_percent: 100,
                  status: "1",
                });
                return res.status(200).json({
                  status: 200,
                  message: "Read History is added to watch history..!",
                  ret_audio_ids: [],
                });
              }
            }
            return res.status(200).json({
              status: 200,
              message: "Given audios are marked as completed..!",
              ret_audio_ids: newIds,
            });
          } else {
            return res.status(200).json({
              status: 400,
              message:
                "Kindly sent the audio ids using check type. Then try to update..!",
              ret_audio_ids: audio_ids,
            });
          }
        }
      } catch (error) {
        return res.status(200).json({
          status: 500,
          message: "Internal server error - " + error.message,
          error,
        });
      }
    });
  }
}

module.exports = new ReadHistoryController();
