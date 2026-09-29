const express = require('express');
const { Comment, User } = require('../models');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  const rows = await Comment.findAll({
    where: { isApproved: true },
    order: [['created_at', 'DESC']],
    include: [{ model: User, attributes: ['username', 'profilePicture'] }],
  });
  res.json(rows.map(serializeComment));
});

router.post('/', requireAuth, async (req, res) => {
  const { content } = req.body || {};
  if (!content || !content.trim()) return res.status(400).json({ error: 'محتوى التعليق مطلوب' });
  const row = await Comment.create({ userId: req.user.id, content });
  const withUser = await Comment.findByPk(row.id, { include: [{ model: User, attributes: ['username', 'profilePicture'] }] });
  res.status(201).json(serializeComment(withUser));
});

function serializeComment(row) {
  return {
    id: row.id,
    user: row.userId,
    user_name: row.User ? row.User.username : null,
    user_picture: row.User ? row.User.profilePicture : null,
    content: row.content,
    created_at: row.created_at,
  };
}

module.exports = router;
