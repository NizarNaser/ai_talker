const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// صف واحد فقط دائماً (id=1)، يحمل إجمالي عدد الإعجابات بالموقع.
const SiteLike = sequelize.define('SiteLike', {
  id: { type: DataTypes.INTEGER, primaryKey: true },
  totalLikes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1000, field: 'total_likes' },
}, {
  tableName: 'site_likes',
  timestamps: true,
  createdAt: false,
  updatedAt: 'last_updated',
});

module.exports = SiteLike;
