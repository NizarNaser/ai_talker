const express = require('express');
const { Translation } = require('../models');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const rows = await Translation.findAll({ where: { userId: req.user.id }, order: [['created_at', 'DESC']] });
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const row = await Translation.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!row) return res.status(404).json({ error: 'غير موجود' });
  res.json(row);
});

router.post('/', async (req, res) => {
  const { source_language, target_language, original_text, translated_text, is_favorite } = req.body || {};
  if (!source_language || !target_language || !original_text || !translated_text) {
    return res.status(400).json({ error: 'الحقول source_language وtarget_language وoriginal_text وtranslated_text مطلوبة' });
  }
  const row = await Translation.create({
    userId: req.user.id,
    sourceLanguage: source_language,
    targetLanguage: target_language,
    originalText: original_text,
    translatedText: translated_text,
    isFavorite: Boolean(is_favorite),
  });
  res.status(201).json(row);
});

router.patch('/:id', async (req, res) => {
  const row = await Translation.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!row) return res.status(404).json({ error: 'غير موجود' });
  const { is_favorite } = req.body || {};
  if (typeof is_favorite === 'boolean') row.isFavorite = is_favorite;
  await row.save();
  res.json(row);
});

router.delete('/:id', async (req, res) => {
  const row = await Translation.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!row) return res.status(404).json({ error: 'غير موجود' });
  await row.destroy();
  res.status(204).end();
});

module.exports = router;
