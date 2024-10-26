'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CashRegister extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.Merchant, { foreignKey: 'merchantId', onUpdate: 'CASCADE' });
      this.belongsTo(models.PointOfSale, { foreignKey: 'posId', onUpdate: 'CASCADE' });
      this.hasOne(models.CashRegisterBalance, { foreignKey: 'cashregisterId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
      this.hasMany(models.Transaction, { foreignKey: 'cashRegisterId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    }
  }
  CashRegister.init({
    merchantId: DataTypes.INTEGER,
    merchantposId: DataTypes.INTEGER,
    name: DataTypes.STRING,
    minBalance: {
      type: DataTypes.DOUBLE,
      defaultValue: 0,
      validate: {
        min: 0
      }
    }
  }, {
    sequelize,
    modelName: 'CashRegister',
  });
  return CashRegister;
};