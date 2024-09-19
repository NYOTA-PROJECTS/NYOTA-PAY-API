'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Customer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.hasMany(models.CustomerBalance, { foreignKey: 'customerId', onUpdate: 'CASCADE', onDelete: 'CASCADE' });
    }
  }
  Customer.init({
    firstName: DataTypes.STRING,
    lastName: DataTypes.STRING,
    photo: DataTypes.STRING,
    phone: DataTypes.STRING,
    password: DataTypes.STRING,
    token: DataTypes.STRING,
    isMobile: DataTypes.BOOLEAN,
    qrcode: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Customer',
  });
  return Customer;
};