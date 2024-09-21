"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.Customer, { foreignKey: "customerId" });
      this.belongsTo(models.Merchant, { foreignKey: "merchantId" });
      this.belongsTo(models.CashRegister, { foreignKey: "cashRegisterId" });
      this.belongsTo(models.Worker, { foreignKey: "workerId" });
    }
  }
  Transaction.init(
    {
      customerId: DataTypes.INTEGER,
      merchantId: DataTypes.INTEGER,
      cashRegisterId: DataTypes.INTEGER,
      workerId: DataTypes.INTEGER,
      type: DataTypes.ENUM('SEND', 'COLLECT'),
      code: DataTypes.STRING,
      amount: DataTypes.DOUBLE,
      initAmount: DataTypes.DOUBLE,
      commission: DataTypes.DOUBLE,
    },
    {
      sequelize,
      modelName: "Transaction",
    }
  );
  return Transaction;
};
