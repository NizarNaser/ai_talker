const express = require('express');
const { SiteLike } = require('../models');

const router = express.Router();

async function getLikeRow() {
  const [row] = await SiteLike.findOrCreate({ where: { id: 1 }, defaults: { id: 1, totalLikes: 1000 } });
  return row;
}

router.get('/site-like', async (req, res) => {
  const row = await getLikeRow();
  res.json({ total_likes: row.totalLikes });
});

router.post('/site-like', async (req, res) => {
  const row = await getLikeRow();
  row.totalLikes += 1;
  await row.save();
  res.json({ total_likes: row.totalLikes, message: 'تم إضافة الإعجاب بنجاح.' });
});

module.exports = router;
