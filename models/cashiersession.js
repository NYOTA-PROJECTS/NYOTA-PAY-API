'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CashierSession extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.Cashier, { foreignKey: 'cashierId' });
      this.belongsTo(models.Worker, { foreignKey: 'workerId' });
    }
  }
  CashierSession.init({
    cashierId: DataTypes.INTEGER,
    workerId: DataTypes.INTEGER,
    initialBalance: DataTypes.DOUBLE,
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    endTime: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'CashierSession',
  });
  return CashierSession;
};