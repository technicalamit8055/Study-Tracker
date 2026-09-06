require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Route API endpoints to serverless handler modules
const healthHandler = require('./api/health');
const registerHandler = require('./api/auth/register');
const loginHandler = require('./api/auth/login');
const meHandler = require('./api/auth/me');
const progressHandler = require('./api/progress');
const examsHandler = require('./api/exams');
const configHandler = require('./api/config');

app.all('/api/health', (req, res) => healthHandler(req, res));
app.all('/api/auth/register', (req, res) => registerHandler(req, res));
app.all('/api/auth/login', (req, res) => loginHandler(req, res));
app.all('/api/auth/me', (req, res) => meHandler(req, res));
app.all('/api/progress', (req, res) => progressHandler(req, res));
app.all('/api/exams', (req, res) => examsHandler(req, res));
app.all('/api/config', (req, res) => configHandler(req, res));

// Custom headers for service worker and data files
app.use('/sw.js', (req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.setHeader('Service-Worker-Allowed', '/');
  next();
});

app.use('/data', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  next();
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Fallback to index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start dev server
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  🚀 ExamRoadmap Server Running!`);
  console.log(`  Local URL:   http://localhost:${PORT}`);
  console.log(`  Health API:  http://localhost:${PORT}/api/health`);
  console.log(`  Supabase:    ${process.env.SUPABASE_URL ? "configured via .env" : "using src/supabase-config.js defaults"}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`======================================================\n`);
});
