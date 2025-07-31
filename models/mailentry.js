"use strict";
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../config/database");
class MailEntry extends Model {
  /**
   * Helper method for defining associations.
   * This method is not a part of Sequelize lifecycle.
   * The `models/index` file will call this method automatically.
   */
  static associate(models) {
    // define association here
  }
}
MailEntry.init(
  {
    from: { type: DataTypes.STRING, allowNull: true },
    to: { type: DataTypes.STRING, allowNull: true },
    subject: { type: DataTypes.TEXT, allowNull: true },
    template: { type: DataTypes.TEXT, allowNull: true },
    sent_date: { type: DataTypes.DATE, allowNull: true },
    from_type: { type: DataTypes.STRING, allowNull: true },
    to_type: { type: DataTypes.STRING, allowNull: true },
    entered_at: { type: DataTypes.DATE, allowNull: true },
    edited_at: { type: DataTypes.DATE, allowNull: true },
    is_deleted: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: "MailEntry",
    tableName: "mail_entries",
    paranoid: true,
    deletedAt: "is_deleted",
    timestamps: false,
  }
);

module.exports = MailEntry;
