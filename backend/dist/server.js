"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const yahooApi_1 = require("./lib/yahooApi");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
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
    catch {
        res.status(500).json({ error: 'Failed to fetch leagues' });
    }
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
    catch {
        res.status(500).json({ error: 'Failed to fetch standings' });
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
    catch {
        res.status(500).json({ error: 'Failed to fetch roster' });
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
