import http from 'http';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', (chunk) => body += chunk);
        req.on('end', () => resolve(body));
    });
}

const server = http.createServer(async (req, res) => {
    // CORS headers for dev (Vite runs on :5173, API on :3001)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // POST /api/scrape
    if (req.url === '/api/scrape' && req.method === 'POST') {
        console.log('[AdminAPI] Running scraper script...');
        const scriptPath = path.resolve(__dirname, '../scripts/import_riders.py');
        exec(`python "${scriptPath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error('[AdminAPI] Exec Error:', error.message);
                res.writeHead(500);
                res.end(JSON.stringify({ error: error.message, stderr }));
                return;
            }
            console.log('[AdminAPI] Scrape complete.');
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, output: stdout }));
        });
        return;
    }

    // POST /api/riders
    if (req.url === '/api/riders' && req.method === 'POST') {
        try {
            const body = await readBody(req);
            const updates = JSON.parse(body);
            console.log('[AdminAPI] Updating rider:', updates.id);
            const dataPath = path.resolve(__dirname, 'src/data/riders.json');
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

            const updatedData = data.map((r) =>
                r.id === updates.id ? { ...r, prijs: updates.prijs, gebruiker_type: updates.type } : r
            );

            fs.writeFileSync(dataPath, JSON.stringify(updatedData, null, 4));
            res.writeHead(200);
            res.end(JSON.stringify({ success: true }));
        } catch (e) {
            console.error('[AdminAPI] Update Error:', e);
            res.writeHead(500);
            res.end(JSON.stringify({ error: String(e) }));
        }
        return;
    }

    // Fallback
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(3001, '127.0.0.1', () => {
    console.log('[AdminAPI] Server running on http://127.0.0.1:3001');
});
