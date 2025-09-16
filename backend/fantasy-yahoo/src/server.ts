import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import https from 'https';
import cors from 'cors';
import { YahooFantasyAPI } from './lib/yahooApi';

// Load environment variables from both the service folder and the backend root.
const envCandidates = [
  path.resolve(__dirname, '../.env'),            // backend/fantasy-yahoo/.env
  path.resolve(__dirname, '../.env.local'),      // backend/fantasy-yahoo/.env.local
  path.resolve(__dirname, '../../.env'),         // backend/.env (shared backend config)
  path.resolve(__dirname, '../../.env.local'),   // backend/.env.local (shared overrides)
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '.env.local'),
];

for (const candidate of envCandidates) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate, override: false });
  }
}

const app = express();
const PORT = Number(process.env.FANTASY_YAHOO_PORT || process.env.PORT || 4002);
const HOST = process.env.FANTASY_YAHOO_HOST || '0.0.0.0';
const TLS_PORT = Number(process.env.FANTASY_YAHOO_TLS_PORT || process.env.PORT_TLS || 4443);
const publicBaseUrl = (process.env.FANTASY_YAHOO_EXTERNAL_URL || '').trim() || `http://localhost:${PORT}`;
const normalizedBaseUrl = publicBaseUrl.replace(/\/$/, '');
// For development/testing: allow all origins. Switch to an allowlist for production.
app.use(cors({
  origin: true,
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
  preflightContinue: false,
  credentials: false,
}));
app.use(express.json());

function getToken(req: Request): string | null {
  const auth = req.headers['authorization'];
  if (!auth) return null;
  const [scheme, token] = auth.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

app.get('/leagues', async (req: Request, res: Response) => {
  const token = getToken(req); if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const api = new YahooFantasyAPI(token);
  try {
    const leagues = await api.getUserLeagues();
    res.json({ leagues });
  } catch (e: any) {
    console.error('Error in /leagues:', e?.message || e);
    res.status(500).json({ error: 'Failed to fetch leagues', details: e?.message || String(e) });
  }
});

// Yahoo OAuth: start -> redirect to Yahoo auth
app.get('/auth/yahoo/start', (req: Request, res: Response) => {
  const clientId = process.env.YAHOO_CLIENT_ID;
  const redirectUri = process.env.YAHOO_REDIRECT_URI || `${normalizedBaseUrl}/auth/yahoo/callback`;
  if (!clientId) return res.status(500).send('Yahoo client ID not configured');
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
app.get('/auth/yahoo/callback', async (req: Request, res: Response) => {
  try {
    const code = (req.query.code as string) || '';
    const clientId = process.env.YAHOO_CLIENT_ID!;
    const clientSecret = process.env.YAHOO_CLIENT_SECRET!;
    const redirectUri = process.env.YAHOO_REDIRECT_URI || `${normalizedBaseUrl}/auth/yahoo/callback`;
    if (!clientId || !clientSecret) return res.status(500).send('Yahoo credentials not configured');
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
    } as any);
    const text = await tokenRes.text();
    if (!tokenRes.ok) {
      console.error('Yahoo token exchange failed', tokenRes.status, text);
      return res.status(500).send(`Token exchange failed (${tokenRes.status}): ${text}`);
    }
    let tokens: any; try { tokens = JSON.parse(text); } catch { return res.status(500).send('Invalid token response'); }
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
  } catch (e: any) {
    console.error('Auth callback error', e);
    res.status(500).send('Auth callback error');
  }
});

// Debug endpoint to verify Yahoo OAuth env wiring (no secrets exposed)
app.get('/auth/yahoo/config', (_req: Request, res: Response) => {
  res.json({
    hasClientId: !!process.env.YAHOO_CLIENT_ID,
    hasClientSecret: !!process.env.YAHOO_CLIENT_SECRET,
    redirectUri: process.env.YAHOO_REDIRECT_URI || `${normalizedBaseUrl}/auth/yahoo/callback`,
  });
});

app.get('/league/:leagueKey', async (req: Request, res: Response) => {
  const token = getToken(req); if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const api = new YahooFantasyAPI(token);
  try { const league = await api.getLeague(req.params.leagueKey); res.json({ league }); }
  catch { res.status(500).json({ error: 'Failed to fetch league' }); }
});

app.get('/league/:leagueKey/standings', async (req: Request, res: Response) => {
  const token = getToken(req); if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const api = new YahooFantasyAPI(token);
  try { const standings = await api.getStandings(req.params.leagueKey); res.json({ standings }); }
  catch (e: any) { console.error('Error in /league/:leagueKey/standings:', e?.message || e); res.status(500).json({ error: 'Failed to fetch standings', details: e?.message || String(e) }); }
});

app.get('/team/:teamKey', async (req: Request, res: Response) => {
  const token = getToken(req); if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const api = new YahooFantasyAPI(token);
  try { const team = await api.getTeam(req.params.teamKey); res.json({ team }); }
  catch { res.status(500).json({ error: 'Failed to fetch team' }); }
});

app.get('/team/:teamKey/roster', async (req: Request, res: Response) => {
  const token = getToken(req); if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const api = new YahooFantasyAPI(token);
  const date = req.query.date as string | undefined;
  const debug = req.query.debug as string | undefined;
  try {
    const roster = await api.getRosterByDate(req.params.teamKey, date, { debugPlayerKey: debug });
    const sample = Array.isArray(roster) ? roster.slice(0, 2) : [];
    res.json({ roster, sample, coverage: date ? { type: 'date', date } : { type: 'today' } });
  } catch (e: any) {
    console.error('Error in /team/:teamKey/roster:', e?.message || e);
    res.status(500).json({ error: 'Failed to fetch roster', details: e?.message || String(e) });
  }
});

app.get('/team/:teamKey/roster/stats', async (req: Request, res: Response) => {
  const token = getToken(req); if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const api = new YahooFantasyAPI(token);
  try { const rosterWithStats = await api.getRosterWithStats(req.params.teamKey); res.json({ rosterWithStats }); }
  catch { res.status(500).json({ error: 'Failed to fetch roster with stats' }); }
});

app.get('/team/:teamKey/current-matchup', async (req: Request, res: Response) => {
  const token = getToken(req); if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const api = new YahooFantasyAPI(token);
  try { const currentMatchup = await api.getCurrentMatchup(req.params.teamKey); res.json({ currentMatchup }); }
  catch { res.status(500).json({ error: 'Failed to fetch current matchup' }); }
});

app.get('/team/:teamKey/matchups', async (req: Request, res: Response) => {
  const token = getToken(req); if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const api = new YahooFantasyAPI(token);
  try { const matchups = await api.getMatchups(req.params.teamKey); res.json({ matchups }); }
  catch { res.status(500).json({ error: 'Failed to fetch matchups' }); }
});

app.get('/team/:teamKey/test-endpoints', async (req: Request, res: Response) => {
  const token = getToken(req); if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const api = new YahooFantasyAPI(token);
  try { await api.testFantasyPointsEndpoints(req.params.teamKey); res.json({ message: 'Endpoint testing complete. Check debug.log for results.' }); }
  catch { res.status(500).json({ error: 'Failed to test endpoints' }); }
});

// Simple health and callback test endpoints
app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));
app.get('/auth/yahoo/callback/test', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html').send('<!doctype html><html><body>Callback reachable.</body></html>');
});

