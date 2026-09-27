require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const productRoutes = require('./routes/products');
const calculateRoutes = require('./routes/calculate');
const adminRoutes = require('./routes/admin');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const initDatabase = require('./config/initDb');

const app = express();

// --- Security & parsing middleware ---
// CSP configured to allow CDN scripts (Tailwind, Font Awesome, Google Fonts)
// while maintaining strong security for everything else.
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdn.tailwindcss.com'],
        styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
        fontSrc: ["'self'", 'https:', 'data:'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"]
      }
    }
  })
);
app.use(express.json({ limit: '100kb' }));

// --- Simple request logging ---
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((s) => s.trim());
app.use(
  cors({
    origin: allowedOrigins.includes('*') ? true : allowedOrigins
  })
);

// --- Serve the frontend (single-service deployment) ---
app.use(express.static(path.join(__dirname, '../frontend')));

// --- API routes ---
app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok' }));
app.use('/api/products', productRoutes);
app.use('/api', calculateRoutes);
app.use('/api/admin', adminRoutes);

// Fallback to index.html for any non-API route (simple SPA-style serving).
// Requests that look like a static asset must 404 instead: answering a missing
// .jpg with index.html returns 200 + HTML, so the browser reports a decode
// error rather than a real 404 and the <img> error handler never fires.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  if (path.extname(req.path)) {
    return res.status(404).type('text/plain').send('Not found');
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.use('/api', notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
let server;

// Create and seed the schema before accepting traffic (see config/initDb.js).
// This replaces the "paste schema.sql into a SQL console" step, which is the
// thing most likely to be forgotten and is why ratings silently fail.
// initDatabase never rejects, so the site still boots without a reachable DB.
initDatabase().finally(() => {
  server = app.listen(PORT, () => {
    console.log(`Paras Pavers server running on port ${PORT}`);
  });
});

// Graceful shutdown — close server and DB pool on SIGTERM/SIGINT.
// This ensures in-flight requests complete and connections are released cleanly,
// which is important for container orchestration (Railway, Render, etc.).
let isShuttingDown = false;
function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\n${signal} received — shutting down gracefully...`);
  // initDatabase() may still be pending, in which case server is undefined.
  if (!server) {
    process.exit(0);
  }
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
  // Force-exit if connections don't drain within 10s
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
