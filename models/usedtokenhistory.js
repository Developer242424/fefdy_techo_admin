"use strict";
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");

class UsedTokenHistory extends Model {
  /**
   * Helper method for defining associations.
   * This method is not a part of Sequelize lifecycle.
   * The `models/index` file will call this method automatically.
   */
  static associate(models) {
    // define association here
  }
}

UsedTokenHistory.init(
  {
    user_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    used_tokens: { type: DataTypes.INTEGER, allowNull: true },
    used_request: { type: DataTypes.INTEGER, allowNull: true },
    type: { type: DataTypes.STRING, allowNull: true },
    entered_at: { type: DataTypes.DATE, allowNull: true },
    edited_at: { type: DataTypes.DATE, allowNull: true },
    is_deleted: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: "UsedTokenHistories",
    tableName: "usedtokenhistories",
    timestamps: false,
    paranoid: true,
    deletedAt: "is_deleted",
  }
);

module.exports = UsedTokenHistory;
