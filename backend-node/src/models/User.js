const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// نموذج المستخدم: username هو البريد الإلكتروني نفسه (نفس اتفاقية النسخة
// السابقة على Django)، وكلمة المرور مشفّرة عبر bcrypt (يُحسب الهاش في
// خدمة auth، لا في hook هنا، لأن مستخدمي Google لا يملكون كلمة مرور أصلاً).
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  username: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  email: { type: DataTypes.STRING(254), allowNull: true },
  passwordHash: { type: DataTypes.STRING(255), allowNull: true, field: 'password_hash' },
  profilePicture: { type: DataTypes.STRING(500), allowNull: true, field: 'profile_picture' },
  isGoogleAuth: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_google_auth' },
  isAdmin: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_admin' },
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = User;
