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

    // GET /api/riders
    if (req.url === '/api/riders' && req.method === 'GET') {
        const dataPath = path.resolve(__dirname, 'src/data/riders.json');
        if (fs.existsSync(dataPath)) {
            const data = fs.readFileSync(dataPath, 'utf-8');
            res.writeHead(200);
            res.end(data);
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Riders data not found' }));
        }
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
            const payload = JSON.parse(body);
            const dataPath = path.resolve(__dirname, 'src/data/riders.json');
            let data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

            const updates = Array.isArray(payload) ? payload : [payload];
            console.log(`[AdminAPI] Updating ${updates.length} rider(s)...`);

            updates.forEach(u => {
                if (!u.id) {
                    console.warn('[AdminAPI] Warning: Received update without ID:', u);
                    return;
                }
                const idx = data.findIndex(r => r.id === u.id);
                if (idx !== -1) {
                    console.log(`[AdminAPI] Updating ${u.id}: €${u.prijs}, Type: ${u.type}, Youth: ${!!u.is_jongere}`);
                    data[idx] = { 
                        ...data[idx], 
                        prijs: u.prijs, 
                        gebruiker_type: u.type, 
                        is_jongere: !!u.is_jongere 
                    };
                } else {
                    console.warn(`[AdminAPI] Warning: Rider ID ${u.id} not found in database.`);
                }
            });

            fs.writeFileSync(dataPath, JSON.stringify(data, null, 4));
            res.writeHead(200);
            res.end(JSON.stringify({ success: true }));
        } catch (e) {
            console.error('[AdminAPI] Update Error:', e);
            res.writeHead(500);
            res.end(JSON.stringify({ error: String(e) }));
        }
        return;
    }

    // GET /api/config
    if (req.url === '/api/config' && req.method === 'GET') {
        const configPath = path.resolve(__dirname, 'src/data/round_config.json');
        if (!fs.existsSync(configPath)) {
            // Default config from giro2026.ts logic
            const defaultConfig = {
                formulaParams: { alpha: 1, beta: 15, gamma: 21, delta: 1 },
                typeConfigs: [
                    { type: 'GC', daily_klassement_bonus: 8, expected_eindklassement: 100 },
                    { type: 'Sprinter', daily_klassement_bonus: 5, expected_eindklassement: 50 },
                    { type: 'Sprint+', daily_klassement_bonus: 3, expected_eindklassement: 25 },
                    { type: 'Klimmer', daily_klassement_bonus: 2, expected_eindklassement: 30 },
                    { type: 'Aanvaller', daily_klassement_bonus: 1, expected_eindklassement: 10 },
                    { type: 'Tijdrijder', daily_klassement_bonus: 0, expected_eindklassement: 10 },
                    { type: 'Wildcard', daily_klassement_bonus: 1, expected_eindklassement: 10 }
                ]
            };
            fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 4));
        }
        const config = fs.readFileSync(configPath, 'utf-8');
        res.writeHead(200);
        res.end(config);
        return;
    }

    // POST /api/config
    if (req.url === '/api/config' && req.method === 'POST') {
        try {
            const body = await readBody(req);
            const config = JSON.parse(body);
            const configPath = path.resolve(__dirname, 'src/data/round_config.json');
            fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
            res.writeHead(200);
            res.end(JSON.stringify({ success: true }));
        } catch (e) {
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
