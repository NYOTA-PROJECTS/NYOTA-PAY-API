'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MerchantPointOfSell extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.Merchant, { foreignKey: 'merchantId', onUpdate: 'CASCADE' });
      this.hasMany(models.CashRegister, { foreignKey: 'merchantposId', onUpdate: 'CASCADE', onDelete: 'CASCADE' });
    }
  }
  MerchantPointOfSell.init({
    merchantId: DataTypes.INTEGER,
    urlLink: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'MerchantPointOfSell',
  });
  return MerchantPointOfSell;
};