"use strict";
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");
class AttendedTestQuestion extends Model {
  /**
   * Helper method for defining associations.
   * This method is not a part of Sequelize lifecycle.
   * The `models/index` file will call this method automatically.
   */
  static associate(models) {
    // define association here
  }
}

AttendedTestQuestion.init(
  {
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    question: { type: DataTypes.TEXT, allowNull: true },
    comp_time: { type: DataTypes.INTEGER, allowNull: true },
    is_correct: { type: DataTypes.INTEGER, allowNull: true },
    is_entered: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
    },
    is_edited: { type: DataTypes.DATE, allowNull: true },
    is_deleted: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: "AttendedTestQuestion",
    tableName: "attended_test_questions",
    paranoid: true,
    deletedAt: "is_deleted",
    timestamps: false,
  }
);

module.exports = AttendedTestQuestion;
