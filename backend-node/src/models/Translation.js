const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const Translation = sequelize.define('Translation', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  sourceLanguage: { type: DataTypes.STRING(10), allowNull: false, field: 'source_language' },
  targetLanguage: { type: DataTypes.STRING(10), allowNull: false, field: 'target_language' },
  originalText: { type: DataTypes.TEXT, allowNull: false, field: 'original_text' },
  translatedText: { type: DataTypes.TEXT, allowNull: false, field: 'translated_text' },
  isFavorite: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_favorite' },
}, {
  tableName: 'translations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

Translation.belongsTo(User, { foreignKey: { name: 'userId', field: 'user_id' }, onDelete: 'CASCADE' });
User.hasMany(Translation, { foreignKey: { name: 'userId', field: 'user_id' } });

module.exports = Translation;
