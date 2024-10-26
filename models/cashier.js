'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Cashier extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.Merchant, { foreignKey: 'merchantId', onUpdate: 'CASCADE' });
      this.belongsTo(models.PointOfSale, { foreignKey: 'merchantId', onUpdate: 'CASCADE' });
      this.hasMany(models.Transaction, { foreignKey: 'cashierId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
      this.hasOne(models.CashierBalance, { foreignKey: 'cashierId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    }
  }
  Cashier.init({
    merchantId: DataTypes.INTEGER,
    posId: DataTypes.INTEGER,
    isActive: DataTypes.BOOLEAN,
    name: DataTypes.STRING,
    minBalance: DataTypes.DOUBLE
  }, {
    sequelize,
    modelName: 'Cashier',
  });
  return Cashier;
};