const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const Comment = sequelize.define('Comment', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  content: { type: DataTypes.TEXT, allowNull: false },
  isApproved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_approved' },
}, {
  tableName: 'comments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

Comment.belongsTo(User, { foreignKey: { name: 'userId', field: 'user_id' }, onDelete: 'CASCADE' });
User.hasMany(Comment, { foreignKey: { name: 'userId', field: 'user_id' } });

module.exports = Comment;
