"use strict";
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");

class QuestionType extends Model {
  /**
   * Helper method for defining associations.
   * This method is not a part of Sequelize lifecycle.
   * The `models/index` file will call this method automatically.
   */
  static associate(models) {
    // define association here
  }
}

QuestionType.init(
  {
    type: { type: DataTypes.STRING, allowNull: true },
    thumbnail: { type: DataTypes.STRING, allowNull: true },
    template: { type: DataTypes.STRING, allowNull: true },
    question_limit: { type: DataTypes.INTEGER, allowNull: true },
    entered_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
    },
    edited_at: { type: DataTypes.DATE, allowNull: true },
    is_deleted: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: "QuestionType",
    tableName: "question_type",
    paranoid: true,
    timestamps: false,
    deletedAt: "is_deleted",
  }
);

module.exports = QuestionType;
