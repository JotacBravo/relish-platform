// Production server for the built app: 301s for old addresses, the build,
// /api, /data and /images proxied to the backend, index.html for other routes.
const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const API_URL = process.env.API_URL || 'http://127.0.0.1:5000';
const BUILD_DIR = path.join(__dirname, 'build');

const app = express();
app.disable('x-powered-by');

// API calls, pre-computed tables (normalisation, story cards, ...) and story images
app.use(createProxyMiddleware({ target: API_URL, changeOrigin: true, pathFilter: ['/api', '/data', '/images'] }));

// Old public addresses -> current ones (301), keeping the query string.
const LEGACY_ROUTES = require('./src/legacyRoutes.json');
Object.entries(LEGACY_ROUTES).forEach(([from, to]) => {
  app.get([from, `${from}/`], (req, res) => {
    const q = req.originalUrl.indexOf('?');
    res.redirect(301, to + (q >= 0 ? req.originalUrl.slice(q) : ''));
  });
});

// The React build
app.use(express.static(BUILD_DIR));

// Any other route: index.html (the router resolves it in the browser)
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(BUILD_DIR, 'index.html'));
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  const HOST = process.env.HOST || '127.0.0.1';
  app.listen(PORT, HOST, () => {
    console.log(`Frontend running on ${HOST}:${PORT}`);
  });
}

module.exports = app;
