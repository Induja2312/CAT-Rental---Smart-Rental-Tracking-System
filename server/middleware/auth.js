const jwt = require('jsonwebtoken');

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'No token' });
  try {
    req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) return res.status(403).json({ message: 'Forbidden' });
  next();
};

module.exports = { requireAuth, requireRole };
