const asyncHandler = require("express-async-handler");
const { check, validationResult } = require("express-validator");
const multer = require("multer");
const User = require("../../models/user");
const LoginUsers = require("../../models/loginusers");
const Subjects = require("../../models/subjects");
const Organisation = require("../../models/organisation");
const UsedTokenHistory = require("../../models/usedtokenhistory");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { where, Sequelize, Op } = require("sequelize");
const { render } = require("ejs");
require("dotenv").config();
const session = require("express-session");
const crypto = require("crypto");
const { default: axios } = require("axios");
const textToSpeech = require("@google-cloud/text-to-speech");
const util = require("util");
const fs = require("fs");
const path = require("path");

class OpenAiTokensController {
  constructor() {
    this.entryTokens = asyncHandler(async (req, res) => {
      try {
        const user = req.session.user;
        const { ques } = req.body;

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        const check = await UsedTokenHistory.findAll({
          where: {
            user_id: user.id,
            type: "dictionary",
            is_deleted: null,
            entered_at: {
              [Op.between]: [startOfToday, endOfToday],
            },
          },
        });
        // console.log(check.length);
        const percentage = (check.length / 20) * 100;
        // console.log(percentage);
        if (percentage >= 30) {
          return res
            .status(200)
            .json({ status: 400, message: "Today's limit is over" });
        }

        const apiKey = process.env.OPENAI_API_KEY;

        const response = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-3.5-turbo-0125",
            messages: [
              {
                role: "system",
                content: "Explain words simply. Use clear, easy words.",
              },
              {
                role: "user",
                content: ques,
              },
            ],
            max_tokens: 50,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        const assistantMessage = response.data.choices[0].message.content;
        const totalTokens = response.data.usage.total_tokens;

        // console.log("Assistant Response:", assistantMessage);
        // console.log("Total Tokens Used:", totalTokens);

        const obj = {
          user_id: user.id,
          used_tokens: totalTokens,
          used_request: 1,
          type: "dictionary",
        };
        await UsedTokenHistory.create(obj);
        return res.status(200).json({ status: 200, message: assistantMessage });
      } catch (error) {
        console.error("Login error:", error);
        return res
          .status(200)
          .json({ status: 500, message: "Internal server error", error });
      }
    });

    this.entryTokensTranslator = asyncHandler(async (req, res) => {
      try {
        const user = req.session.user;
        const { language, text } = req.body;

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        const check = await UsedTokenHistory.findAll({
          where: {
            user_id: user.id,
            type: "translator",
            is_deleted: null,
            entered_at: {
              [Op.between]: [startOfToday, endOfToday],
            },
          },
        });
        // console.log(check.length);
        const percentage = (check.length / 20) * 100;
        // console.log(percentage);
        if (percentage >= 70) {
          return res
            .status(200)
            .json({ status: 400, message: "Today's limit is over" });
        }

        const apiKey = process.env.OPENAI_API_KEY;

        const response = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-3.5-turbo-0125",
            messages: [
              {
                role: "system",
                content: "You are a professional translation assistant. Respond only with the translated text, no explanations.",
              },
              {
                role: "user",
                content: `Translate this to ${language}: ${text}`,
              },
            ],
            max_tokens: 50,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        const assistantMessage = response.data.choices[0].message.content;
        const totalTokens = response.data.usage.total_tokens;

        // console.log("Assistant Response:", assistantMessage);
        // console.log("Total Tokens Used:", totalTokens);

        const obj = {
          user_id: user.id,
          used_tokens: totalTokens,
          used_request: 1,
          type: "translator",
        };
        await UsedTokenHistory.create(obj);
        return res.status(200).json({ status: 200, message: assistantMessage });
      } catch (error) {
        console.error("Login error:", error);
        return res
          .status(200)
          .json({ status: 500, message: "Internal server error", error });
      }
    });

    this.convertAudio = asyncHandler(async (req, res) => {
      try {
        const user = req.session.user;
        const { text, languageCode } = req.body;

        const client = new textToSpeech.TextToSpeechClient();

        const request = {
          input: { text },
          voice: {
            languageCode: languageCode,
            name: getWavenetVoice(languageCode),
          },
          audioConfig: {
            audioEncoding: "MP3",
          },
        };
        console.log(getWavenetVoice(languageCode))

        const [response] = await client.synthesizeSpeech(request);

        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Content-Disposition", "inline; filename=output.mp3");
        res.send(response.audioContent);
      } catch (error) {
        console.error("Audio conversion error:", error.message);
        return res.status(500).json({
          status: 500,
          message: "Failed to convert text to audio",
          error: error.message,
        });
      }
    });

    function getWavenetVoice(languageCode) {
      const voices = {
        "en-US": "en-US-Wavenet-D",
        "ta-IN": "ta-IN-Wavenet-A",
        "te-IN": "te-IN-Wavenet-A",
        "ml-IN": "ml-IN-Wavenet-A",
        "hi-IN": "hi-IN-Wavenet-A",
      };
      return voices[languageCode] || "en-US-Wavenet-D";
    }
  }
}

module.exports = new OpenAiTokensController();
