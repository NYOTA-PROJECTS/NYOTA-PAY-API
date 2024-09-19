'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CustomerBalance extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.Customer, { foreignKey: 'customerId', onUpdate: 'CASCADE', onDelete: 'CASCADE' });
    }
  }
  CustomerBalance.init({
    customerId: DataTypes.INTEGER,
    amount: DataTypes.DOUBLE
  }, {
    sequelize,
    modelName: 'CustomerBalance',
  });
  return CustomerBalance;
};