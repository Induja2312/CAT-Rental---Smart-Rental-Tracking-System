require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { initSocket } = require('./sockets');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth',       require('./routes/auth'));
app.use('/api/admin',      require('./routes/admin'));
app.use('/api/rentals',    require('./routes/rentals'));
app.use('/api/telemetry',  require('./routes/telemetry'));
app.use('/api/alerts',     require('./routes/alerts'));
app.use('/api/allocation', require('./routes/allocation'));

const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
