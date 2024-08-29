'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Merchant extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.Category, { foreignKey: 'categoryId' });
      this.hasMany(models.MerchantAdmin, { foreignKey: 'merchantId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
      this.hasMany(models.MerchantPointOfSell, { foreignKey: 'merchantId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
      this.hasMany(models.MerchantBalance, { foreignKey: 'merchantId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
      this.hasMany(models.CashRegister, { foreignKey: 'merchantId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    }
  }
  Merchant.init({
    categoryId: DataTypes.INTEGER,
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    photo: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Merchant',
  });
  return Merchant;
};