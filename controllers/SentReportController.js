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
const Organisation = require("../models/organisation");
const OrgDetails = require("../models/org_details");
const LoginUsers = require("../models/loginusers");
const MailEntry = require("../models/mailentry");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { where, Sequelize, DATE, Op } = require("sequelize");
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
const { sequelize } = require("../models");
const Subtopic = require("../models/subtopic");
const upload = multer();

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

    this.sentMail = [
      upload.none(),
      check("org_id").notEmpty().withMessage("Organisation is required"),
      asyncHandler(async (req, res) => {
        try {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
            return res
              .status(200)
              .json({ status: 401, errors: errors.array() });
          }
          const { org_id } = req.body;

          if (!org_id) {
            return res.status(400).json({
              status: 400,
              message: "Missing org_id in request.",
            });
          }

          const org_data = await Organisation.findOne({
            where: {
              id: org_id,
              is_deleted: null,
            },
          });

          if (!org_data) {
            return res.status(404).json({
              status: 404,
              message: "Organisation not found.",
            });
          }

          const data = await GetReportsData(org_id);

          if (!data) {
            return res
              .status(200)
              .json({ status: 400, message: "Organisation not found." });
          }

          // return res.status(200).json({ data });

          const email = org_data.email;
          if (!email || email === "null") {
            return res.status(400).json({
              status: 400,
              message:
                "Email is not found in the selected organisation account.",
            });
          }

          const htmlElement = await new Promise((resolve, reject) => {
            res.render(
              "admin/sentreport/template",
              {
                layout: false,
                logoCid: "logoimg",
                data: data,
              },
              (err, html) => {
                if (err) reject(err);
                else resolve(html);
              }
            );
          });
          // return res.status(200).send(htmlElement);

        //   const transporter = nodemailer.createTransport({
        //     host: "smtp.gmail.com",
        //     port: 587,
        //     secure: false,
        //     auth: {
        //       user: process.env.EMAIL_USER,
        //       pass: process.env.EMAIL_PASS,
        //     },
        //   });

           const transporter = nodemailer.createTransport({
             host: "mail.fefdybraingym.com",
             port: 465,
             secure: true,
             auth: {
               user: "noreply@fefdybraingym.com",
               pass: "fIUv^9TYV}gg&=}c",
             },
           });

          const mailOptions = {
            from: "noreply@fefdybraingym.com",
            to: email,
            subject: "Mothly report from Fefdy Brain Gym",
            html: htmlElement,
            attachments: [
              {
                filename: "logo.png",
                path: path.join(__dirname, "../public/logo/logo.png"),
                cid: "logoimg",
              },
              {
                filename: "Confetti.gif",
                path: path.join(
                  __dirname,
                  "../public/logo/images/Confetti.gif"
                ),
                cid: "confettiimg",
              },
              {
                filename: "Celebrations Begin.gif",
                path: path.join(
                  __dirname,
                  "../public/logo/images/Celebrations Begin.gif"
                ),
                cid: "celebrationbg",
              },
              {
                filename: "star.gif",
                path: path.join(__dirname, "../public/logo/images/star.gif"),
                cid: "starimg",
              },
            ],
          };

          await transporter.sendMail(mailOptions);
          await MailEntry.create({
            from: "noreply@fefdybraingym.com",
            to: email,
            subject: "Mothly report from Fefdy Brain Gym",
            template: htmlElement,
            sent_date: new Date(),
            from_type: "admin",
            to_type: "organisation",
          });

          return res
            .status(200)
            .json({ status: 200, message: "Email sent successfully!" });
        } catch (err) {
          console.error("Send error:", err);
          return res.status(500).json({
            status: 500,
            message: "Internal Server Error",
            error: err.message,
          });
        }
      }),
    ];

    this.sentMailWhole = asyncHandler(async (req, res) => {
      try {
        const today = new Date();
        const dayOfMonth = today.getDate();

        if (dayOfMonth !== 1) {
          return res
            .status(200)
            .json({ status: 400, message: "Date is not valid" });
        }
        const organisations = await Organisation.findAll({
          where: { is_deleted: null },
        });

        for (const org of organisations) {
          let email = null;

          try {
            const org_id = org.id;
            const org_data = await Organisation.findOne({
              where: { id: org_id, is_deleted: null },
            });

            if (!org_data) {
              await MailEntry.create({
                from: "noreply@fefdybraingym.com",
                to: "unknown@fefdy.com",
                subject: "400",
                template: "Organisation not found.",
                sent_date: new Date(),
                from_type: "admin",
                to_type: "organisation",
              });
              continue;
            }

            email = org_data.email;

            if (!email || email === "null") {
              await MailEntry.create({
                from: "noreply@fefdybraingym.com",
                to: email || "unknown@fefdy.com",
                subject: "400",
                template:
                  "Email is not found in the selected organisation account.",
                sent_date: new Date(),
                from_type: "admin",
                to_type: "organisation",
              });
              continue;
            }

            const data = await GetReportsData(org_id);

            if (!data) {
              await MailEntry.create({
                from: "noreply@fefdybraingym.com",
                to: email,
                subject: "400",
                template: "Organisation not found 123.",
                sent_date: new Date(),
                from_type: "admin",
                to_type: "organisation",
              });
              continue;
            }

            const htmlElement = await new Promise((resolve, reject) => {
              res.render(
                "admin/sentreport/template",
                {
                  layout: false,
                  logoCid: "logoimg",
                  data: data,
                },
                (err, html) => {
                  if (err) reject(err);
                  else resolve(html);
                }
              );
            });

            const transporter = nodemailer.createTransport({
              host: "mail.fefdybraingym.com",
              port: 465,
              secure: true,
              auth: {
                user: "noreply@fefdybraingym.com",
                pass: "fIUv^9TYV}gg&=}c",
              },
            });

            const mailOptions = {
              from: "noreply@fefdybraingym.com",
              to: email,
              subject: "Monthly report from Fefdy Brain Gym",
              html: htmlElement,
              attachments: [
                {
                  filename: "logo.png",
                  path: path.join(__dirname, "../public/logo/logo.png"),
                  cid: "logoimg",
                },
                {
                  filename: "Confetti.gif",
                  path: path.join(
                    __dirname,
                    "../public/logo/images/Confetti.gif"
                  ),
                  cid: "confettiimg",
                },
                {
                  filename: "Celebrations Begin.gif",
                  path: path.join(
                    __dirname,
                    "../public/logo/images/Celebrations Begin.gif"
                  ),
                  cid: "celebrationbg",
                },
                {
                  filename: "star.gif",
                  path: path.join(__dirname, "../public/logo/images/star.gif"),
                  cid: "starimg",
                },
              ],
            };

            await transporter.sendMail(mailOptions);
            await MailEntry.create({
              from: "noreply@fefdybraingym.com",
              to: email,
              subject: "Monthly report from Fefdy Brain Gym",
              template: htmlElement,
              sent_date: new Date(),
              from_type: "admin",
              to_type: "organisation",
            });
          } catch (err) {
            await MailEntry.create({
              from: "noreply@fefdybraingym.com",
              to: email || "unknown@fefdy.com",
              subject: "Internal Error While Sending Report",
              template: err.message,
              sent_date: new Date(),
              from_type: "admin",
              to_type: "organisation",
            });
            console.error(`Error sending to ${email}:`, err.message);
            continue;
          }
        }

        res.status(200).json({
          status: 200,
          message: "Emails processed for all organisations.",
        });
      } catch (err) {
        console.error("Unexpected global error:", err);
        await MailEntry.create({
          from: "noreply@fefdybraingym.com",
          to: null,
          subject: "Unexpected internal server error.",
          template: err.message,
          sent_date: new Date(),
          from_type: "admin",
          to_type: "organisation",
        });
      }
    });
  }
}