app.listen(PORT, HOST, () => {
  console.log(`✅ Fantasy Yahoo server running on port ${PORT}`);
  console.log(`🌐 REST API base: http://localhost:${PORT}`);
  console.log(`❤️  Health: http://localhost:${PORT}/health`);
});

// Optionally also start HTTPS for OAuth callbacks if certs exist and explicitly enabled.
const enableLocalTls = process.env.FANTASY_YAHOO_ENABLE_LOCAL_TLS === 'true';
if (enableLocalTls) {
  try {
    const candidates = [
      path.resolve(__dirname, '..', '..', 'certificates'),          // repo root /certificates
      path.resolve(__dirname, '..', 'certificates'),                 // backend/certificates
      path.resolve(__dirname, '..', '..', 'frontend', 'certificates')// frontend/certificates
    ];
    console.log('HTTPS cert search paths:', candidates);
    let keyPath: string | null = null;
    let certPath: string | null = null;
    for (const dir of candidates) {
      const k = path.join(dir, 'localhost.key');
      const c = path.join(dir, 'localhost.crt');
      if (fs.existsSync(k) && fs.existsSync(c)) { keyPath = k; certPath = c; break; }
    }
    if (keyPath && certPath) {
      const httpsOptions = { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
      https.createServer(httpsOptions, app).listen(TLS_PORT, () => {
        console.log(`Backend HTTPS listening on https://localhost:${TLS_PORT} (certs: ${path.dirname(keyPath!)})`);
      });
    } else {
      console.log('HTTPS certificates not found in any known location; set YAHOO_REDIRECT_URI to http and register it in Yahoo dev, or add certs.');
    }
  } catch (e) {
    console.warn('Failed to start HTTPS server:', e);
  }
} else {
  console.log('Local HTTPS disabled; relying on reverse proxy for TLS termination.');
}
