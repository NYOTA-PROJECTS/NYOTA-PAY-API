'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MerchantPicture extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.Merchant, { foreignKey: 'merchantId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    }
  }
  MerchantPicture.init({
    merchantId: DataTypes.INTEGER,
    photo: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'MerchantPicture',
  });
  return MerchantPicture;
};