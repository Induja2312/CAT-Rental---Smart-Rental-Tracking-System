require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { initSocket } = require('./sockets');
const { startSimulator } = require('./services/telemetrySimulator');
const { startMLPoller }  = require('./services/mlPoller');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: sans-serif; padding: 40px; text-align: center; background: #0f172a; color: #f8fafc; min-height: 100vh;">
      <h1 style="color: #fbbf24; font-size: 28px;">🚜 CAT Rental Backend API Running!</h1>
      <p style="font-size: 16px; color: #94a3b8;">This is the backend API server (Port 5000).</p>
      <p style="font-size: 18px; margin-top: 20px;">
        To open the <strong>Fleet Manager Dashboard UI</strong>, navigate to:
      </p>
      <a href="http://localhost:5173" style="display: inline-block; background: #fbbf24; color: #0f172a; font-weight: bold; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; margin-top: 10px;">
        👉 Open Client UI (http://localhost:5173)
      </a>
    </div>
  `);
});

app.use('/api/auth',       require('./routes/auth'));
app.use('/api/admin',      require('./routes/admin'));
app.use('/api/rentals',    require('./routes/rentals'));
app.use('/api/telemetry',  require('./routes/telemetry'));
app.use('/api/alerts',     require('./routes/alerts'));
app.use('/api/allocation', require('./routes/allocation'));
app.use('/api/ml',         require('./routes/ml'));

const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startSimulator(`http://localhost:${PORT}`);
    startMLPoller();
  });
});
