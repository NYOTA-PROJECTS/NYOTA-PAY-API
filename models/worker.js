'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Worker extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      this.belongsTo(models.Merchant, { foreignKey: 'merchantId', onUpdate: 'CASCADE' });
      this.hasMany(models.WorkerSession, { foreignKey: 'workerId', onUpdate: 'CASCADE', onDelete: 'CASCADE' });
      this.hasMany(models.Transaction, { foreignKey: 'workerId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
    }
  }
  Worker.init({
    merchantId: DataTypes.INTEGER,
    isActive: DataTypes.BOOLEAN,
    name: DataTypes.STRING,
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    password:{
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    }
  }, {
    sequelize,
    modelName: 'Worker',
  });
  return Worker;
};