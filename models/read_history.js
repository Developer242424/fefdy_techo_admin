"use strict";
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");
class ReadHistory extends Model {
  /**
   * Helper method for defining associations.
   * This method is not a part of Sequelize lifecycle.
   * The `models/index` file will call this method automatically.
   */
  static associate(models) {
    // define association here
  }
}

ReadHistory.init(
  {
    audio_id: { type: DataTypes.TEXT, allowNull: true },
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    is_complete: {
      type: DataTypes.ENUM("0", "1"),
      defaultValue: "0",
      allowNull: false,
    },
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
    modelName: "ReadHistory",
    tableName: "read_histories",
    paranoid: true,
    timestamps: false,
    deletedAt: "is_deleted",
  }
);

module.exports = ReadHistory;
