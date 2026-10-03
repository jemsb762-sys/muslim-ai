import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import chatHandler from './api/chat.js';

try {
  process.loadEnvFile();
} catch {
  // Ignore if .env doesn't exist
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.use(express.json());

// API route
app.all('/api/chat', (req, res) => {
  chatHandler(req, res);
});

// Serve static assets from project root
app.use(express.static(__dirname));

// Fallback to index.html for SPA/static routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
