'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
      return queryInterface.addColumn('Merchants', 'whatsapp', {
        type: Sequelize.STRING,
        allowNull: true,
      }).then(() => {
        return queryInterface.addColumn('Merchants', 'facebook', {
          type: Sequelize.STRING,
          allowNull: true,
        });
      }).then(() => {
        return queryInterface.addColumn('Merchants', 'tiktok', {
          type: Sequelize.STRING,
          allowNull: true,
        });
      }).then(() => {
        return queryInterface.addColumn('Merchants', 'instagram', {
          type: Sequelize.STRING,
          allowNull: true,
        });
      });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    return queryInterface.removeColumn('Merchants', 'whatsapp').then(() => {
      return queryInterface.removeColumn('Merchants', 'facebook');
    }).then(() => {
      return queryInterface.removeColumn('Merchants', 'tiktok');
    }).then(() => {
      return queryInterface.removeColumn('Merchants', 'instagram');
    });
  }
};
