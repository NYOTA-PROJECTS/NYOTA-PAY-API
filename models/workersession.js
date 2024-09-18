'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class WorkerSession extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.Worker, { foreignKey: 'workerId' });
      this.belongsTo(models.CashRegister, { foreignKey: 'cashRegisterId' });
    }
  }
  WorkerSession.init({
    workerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    cashRegisterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'WorkerSession',
  });
  return WorkerSession;
};