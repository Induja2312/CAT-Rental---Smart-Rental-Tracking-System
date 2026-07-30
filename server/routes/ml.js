const router = require('express').Router();
const axios  = require('axios');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

router.get('/health', async (req, res) => {
  try {
    const { data } = await axios.get(`${ML_URL}/health`, { timeout: 3000 });
    res.json(data);
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});

router.post('/predict', async (req, res) => {
  try {
    const { data } = await axios.post(`${ML_URL}/predict`, req.body, { timeout: 5000 });
    res.json(data);
  } catch (err) {
    const status = err.response?.status || 503;
    res.status(status).json(err.response?.data || { message: 'ML service unavailable' });
  }
});

module.exports = router;
