const sequelize = require('../config/db');
const User = require('./User');
const Translation = require('./Translation');
const Comment = require('./Comment');
const SiteLike = require('./SiteLike');

module.exports = { sequelize, User, Translation, Comment, SiteLike };
