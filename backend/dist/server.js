"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load .env from backend dir and also support root fallbacks
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env.local') });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const https_1 = __importDefault(require("https"));
const cors_1 = __importDefault(require("cors"));
const yahooApi_1 = require("./lib/yahooApi");
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 4000;
const TLS_PORT = Number(process.env.PORT_TLS) || 4443;
// For development/testing: allow all origins. Switch to an allowlist for production.
app.use((0, cors_1.default)({
    origin: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
    preflightContinue: false,
    credentials: false,
}));
app.use(express_1.default.json());
function getToken(req) {
    const auth = req.headers['authorization'];
    if (!auth)
        return null;
    const [scheme, token] = auth.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token)
        return null;
    return token;
}
app.get('/leagues', async (req, res) => {
    const token = getToken(req);
    if (!token)
        return res.status(401).json({ error: 'Unauthorized' });
    const api = new yahooApi_1.YahooFantasyAPI(token);
    try {
        const leagues = await api.getUserLeagues();
        res.json({ leagues });
    }
    catch (e) {
        console.error('Error in /leagues:', e?.message || e);
        res.status(500).json({ error: 'Failed to fetch leagues', details: e?.message || String(e) });
    }
});
// Yahoo OAuth: start -> redirect to Yahoo auth
app.get('/auth/yahoo/start', (req, res) => {
    const clientId = process.env.YAHOO_CLIENT_ID;
    const redirectUri = process.env.YAHOO_REDIRECT_URI || `http://localhost:${PORT}/auth/yahoo/callback`;
    if (!clientId)
        return res.status(500).send('Yahoo client ID not configured');
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        language: 'en-us',
        scope: 'fspt-r',
    });
    const url = `https://api.login.yahoo.com/oauth2/request_auth?${params.toString()}`;
    res.redirect(url);
});
// Yahoo OAuth: callback -> exchange code and postMessage token to opener
app.get('/auth/yahoo/callback', async (req, res) => {
    try {
        const code = req.query.code || '';
        const clientId = process.env.YAHOO_CLIENT_ID;
        const clientSecret = process.env.YAHOO_CLIENT_SECRET;
        const redirectUri = process.env.YAHOO_REDIRECT_URI || `http://localhost:${PORT}/auth/yahoo/callback`;
        if (!clientId || !clientSecret)
            return res.status(500).send('Yahoo credentials not configured');
        const authHeader = Buffer.from(`${clientId}:${clientSecret}`, 'binary').toString('base64');
        const body = new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            code,
            grant_type: 'authorization_code',
        });
        const tokenRes = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authHeader}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0',
            },
            body: body.toString(),
        });
        const text = await tokenRes.text();
        if (!tokenRes.ok) {
            console.error('Yahoo token exchange failed', tokenRes.status, text);
            return res.status(500).send(`Token exchange failed (${tokenRes.status}): ${text}`);
        }
        let tokens;
        try {
            tokens = JSON.parse(text);
        }
        catch {
            return res.status(500).send('Invalid token response');
        }
        const accessToken = tokens.access_token;
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>Yahoo Auth Complete</title></head>
      <body style="font-family: ui-sans-serif, system-ui;">
        <script>
          (function(){
            try{ if (window.opener) { window.opener.postMessage({ type: 'yahoo-auth', accessToken: ${JSON.stringify(accessToken)} }, '*'); } }
            catch(e){}
            setTimeout(function(){ window.close(); }, 100);
          })();
        </script>
        <p>You can close this window.</p>
      </body></html>`;
        res.setHeader('Content-Type', 'text/html').send(html);
    }
    catch (e) {
        console.error('Auth callback error', e);
        res.status(500).send('Auth callback error');
    }
});
// Debug endpoint to verify Yahoo OAuth env wiring (no secrets exposed)
app.get('/auth/yahoo/config', (_req, res) => {
    res.json({
        hasClientId: !!process.env.YAHOO_CLIENT_ID,
        hasClientSecret: !!process.env.YAHOO_CLIENT_SECRET,
        redirectUri: process.env.YAHOO_REDIRECT_URI || `http://localhost:${PORT}/auth/yahoo/callback`,
    });
});
app.get('/league/:leagueKey', async (req, res) => {
    const token = getToken(req);
    if (!token)
        return res.status(401).json({ error: 'Unauthorized' });
    const api = new yahooApi_1.YahooFantasyAPI(token);
    try {
        const league = await api.getLeague(req.params.leagueKey);
        res.json({ league });
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch league' });
    }
});
app.get('/league/:leagueKey/standings', async (req, res) => {
    const token = getToken(req);
    if (!token)
        return res.status(401).json({ error: 'Unauthorized' });
    const api = new yahooApi_1.YahooFantasyAPI(token);
    try {
        const standings = await api.getStandings(req.params.leagueKey);
        res.json({ standings });
    }
    catch (e) {
        console.error('Error in /league/:leagueKey/standings:', e?.message || e);
        res.status(500).json({ error: 'Failed to fetch standings', details: e?.message || String(e) });
    }
});
app.get('/team/:teamKey', async (req, res) => {
    const token = getToken(req);
    if (!token)
        return res.status(401).json({ error: 'Unauthorized' });
    const api = new yahooApi_1.YahooFantasyAPI(token);
    try {
        const team = await api.getTeam(req.params.teamKey);
        res.json({ team });
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch team' });
    }
});
app.get('/team/:teamKey/roster', async (req, res) => {
    const token = getToken(req);
    if (!token)
        return res.status(401).json({ error: 'Unauthorized' });
    const api = new yahooApi_1.YahooFantasyAPI(token);
    const date = req.query.date;
    const debug = req.query.debug;
    try {
        const roster = await api.getRosterByDate(req.params.teamKey, date, { debugPlayerKey: debug });
        const sample = Array.isArray(roster) ? roster.slice(0, 2) : [];
        res.json({ roster, sample, coverage: date ? { type: 'date', date } : { type: 'today' } });
    }
    catch (e) {
        console.error('Error in /team/:teamKey/roster:', e?.message || e);
        res.status(500).json({ error: 'Failed to fetch roster', details: e?.message || String(e) });
    }
});
app.get('/team/:teamKey/roster/stats', async (req, res) => {
    const token = getToken(req);
    if (!token)
        return res.status(401).json({ error: 'Unauthorized' });
    const api = new yahooApi_1.YahooFantasyAPI(token);
    try {
        const rosterWithStats = await api.getRosterWithStats(req.params.teamKey);
        res.json({ rosterWithStats });
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch roster with stats' });
    }
});
app.get('/team/:teamKey/current-matchup', async (req, res) => {
    const token = getToken(req);
    if (!token)
        return res.status(401).json({ error: 'Unauthorized' });
    const api = new yahooApi_1.YahooFantasyAPI(token);
    try {
        const currentMatchup = await api.getCurrentMatchup(req.params.teamKey);
        res.json({ currentMatchup });
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch current matchup' });
    }
});
app.get('/team/:teamKey/matchups', async (req, res) => {
    const token = getToken(req);
    if (!token)
        return res.status(401).json({ error: 'Unauthorized' });
    const api = new yahooApi_1.YahooFantasyAPI(token);
    try {
        const matchups = await api.getMatchups(req.params.teamKey);
        res.json({ matchups });
    }
    catch {
        res.status(500).json({ error: 'Failed to fetch matchups' });
    }
});
app.get('/team/:teamKey/test-endpoints', async (req, res) => {
    const token = getToken(req);
    if (!token)
        return res.status(401).json({ error: 'Unauthorized' });
    const api = new yahooApi_1.YahooFantasyAPI(token);
    try {
        await api.testFantasyPointsEndpoints(req.params.teamKey);
        res.json({ message: 'Endpoint testing complete. Check debug.log for results.' });
    }
    catch {
        res.status(500).json({ error: 'Failed to test endpoints' });
    }
});
app.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
});
// Optionally also start HTTPS for OAuth callbacks if certs exist
try {
    const candidates = [
        path_1.default.resolve(__dirname, '..', '..', 'certificates'), // repo root /certificates
        path_1.default.resolve(__dirname, '..', 'certificates'), // backend/certificates
        path_1.default.resolve(__dirname, '..', '..', 'frontend', 'certificates') // frontend/certificates
    ];
    console.log('HTTPS cert search paths:', candidates);
    let keyPath = null;
    let certPath = null;
    for (const dir of candidates) {
        const k = path_1.default.join(dir, 'localhost.key');
        const c = path_1.default.join(dir, 'localhost.crt');
        if (fs_1.default.existsSync(k) && fs_1.default.existsSync(c)) {
            keyPath = k;
            certPath = c;
            break;
        }
    }
    if (keyPath && certPath) {
        const httpsOptions = { key: fs_1.default.readFileSync(keyPath), cert: fs_1.default.readFileSync(certPath) };
        https_1.default.createServer(httpsOptions, app).listen(TLS_PORT, () => {
            console.log(`Backend HTTPS listening on https://localhost:${TLS_PORT} (certs: ${path_1.default.dirname(keyPath)})`);
        });
    }
    else {
        console.log('HTTPS certificates not found in any known location; set YAHOO_REDIRECT_URI to http and register it in Yahoo dev, or add certs.');
    }
}
catch (e) {
    console.warn('Failed to start HTTPS server:', e);
}
// Simple health and callback test endpoints
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/auth/yahoo/callback/test', (_req, res) => {
    res.setHeader('Content-Type', 'text/html').send('<!doctype html><html><body>Callback reachable.</body></html>');
});
