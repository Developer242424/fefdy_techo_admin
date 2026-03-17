const path = require("path");
const fs = require("fs");
const asyncHandler = require("express-async-handler");
const getDynamicUploader = require("../middleware/upload");

class ImageController {
    constructor() {
        this.getImage = [
            (req, res, next) => {
                const upload = getDynamicUploader("editor-img").single(
                    "editor_image"
                );
                upload(req, res, function (err) {
                    if (err) {
                        return res.status(200).json({ status: 400, message: err.message });
                    }
                    next();
                });
            },
            asyncHandler(async (req, res) => {
                try {
                    // console.log("Files..........", req.file)

                    return res.status(200).json({
                        status: 200,
                        filename: req.file.filename
                    });
                } catch (error) {
                    console.error("Error fetching random questions:", error);
                    return res.status(500).json({
                        message: "Internal server error",
                        error,
                    });
                }
            })
        ]
    }
}

module.exports = new ImageController();
