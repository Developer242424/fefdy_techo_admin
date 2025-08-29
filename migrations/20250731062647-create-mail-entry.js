"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("mail_entries", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      from: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      to: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      subject: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      template: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      sent_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      from_type: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      to_type: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      entered_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      edited_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.literal(
          "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ),
      },
      is_deleted: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("mail_entries");
  },
};
