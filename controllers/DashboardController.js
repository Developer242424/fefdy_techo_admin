const asyncHandler = require("express-async-handler");
const { check, validationResult } = require("express-validator");
const multer = require("multer");
const User = require("../models/user");
const Subjects = require("../models/subjects");
const Topics = require("../models/topics");
const Level = require("../models/level");
const Category = require("../models/category");
const WatchHistory = require("../models/watchhistory");
const QuestionType = require("../models/questiontype");
const Questions = require("../models/questions");
const Organisation = require("../models/organisation");
const OrgDetails = require("../models/org_details");
const LoginUsers = require("../models/loginusers");
const MailEntry = require("../models/mailentry");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { where, Sequelize, Op } = require("sequelize");
const { render } = require("ejs");
const { sequelize } = require("../models");
const { data } = require("./SubjectsController");
require("dotenv").config();

class DashboardController {
  constructor() {
    this.sample = asyncHandler(async (req, res) => {
      return res.render("admin/sample", {
        title: "Sample",
        content: "../admin/sample",
        url: req.originalUrl,
        baseurl: "/admin",
        homeurl: "/admin/dashboard",
      });
    });

    this.index = asyncHandler(async (req, res) => {
      // return res.status(200).json({message: "Ok 123"});
      return res.render("admin/layout", {
        title: "Dashboard",
        content: "../admin/dashboard",
        url: req.originalUrl,
        baseurl: "/admin",
        homeurl: "/admin/dashboard",
      });
    });

    this.getCounts = asyncHandler(async (req, res) => {
      const orgCount = await Organisation.count();
      const ttlStuCount = await LoginUsers.count();
      const ttlActiveStuCount = await LoginUsers.findAndCountAll({
        where: {
          edited_at: {
            [Op.between]: [
              new Date(new Date() - 30 * 24 * 60 * 60 * 1000),
              new Date(),
            ],
          },
        },
        attributes: ["org_id", "id"],
      });
      const activeOrgIds = ttlActiveStuCount.rows.map((item) => item.org_id);
      const ttlActiveOrgCount = await Organisation.count({
        where: {
          id: {
            [Op.in]: activeOrgIds,
          },
        },
      });

      const prevOrgCount = await Organisation.count({
        where: {
          entered_at: {
            [Op.between]: [
              new Date(new Date() - 30 * 24 * 60 * 60 * 1000),
              new Date(),
            ],
          },
        },
      });
      const orgIncPercentCalc = (orgCount - prevOrgCount / prevOrgCount) * 100;
      const prevStuCount = await LoginUsers.count({
        where: {
          entered_at: {
            [Op.between]: [
              new Date(new Date() - 30 * 24 * 60 * 60 * 1000),
              new Date(),
            ],
          },
        },
      });
      const stuIncPercentCalc =
        (ttlStuCount - prevStuCount / prevStuCount) * 100;
      const prevTtlActiveStuCount = await LoginUsers.findAndCountAll({
        where: {
          edited_at: {
            [Op.between]: [
              new Date(new Date() - 60 * 24 * 60 * 60 * 1000),
              new Date(new Date() - 30 * 24 * 60 * 60 * 1000),
            ],
          },
        },
        attributes: ["org_id", "id"],
      });
      const activeStuIncPercentCalc =
        ((ttlActiveStuCount.count - prevTtlActiveStuCount.count) /
          prevTtlActiveStuCount.count) *
        100;
      const prevActiveOrgIds = prevTtlActiveStuCount.rows.map(
        (item) => item.org_id
      );
      const prevTtlActiveOrgCount = await Organisation.count({
        where: {
          id: {
            [Op.in]: prevActiveOrgIds,
          },
        },
      });
      const activeOrgIncPercentCalc =
        (ttlActiveOrgCount - prevTtlActiveOrgCount / prevTtlActiveOrgCount) *
        100;
      return res.status(200).json({
        totalOrgs: orgCount,
        totalStudents: ttlStuCount,
        totalActiveStudents: ttlActiveStuCount.count,
        totalActiveOrgs: ttlActiveOrgCount,
        orgIncPercent: orgIncPercentCalc ? orgIncPercentCalc.toFixed(2) : 0,
        stuIncPercent: stuIncPercentCalc ? stuIncPercentCalc.toFixed(2) : 0,
        activeStuIncPercent: activeStuIncPercentCalc,
        activeOrgIncPercent: activeOrgIncPercentCalc
          ? activeOrgIncPercentCalc.toFixed(2)
          : 0,
      });
    });

    this.getChartData = asyncHandler(async (req, res) => {
      try {
        const subjects = await Subjects.findAll({
          where: {
            is_deleted: null,
          },
          attributes: ["id", "subject"],
        });
        const results = await Promise.all(
          subjects.map(async (value) => {
            const totalStudentsCount = await LoginUsers.count({
              where: {
                is_deleted: null,
                subject: {
                  [Op.like]: `%${value.id}%`,
                },
              },
            });

            const activeStudentsCount = await LoginUsers.count({
              where: {
                is_deleted: null,
                subject: {
                  [Op.like]: `%${value.id}%`,
                },
                edited_at: {
                  [Op.between]: [
                    new Date(new Date() - 30 * 24 * 60 * 60 * 1000),
                    new Date(),
                  ],
                },
              },
            });

            return {
              subject: value.subject,
              total: totalStudentsCount,
              active: activeStudentsCount,
            };
          })
        );

        const subjectsData = results.map((r) => r.subject);
        const ttlStudentsArr = results.map((r) => r.total);
        const activeStudentsArr = results.map((r) => r.active);

        return res.status(200).json({
          subjects: subjectsData,
          totalStudents: ttlStudentsArr,
          activeStudents: activeStudentsArr,
          status: 200,
        });
      } catch (err) {
        console.error("Error fetching chart data:", err);
        return res
          .status(200)
          .json({ status: 500, error: `Internal server error, ${err}` });
      }
    });

    this.getChartsData = asyncHandler(async (req, res) => {
      try {
        const subjects = await Subjects.findAll({
          where: { is_deleted: null },
          attributes: ["id", "subject"],
        });

        const results = await Promise.all(
          subjects.map(async (subject) => {
            const students = await LoginUsers.findAndCountAll({
              where: {
                is_deleted: null,
                subject: { [Op.like]: `%${subject.id}%` },
              },
            });

            let queryResult = [];
            let completedSubjectsCount = 0;

            for (const student of students.rows) {
              const [data] = await sequelize.query(`
            WITH question_type_ids AS (
              SELECT id FROM question_type WHERE is_deleted IS NULL
            ),
            latest_test_histories AS (
              SELECT *
              FROM (
                SELECT th.id, th.sub_topic, th.question_type,
                       th.correct_ans, th.wrong_ans,
                       ROW_NUMBER() OVER (PARTITION BY th.sub_topic, th.question_type ORDER BY th.id DESC) AS rn
                FROM test_histories th
                WHERE th.is_deleted IS NULL AND th.user_id = ${student.id} AND th.question_type IS NOT NULL
              ) ranked
              WHERE rn = 1
            ),
            marks_per_subtopic AS (
              SELECT sub_topic AS subtopic_id,
                     SUM(COALESCE(correct_ans, 0) + COALESCE(wrong_ans, 0)) AS ttl_mark,
                     SUM(COALESCE(correct_ans, 0)) AS got_mark
              FROM latest_test_histories
              GROUP BY sub_topic
            ),
            subtopics_per_level AS (
              SELECT subtopics.level_id,
                     JSON_ARRAYAGG(
                       JSON_OBJECT(
                         'id', subtopics.id,
                         'title', subtopics.title,
                         'category', CAST(subtopics.category AS JSON),
                         'ttl_mark', COALESCE(marks_per_subtopic.ttl_mark, 0),
                         'got_mark', COALESCE(marks_per_subtopic.got_mark, 0)
                       )
                     ) AS subtopics
              FROM subtopics
              LEFT JOIN marks_per_subtopic ON subtopics.id = marks_per_subtopic.subtopic_id
              WHERE subtopics.is_deleted IS NULL
              GROUP BY subtopics.level_id
            ),
            levels_per_topic AS (
              SELECT levels.topic AS topic_id, levels.id AS level_id, levels.title AS level_title,
                     levels.level AS its_level,
                     COALESCE(subtopics_per_level.subtopics, JSON_ARRAY()) AS subtopics
              FROM levels
              LEFT JOIN subtopics_per_level ON levels.id = subtopics_per_level.level_id
              WHERE levels.is_deleted IS NULL
              ORDER BY levels.level ASC
            ),
            levels_aggregated AS (
              SELECT topic_id, JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id', level_id,
                  'title', level_title,
                  'its_level', its_level,
                  'subtopics', subtopics
                )
              ) AS levels
              FROM levels_per_topic
              GROUP BY topic_id
            ),
            topics_per_subject AS (
              SELECT topics.subject AS subject_id, topics.id AS topic_id, topics.title AS topic_title,
                     COALESCE(levels_aggregated.levels, JSON_ARRAY()) AS levels
              FROM topics
              LEFT JOIN levels_aggregated ON topics.id = levels_aggregated.topic_id
              WHERE topics.is_deleted IS NULL
            ),
            topics_aggregated AS (
              SELECT subject_id, JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id', topic_id,
                  'title', topic_title,
                  'levels', levels
                )
              ) AS topics
              FROM topics_per_subject
              GROUP BY subject_id
            )
            SELECT subjects.id, subjects.subject, subjects.thumbnail,
                   COALESCE(topics_aggregated.topics, JSON_ARRAY()) AS topics
            FROM subjects
            LEFT JOIN topics_aggregated ON subjects.id = topics_aggregated.subject_id
            WHERE subjects.id = ${subject.id} AND subjects.is_deleted IS NULL;
          `);

              let isCompleted = false;
              if (data && data.length > 0) {
                const subjectData = data[0];
                let totalSubtopics = 0;
                let completedSubtopics = 0;

                subjectData.topics.forEach((topic) => {
                  topic.levels.forEach((level) => {
                    level.subtopics.forEach((sub) => {
                      totalSubtopics++;
                      // Only count subtopic as completed if there is test data
                      if (sub.ttl_mark > 0) {
                        completedSubtopics++;
                      }
                    });
                  });
                });

                if (
                  totalSubtopics > 0 &&
                  completedSubtopics === totalSubtopics
                ) {
                  isCompleted = true;
                  completedSubjectsCount++;
                }
              }

              queryResult.push({
                student: student.toJSON(),
                data,
                isCompleted,
              });
            }

            return {
              subject: subject.subject,
              studentCount: students.count,
              completedSubjectsCount,
              completionPercentage:
                students.count > 0
                  ? Math.round((completedSubjectsCount / students.count) * 100)
                  : 0,
              details: queryResult,
            };
          })
        );

        const subjectsData = results.map((r) => r.subject);
        const performancePercents = results.map((r) => r.completionPercentage);

        return res.status(200).json({
          subjects: subjectsData,
          performancePercents,
          status: 200,
        });
      } catch (err) {
        console.error("Error fetching charts data:", err);
        return res.status(500).json({
          status: 500,
          error: `Internal server error: ${err}`,
        });
      }
    });

    this.getSingleDonutData = asyncHandler(async (req, res) => {
      try {
        const subjects = await Subjects.findAll({
          where: { is_deleted: null },
          attributes: ["id", "subject"],
        });

        const ttlOrgCount = await Organisation.count({
          where: {
            is_deleted: null,
          },
        });

        const results = await Promise.all(
          subjects.map(async (value) => {
            // find all students active in last 30 days for this subject
            const ttlActiveStuCount = await LoginUsers.findAndCountAll({
              where: {
                edited_at: {
                  [Op.between]: [
                    new Date(new Date() - 30 * 24 * 60 * 60 * 1000),
                    new Date(),
                  ],
                },
                subject: { [Op.like]: `%${value.id}%` },
              },
              attributes: ["org_id", "id"],
            });

            const activeOrgIds = ttlActiveStuCount.rows.map(
              (item) => item.org_id
            );

            const ttlActiveOrgCount = await Organisation.findAndCountAll({
              where: {
                id: {
                  [Op.in]: activeOrgIds,
                },
              },
              attributes: ["id"],
            });

            const orgActivePercent =
              ttlOrgCount > 0
                ? Math.round((ttlActiveOrgCount.count / ttlOrgCount) * 100)
                : 0;

            let orgResults = [];

            for (const org of ttlActiveOrgCount.rows) {
              const students = await LoginUsers.findAndCountAll({
                where: {
                  is_deleted: null,
                  org_id: org.id,
                },
              });

              let completedSubjectsCount = 0;

              for (const stu_val of students.rows) {
                const [data] = await sequelize.query(
                  `
              WITH question_type_ids AS (
              SELECT id FROM question_type WHERE is_deleted IS NULL
            ),
            latest_test_histories AS (
              SELECT *
              FROM (
                SELECT th.id, th.sub_topic, th.question_type,
                       th.correct_ans, th.wrong_ans,
                       ROW_NUMBER() OVER (PARTITION BY th.sub_topic, th.question_type ORDER BY th.id DESC) AS rn
                FROM test_histories th
                WHERE th.is_deleted IS NULL AND th.user_id = ${stu_val.id} AND th.question_type IS NOT NULL
              ) ranked
              WHERE rn = 1
            ),
            marks_per_subtopic AS (
              SELECT sub_topic AS subtopic_id,
                     SUM(COALESCE(correct_ans, 0) + COALESCE(wrong_ans, 0)) AS ttl_mark,
                     SUM(COALESCE(correct_ans, 0)) AS got_mark
              FROM latest_test_histories
              GROUP BY sub_topic
            ),
            subtopics_per_level AS (
              SELECT subtopics.level_id,
                     JSON_ARRAYAGG(
                       JSON_OBJECT(
                         'id', subtopics.id,
                         'title', subtopics.title,
                         'category', CAST(subtopics.category AS JSON),
                         'ttl_mark', COALESCE(marks_per_subtopic.ttl_mark, 0),
                         'got_mark', COALESCE(marks_per_subtopic.got_mark, 0)
                       )
                     ) AS subtopics
              FROM subtopics
              LEFT JOIN marks_per_subtopic ON subtopics.id = marks_per_subtopic.subtopic_id
              WHERE subtopics.is_deleted IS NULL
              GROUP BY subtopics.level_id
            ),
            levels_per_topic AS (
              SELECT levels.topic AS topic_id, levels.id AS level_id, levels.title AS level_title,
                     levels.level AS its_level,
                     COALESCE(subtopics_per_level.subtopics, JSON_ARRAY()) AS subtopics
              FROM levels
              LEFT JOIN subtopics_per_level ON levels.id = subtopics_per_level.level_id
              WHERE levels.is_deleted IS NULL
              ORDER BY levels.level ASC
            ),
            levels_aggregated AS (
              SELECT topic_id, JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id', level_id,
                  'title', level_title,
                  'its_level', its_level,
                  'subtopics', subtopics
                )
              ) AS levels
              FROM levels_per_topic
              GROUP BY topic_id
            ),
            topics_per_subject AS (
              SELECT topics.subject AS subject_id, topics.id AS topic_id, topics.title AS topic_title,
                     COALESCE(levels_aggregated.levels, JSON_ARRAY()) AS levels
              FROM topics
              LEFT JOIN levels_aggregated ON topics.id = levels_aggregated.topic_id
              WHERE topics.is_deleted IS NULL
            ),
            topics_aggregated AS (
              SELECT subject_id, JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id', topic_id,
                  'title', topic_title,
                  'levels', levels
                )
              ) AS topics
              FROM topics_per_subject
              GROUP BY subject_id
            )
            SELECT subjects.id, subjects.subject, subjects.thumbnail,
                   COALESCE(topics_aggregated.topics, JSON_ARRAY()) AS topics
            FROM subjects
            LEFT JOIN topics_aggregated ON subjects.id = topics_aggregated.subject_id
            WHERE subjects.id = ${value.id} AND subjects.is_deleted IS NULL;
              `
                );

                if (data && data.length > 0) {
                  const subjectData = data[0];
                  let totalSubtopics = 0;
                  let completedSubtopics = 0;

                  subjectData.topics.forEach((topic) => {
                    topic.levels.forEach((level) => {
                      level.subtopics.forEach((sub) => {
                        totalSubtopics++;
                        if (sub.complete_count > 0) {
                          completedSubtopics++;
                        }
                      });
                    });
                  });

                  if (
                    totalSubtopics > 0 &&
                    completedSubtopics === totalSubtopics
                  ) {
                    completedSubjectsCount++;
                  }
                }
              }

              const totalStudents = students.count;
              const orgCompletionPercent =
                totalStudents > 0
                  ? (completedSubjectsCount / totalStudents) * 100
                  : 0;

              orgResults.push({
                orgId: org.id,
                subject: value.subject,
                totalStudents,
                completedSubjectsCount,
                orgCompletionPercent: Math.round(orgCompletionPercent),
              });
            }

            // return summary per subject
            return {
              subject: value.subject,
              orgActivePercent,
              orgCompletionPercent: orgResults.length
                ? Math.round(
                    orgResults.reduce(
                      (sum, o) => sum + o.orgCompletionPercent,
                      0
                    ) / orgResults.length
                  )
                : 0,
              orgResults, // detailed per-org results
            };
          })
        );

        const subjectsData = results.map((r) => r.subject);
        const activePercentData = results.map((r) => r.orgActivePercent);
        const orgCompletionPercentData = results.map(
          (r) => r.orgCompletionPercent
        );

        return res.status(200).json({
          data: results,
          subjects: subjectsData,
          activePercentData,
          orgCompletionPercentData,
          status: 200,
        });
      } catch (err) {
        console.error("Error fetching single donut data:", err);
        return res
          .status(500)
          .json({ status: 500, error: `Internal server error, ${err}` });
      }
    });
  }
}

module.exports = new DashboardController();
