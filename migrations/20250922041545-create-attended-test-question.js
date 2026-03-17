"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("attended_test_questions", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      question_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      question: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      comp_time: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      is_correct: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      is_entered: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      is_edited: {
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
    await queryInterface.dropTable("attended_test_questions");
  },
};
