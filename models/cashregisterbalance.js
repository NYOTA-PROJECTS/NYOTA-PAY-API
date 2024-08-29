'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CashRegisterBalance extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.CashRegister, { foreignKey: 'cashregisterId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    }
  }
  CashRegisterBalance.init({
    cashregisterId: DataTypes.INTEGER,
    amount: DataTypes.DOUBLE
  }, {
    sequelize,
    modelName: 'CashRegisterBalance',
  });
  return CashRegisterBalance;
};