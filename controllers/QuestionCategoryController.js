const asyncHandler = require("express-async-handler");
const { check, validationResult } = require("express-validator");
const Questions = require("../models/questions");
require("dotenv").config();
const getDynamicUploader = require("../middleware/upload");
const path = require("path");
const fs = require("fs");
const QuestionType = require("../models/questiontype");

class QuestionCategoryController {
    constructor() {
        this.index = asyncHandler(async (req, res) => {
            return res.render("admin/layout", {
                title: "Create Questions",
                content: "../admin/questions/category/index",
                url: req.originalUrl,
                baseurl: "/admin",
                homeurl: "/admin/dashboard",
            });
        });

        this.list = asyncHandler(async (req, res) => {
            const get = await QuestionType.findAll({
                where: {
                    is_deleted: null
                },
                order: [['id', 'DESC']]
            })
            const data = get.map((value) => {
                return {
                    id: value.id,
                    title: value.title,
                    action: `
                        <button class='btn btn-primary btn-sm' onclick="OpenEditModal(${value.id})">Edit</button>
                        <button class='btn btn-danger btn-sm' onclick="DeleteData(${value.id})">Delete</button>
                        `,
                };
            });
            return res.status(200).json({ status: 200, data });
        });

        this.create = [
            (req, res, next) => {
                const upload = getDynamicUploader("question_category").single("thumbnail");
                upload(req, res, function (err) {
                    if (err) {
                        return res.status(200).json({ status: 400, message: err.message });
                    }
                    next();
                });
            },
            check('category').notEmpty().withMessage('Category Title is required'),
            asyncHandler(async (req, res) => {
                // console.log(req.body);
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(200).json({ status: 401, errors: errors.array() });
                }
                const { category } = req.body;
                const file = req.file;
                if (!file) {
                    return res
                        .status(200)
                        .json({ status: 400, message: "Thumbnail is required" });
                }
                const insert = await QuestionType.create({
                    title: category,
                    type: 'fromadmin',
                    description: `<p>${category}</p>`,
                    thumbnail: `uploads/question_category/${file.filename}`,
                    template: `http://localhost:5001/admin/choose`,
                    question_limit: 1,
                    max_time: 30,
                    max_attempts: 1,
                    structure_type: `editor`
                });
                return res.status(200).json({
                    status: 200,
                    message: "Category created successfully",
                });
            })
        ];

        this.data = asyncHandler(async (req, res) => {
            try{
                const { id } = req.body;
                if (!id) {
                    return res
                        .status(200)
                        .json({ status: 400, message: "Category ID is required" });
                }
                const data = await QuestionType.findOne({ where: { id } });
                return res.status(200).json({ status: 200, data });
            } catch (error) {
                return res.status(200).json({
                    status: 500,
                    message: "Internal server error - " + error.message,
                    error,
                });
            }
        })

        this.update = [
            (req, res, next) => {
                const upload = getDynamicUploader("question_category").single("edit_thumbnail");
                upload(req, res, function (err) {
                    if (err) {
                        return res.status(200).json({ status: 400, message: err.message });
                    }
                    next();
                });
            },
            check('edit_category').notEmpty().withMessage('Category Title is required'),
            asyncHandler(async (req, res) => {
                // console.log(req.body);
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(200).json({ status: 401, errors: errors.array() });
                }
                const { edit_category, edit_id } = req.body;
                const file = req.file;
                const get = await QuestionType.findOne({ where: { id: edit_id } });
                if (file && get.thumbnail) {
                    const oldPath = path.join(
                        __dirname,
                        "../public",
                        get.thumbnail
                    );
                    fs.unlink(oldPath, (err) => {
                        if (err) {
                            console.warn(`Old file delete warning: ${err.message}`);
                        }
                    });
                    get.thumbnail = `uploads/question_category/${file.filename}`;
                }
                (get.title = edit_category),
                await get.save();
                return res.status(200).json({
                    status: 200,
                    message: "Category updated successfully",
                });
            })
        ];

        this.destroy = asyncHandler(async (req, res) => {
            try {
                const { id } = req.body;
                if (!id) {
                    return res
                        .status(200)
                        .json({ status: 400, message: "Category ID is required" });
                }
                const get = await QuestionType.findOne({ where: { id } });
                if (!get) {
                    return res
                        .status(200)
                        .json({ status: 400, message: "Category not found" });
                }
                await QuestionType.update({ is_deleted: new Date() }, { where: { id } });
                return res.status(200).json({
                    status: 200,
                    message: "Category deleted successfully",
                });
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

module.exports = new QuestionCategoryController();