async function GetReportsData(org_id) {
  try {
    const organisation = await Organisation.findOne({
      where: {
        id: org_id,
        is_deleted: null,
      },
    });

    if (!organisation) {
      throw new Error("Organisation not found.");
    }

    const orgSubjects = JSON.parse(organisation.subject || "[]");

    const org_ids = await sequelize.query(
      `
      SELECT MIN(id) AS id, standard, levels
      FROM org_details
      WHERE org_id = :Id AND is_deleted IS NULL
      GROUP BY standard, levels
      `,
      {
        replacements: { Id: organisation.id },
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    if (!org_ids || org_ids.length === 0) {
      throw new Error("Organisation details not found.");
    }

    // Extract ids into an array
    const orgIds = org_ids.map((item) => item.id);

    const orgDetails = await sequelize.query(
      `
      SELECT 
        od.*, 
        s.standard AS standard_name
      FROM 
        org_details od
      LEFT JOIN 
        standards s 
          ON od.standard = s.id
      WHERE 
        od.id IN (:orgIds)
        AND od.is_deleted IS NULL
      `,
      {
        replacements: { orgIds },
        type: Sequelize.QueryTypes.SELECT,
      }
    );
    const students_tests = [];
    const data = await Promise.all(
      orgDetails.map(async (value, index) => {
        const subjects = await Subjects.findAll({
          where: {
            id: {
              [Op.in]: orgSubjects,
            },
          },
        });
        const students = await LoginUsers.findAll({
          where: {
            org_id: organisation.id,
            standard: value.standard,
            section: value.section,
            is_deleted: null,
          },
        });
        const data1 = await Promise.all(
          subjects.map(async (sub_val, sub_ind) => {
            const data2 = await Promise.all(
              students.map(async (stu_val, stu_ind) => {
                const per = await GetPercentage(stu_val.id, sub_val.id);
                return {
                  id: stu_val.id,
                  name: stu_val.name,
                  per: per,
                };
              })
            );
            const totalStudents = students?.length ?? 0;

            // Avoid division by zero
            const safePercent = (count) =>
              totalStudents > 0 ? (count / totalStudents) * 100 : 0;

            const sixtyAbove = data2.filter((item) => item?.per?.percent >= 60);
            const fourtyAbove = data2.filter(
              (item) => item?.per?.percent >= 40 && item?.per?.percent < 60
            );
            const fourtyBelow = data2.filter(
              (item) => item?.per?.percent < 40 && item?.per?.percent > 0
            );

            // Students with no valid percent (e.g., not attended or no data)
            const notAttended = data2.filter(
              (item) =>
                item?.per?.got_marks === 0 &&
                // item?.per?.ttl_ques_len === 0 &&
                item?.per?.percent === 0
            );

            return {
              id: sub_val.id,
              subject: sub_val.subject,
              sixtyAbove_percent: Math.round(safePercent(sixtyAbove.length)),
              fourtyAbove_percent: Math.round(safePercent(fourtyAbove.length)),
              fourtyBelow_percent: Math.round(safePercent(fourtyBelow.length)),
              notAttended_percent: Math.round(safePercent(notAttended.length)),
              data: data2,
            };
          })
        );
        return {
          id: value.id,
          standard: value.standard_name,
          students: students.length,
          data: data1,
        };
      })
    );
    const ttl_students = data.reduce(
      (sum, item) => sum + (+item.students || 0),
      0
    );
    const subjects_lvl = await Subjects.findAll({
      where: {
        is_deleted: null,
      },
    });
    const get_bought = await Promise.all(
      subjects_lvl.map(async (value, index) => {
        const topic = await Topics.findOne({
          where: {
            subject: value.id,
            is_deleted: null,
          },
          order: [["levels", "DESC"]],
        });
        const level = await OrgDetails.findOne({
          where: {
            org_id: organisation.id,
            subject: value.id,
            is_deleted: null,
          },
          order: [["levels", "DESC"]],
        });
        return {
          id: value.id,
          subject: value.subject,
          ttl_level: topic?.levels ?? 0,
          bought_level: level?.levels ?? 0,
        };
      })
    );
    return {
      org_name: organisation.org_name,
      getboughtlevels: get_bought,
      ttl_students,
      data,
    };
  } catch (err) {
    console.error("DB error:", err);
    throw err; // Let the main controller handle it
  }
}

// async function GetPercentage(stu_id, sub_id) {
//   let tp_lp_inc = 0;
//   let lvl_lp_inc = 0;
//   let st_lp_inc = 0;
//   let ques_lp_inc = 0;
//   let th_lp_inc = 0;
//   let ttl_marks = 0;
//   let got_marks = 0;
//   let ttl_ques_len = 0;
//   const questiontypes = await QuestionType.findAll({
//     where: {
//       is_deleted: null,
//     },
//   });
//   const topics = await Topics.findAll({
//     where: {
//       subject: sub_id,
//       is_deleted: null,
//     },
//   });
//   const top_lp = await Promise.all(
//     topics.map(async (tp_val, tp_ind) => {
//       tp_lp_inc++;
//       const levels = await Level.findAll({
//         where: {
//           subject: sub_id,
//           topic: tp_val.id,
//           is_deleted: null,
//         },
//       });
//       const lvl_lp = await Promise.all(
//         levels.map(async (lvl_val, lvl_ind) => {
//           lvl_lp_inc++;
//           const subtopics = await Subtopic.findAll({
//             where: {
//               subject: sub_id,
//               topic: tp_val.id,
//               level_id: lvl_val.id,
//               is_deleted: null,
//             },
//           });
//           const st_lp = await Promise.all(
//             subtopics.map(async (st_val, st_ind) => {
//               st_lp_inc++;
//               const test_histories = await sequelize.query(
//                 `
//                 SELECT th.*
//                 FROM test_histories th
//                 JOIN (
//                   SELECT user_id, subject, topic, level_id, sub_topic, question_type, MAX(entered_at) AS latest_entry
//                   FROM test_histories
//                   GROUP BY user_id, subject, topic, level_id, sub_topic, question_type
//                 ) latest
//                 ON th.user_id = latest.user_id
//                   AND th.subject = latest.subject
//                   AND th.topic = latest.topic
//                   AND th.level_id = latest.level_id
//                   AND th.sub_topic = latest.sub_topic
//                   AND th.question_type = latest.question_type
//                   AND th.entered_at = latest.latest_entry
//                 WHERE th.is_deleted IS NULL
//                   AND th.user_id = :UserID
//                   AND th.subject = :SubjectID
//                   AND th.topic = :TopicId
//                   AND th.level_id = :LevelId
//                   AND th.sub_topic = :SubtopicId
//                   AND th.question_type IS NOT NULL
//                 ORDER BY th.question_type ASC;
//                 `,
//                 {
//                   replacements: {
//                     UserID: stu_id,
//                     SubjectID: sub_id,
//                     TopicId: tp_val.id,
//                     LevelId: lvl_val.id,
//                     SubtopicId: st_val.id,
//                   },
//                   type: sequelize.QueryTypes.SELECT,
//                 }
//               );
//               const questions = await Questions.findAll({
//                 where: {
//                   subject: sub_id,
//                   topic: tp_val.id,
//                   level_id: lvl_val.id,
//                   sub_topic: st_val.id,
//                   is_deleted: null,
//                 },
//               });
//               const ques_lp = await Promise.all(
//                 questions.map(async (ques_val, ques_ind) => {
//                   ques_lp_inc++;
//                   const part_len = await getQuestionCountFromJson(
//                     ques_val.question_type,
//                     ques_val.data
//                   );
//                   ttl_ques_len += part_len;
//                 })
//               );
//               const th_lp = await Promise.all(
//                 test_histories.map(async (th_val, th_ind) => {
//                   th_lp_inc++;
//                   ttl_marks += th_val.correct_ans + th_val.wrong_ans;
//                   got_marks += th_val.correct_ans;
//                 })
//               );
//             })
//           );
//         })
//       );
//     })
//   );
//   // console.log("Topics loop", tp_lp_inc);
//   // console.log("Levels loop", lvl_lp_inc);
//   // console.log("Sub Topics loop", st_lp_inc);
//   // console.log("Test Histories loop", th_lp_inc);
//   // console.log("Total Marks", ttl_marks);
//   // console.log("Got Marks", got_marks);
//   const percentage = ttl_marks > 0 ? (got_marks / ttl_marks) * 100 : 0;
//   const ttl_tests = st_lp_inc * questiontypes.length;
//   const th_percentage = ttl_tests > 0 ? percentage / ttl_tests : 0;
//   const fnl_percentage = ttl_marks > 0 ? (ttl_marks / ttl_ques_len) * 100 : 0;

//   return {
//     tp_lp_inc,
//     lvl_lp_inc,
//     st_lp_inc,
//     ques_lp_inc,
//     ttl_tests,
//     th_lp_inc,
//     ttl_marks,
//     got_marks,
//     percentage,
//     th_percentage,
//     ttl_ques_len,
//     fnl_percentage
//   };
//   // return stu_id;
// }

async function GetPercentage(stu_id, sub_id) {
  let got_marks = 0;
  let ques_lp_inc = 0;
  let ttl_ques_len = 0;

  const questiontypes = await QuestionType.findAll({
    where: {
      is_deleted: null,
    },
  });

  const subtopics = await Subtopic.findAll({
    where: {
      subject: sub_id,
      is_deleted: null,
    },
  });

  for (const st_val of subtopics) {
    for (const ques_type_val of questiontypes) {
      const questions = await Questions.findAll({
        where: {
          subject: sub_id,
          sub_topic: st_val.id,
          question_type: ques_type_val.id,
          is_deleted: null,
        },
        limit: ques_type_val.question_limit,
      });

      await Promise.all(
        questions.map(async (ques_val) => {
          ques_lp_inc++;
          const part_len = await getQuestionCountFromJson(
            ques_val.question_type,
            ques_val.data
          );
          ttl_ques_len += part_len;
        })
      );
    }
  }

  const test_histories = await sequelize.query(
    `
    SELECT SUM(latest_tests.correct_ans) AS total_correct_answers
    FROM (
      SELECT th.*
      FROM test_histories th
      JOIN (
        SELECT user_id, subject, topic, level_id, sub_topic, question_type, MAX(entered_at) AS latest_entry
        FROM test_histories
        GROUP BY user_id, subject, topic, level_id, sub_topic, question_type
      ) latest
      ON th.user_id = latest.user_id
        AND th.subject = latest.subject
        AND th.topic = latest.topic
        AND th.level_id = latest.level_id
        AND th.sub_topic = latest.sub_topic
        AND th.question_type = latest.question_type
        AND th.entered_at = latest.latest_entry
      WHERE th.is_deleted IS NULL
        AND th.user_id = :UserID
        AND th.subject = :SubjectID
        AND th.question_type IS NOT NULL
    ) AS latest_tests;
    `,
    {
      replacements: {
        UserID: stu_id,
        SubjectID: sub_id,
      },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  got_marks += parseInt(test_histories[0].total_correct_answers || 0);
  const percent = ttl_ques_len > 0 ? (got_marks / ttl_ques_len) * 100 : 0;

  return {
    got_marks,
    ques_lp_inc,
    ttl_ques_len,
    percent: Math.round(percent),
  };
}

async function getQuestionCountFromJson(question_type, dataJson) {
  let parsed = dataJson;

  // Parse if JSON is a string
  if (typeof dataJson === "string") {
    try {
      parsed = JSON.parse(dataJson);
    } catch (e) {
      console.warn("Invalid JSON string:", dataJson);
      return 1; // Can't count if it's invalid
    }
  } else {
    parsed = dataJson;
  }

  // For question_type 2 (Match type)
  if (question_type === 2) {
    if (Array.isArray(parsed)) {
      const count = parsed.filter(
        (item) => typeof item === "object" && "instruction" in item
      ).length;
      return count;
    } else {
      return 0; // not valid format for type 2
    }
  }

  // For all other question types, return 1
  return dataJson !== null ? 1 : 0;
}

module.exports = new SentReportController();
