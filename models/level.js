"use strict";
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");
class Level extends Model {
  /**
   * Helper method for defining associations.
   * This method is not a part of Sequelize lifecycle.
   * The `models/index` file will call this method automatically.
   */
  static associate(models) {
    // define association here
  }
}
Level.init(
  {
    level: { type: DataTypes.STRING, allowNull: true },
    game_templates: { type: DataTypes.JSON, allowNull: true },
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
    modelName: "level",
    tableName: "level",
    paranoid: true,
    deletedAt: "is_deleted",
    timestamps: false,
  }
);

module.exports = Level;
