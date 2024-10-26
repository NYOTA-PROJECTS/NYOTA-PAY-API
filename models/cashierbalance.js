'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CashierBalance extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.Cashier, { foreignKey: 'cashierId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    }
  }
  CashierBalance.init({
    cashierId: DataTypes.INTEGER,
    amount: DataTypes.DOUBLE
  }, {
    sequelize,
    modelName: 'CashierBalance',
  });
  return CashierBalance;
};