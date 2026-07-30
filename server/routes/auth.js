const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, role: role || 'customer' });
    res.status(201).json({ id: user._id, email: user.email, role: user.role });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token, role: user.role, name: user.name });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
