const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Backend HTTP server is reachable' });
});

module.exports = router;
