const express = require('express');
const { User, Comment, Translation } = require('../models');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);

router.get('/users', async (req, res) => {
  const rows = await User.findAll({
    attributes: ['id', 'username', 'email', 'isGoogleAuth', 'isAdmin', 'created_at'],
    order: [['created_at', 'DESC']],
  });
  res.json(rows);
});

router.get('/comments', async (req, res) => {
  const rows = await Comment.findAll({
    order: [['created_at', 'DESC']],
    include: [{ model: User, attributes: ['username'] }],
  });
  res.json(rows.map((c) => ({
    id: c.id,
    user: c.userId,
    user_name: c.User ? c.User.username : null,
    content: c.content,
    is_approved: c.isApproved,
    created_at: c.created_at,
  })));
});

router.patch('/comments/:id', async (req, res) => {
  const row = await Comment.findByPk(req.params.id);
  if (!row) return res.status(404).json({ error: 'غير موجود' });
  const { is_approved } = req.body || {};
  if (typeof is_approved === 'boolean') row.isApproved = is_approved;
  await row.save();
  res.json({ id: row.id, is_approved: row.isApproved });
});

router.delete('/comments/:id', async (req, res) => {
  const row = await Comment.findByPk(req.params.id);
  if (!row) return res.status(404).json({ error: 'غير موجود' });
  await row.destroy();
  res.status(204).end();
});

router.get('/translations', async (req, res) => {
  const rows = await Translation.findAll({
    order: [['created_at', 'DESC']],
    limit: 200,
    include: [{ model: User, attributes: ['username'] }],
  });
  res.json(rows.map((t) => ({
    id: t.id,
    user_name: t.User ? t.User.username : null,
    source_language: t.sourceLanguage,
    target_language: t.targetLanguage,
    original_text: t.originalText,
    translated_text: t.translatedText,
    created_at: t.created_at,
  })));
});

router.delete('/translations/:id', async (req, res) => {
  const row = await Translation.findByPk(req.params.id);
  if (!row) return res.status(404).json({ error: 'غير موجود' });
  await row.destroy();
  res.status(204).end();
});

module.exports = router;
