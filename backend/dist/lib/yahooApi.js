"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YahooFantasyAPI = void 0;
const axios_1 = __importDefault(require("axios"));
const xml2js_1 = require("xml2js");
const util_1 = require("util");
const logger_1 = require("./logger");
const yahooStatIds_1 = require("./yahooStatIds");
const parseXML = (0, util_1.promisify)(xml2js_1.parseString);
const YAHOO_API_BASE = 'https://fantasysports.yahooapis.com/fantasy/v2';
const USER_AGENT = 'Mozilla/5.0';
class YahooFantasyAPI {
    constructor(accessToken) {
        this.accessToken = accessToken;
    }
    async makeRequest(endpoint) {
        const response = await axios_1.default.get(`${YAHOO_API_BASE}${endpoint}`, {
            headers: { Authorization: `Bearer ${this.accessToken}`, Accept: 'application/xml', 'User-Agent': USER_AGENT },
        });
        return parseXML(response.data);
    }
    async getUserLeagues(gameKey = 'mlb') {
        const data = await this.makeRequest(`/users;use_login=1/games;game_keys=${gameKey}/leagues`);
        const leagues = [];
        try {
            const users = data?.fantasy_content?.users?.[0]?.user;
            const games = users?.[0]?.games?.[0]?.game;
            const leaguesData = games?.[0]?.leagues?.[0]?.league;
            const leagueArray = Array.isArray(leaguesData) ? leaguesData : leaguesData ? [leaguesData] : [];
            for (const league of leagueArray) {
                leagues.push({
                    league_key: league.league_key?.[0],
                    league_id: league.league_id?.[0],
                    name: league.name?.[0],
                    url: league.url?.[0],
                    logo_url: league.logo_url?.[0],
                    draft_status: league.draft_status?.[0],
                    num_teams: parseInt(league.num_teams?.[0] || '0'),
                    scoring_type: league.scoring_type?.[0],
                    league_type: league.league_type?.[0],
                    current_week: parseInt(league.current_week?.[0] || '0'),
                    start_week: parseInt(league.start_week?.[0] || '0'),
                    end_week: parseInt(league.end_week?.[0] || '0'),
                    season: parseInt(league.season?.[0] || '0'),
                    game_code: league.game_code?.[0],
                });
            }
        }
        catch (e) {
            (0, logger_1.logToFile)('Error parsing leagues', String(e));
        }
        (0, logger_1.logToFile)('Parsed Leagues', leagues);
        return leagues;
    }
    async getLeague(leagueKey) { return this.makeRequest(`/league/${leagueKey}`); }
    async getTeam(teamKey) {
        const data = await this.makeRequest(`/team/${teamKey}`);
        (0, logger_1.logToFile)('Raw Team XML Structure', data);
        let team = null;
        try {
            const teamData = data?.fantasy_content?.team?.[0];
            if (teamData) {
                team = {
                    team_key: teamData.team_key?.[0],
                    team_id: teamData.team_id?.[0],
                    name: teamData.name?.[0],
                    url: teamData.url?.[0],
                    team_logos: teamData.team_logos?.[0]?.team_logo?.[0]?.url?.[0],
                    waiver_priority: parseInt(teamData.waiver_priority?.[0] || '0'),
                    number_of_moves: parseInt(teamData.number_of_moves?.[0] || '0'),
                    number_of_trades: parseInt(teamData.number_of_trades?.[0] || '0'),
                    roster_adds: teamData.roster_adds?.[0],
                    clinched_playoffs: teamData.clinched_playoffs?.[0] === '1',
                    league_scoring_type: teamData.league_scoring_type?.[0],
                    has_draft_grade: teamData.has_draft_grade?.[0] === '1',
                    managers: teamData.managers?.[0]?.manager?.map((m) => ({
                        manager_id: m.manager_id?.[0], nickname: m.nickname?.[0], guid: m.guid?.[0], email: m.email?.[0], image_url: m.image_url?.[0], felo_score: m.felo_score?.[0], felo_tier: m.felo_tier?.[0],
                    })) || [],
                };
            }
        }
        catch (e) {
            (0, logger_1.logToFile)('Error parsing team', String(e));
        }
        (0, logger_1.logToFile)('Parsed Team', team);
        return team;
    }
    async getRoster(teamKey, opts) { return this.getRosterByDate(teamKey, undefined, opts); }
    async getRosterWithStats(teamKey) { return this.makeRequest(`/team/${teamKey}/roster/players/stats`); }
    async getRosterByDate(teamKey, date, opts) {
        const endpoint = date ? `/team/${teamKey}/roster;date=${date}/players/stats` : `/team/${teamKey}/roster/players/stats`;
        const data = await this.makeRequest(endpoint);
        (0, logger_1.logToFile)('Raw Roster (date-based) XML Structure', data);
        const roster = this.parseRosterFromData(data, opts);
        (0, logger_1.logToFile)('Parsed Roster (date-based)', roster);
        return roster;
    }
    parseRosterFromData(data, opts) {
        const roster = [];
        try {
            const team = data?.fantasy_content?.team?.[0];
            const players = team?.roster?.[0]?.players?.[0]?.player;
            const playerArray = Array.isArray(players) ? players : players ? [players] : [];
            for (const player of playerArray) {
                const eligible = player.eligible_positions?.[0]?.position || [];
                const eligibleArray = Array.isArray(eligible) ? eligible : [eligible].filter(Boolean);
                const model = {
                    id: player.player_id?.[0], key: player.player_key?.[0], name: player.name?.[0]?.full?.[0],
                    firstName: player.name?.[0]?.first?.[0], lastName: player.name?.[0]?.last?.[0],
                    teamAbbr: player.editorial_team_abbr?.[0], teamFullName: player.editorial_team_full_name?.[0],
                    uniformNumber: player.uniform_number?.[0], position: player.display_position?.[0] || player.primary_position?.[0],
                    selectedPosition: player.selected_position?.[0]?.position?.[0], eligiblePositions: eligibleArray,
                    imageUrl: player.image_url?.[0], headshot: player.headshot?.[0]?.url?.[0], isUndroppable: player.is_undroppable?.[0] === '1', positionType: player.position_type?.[0],
                };
                if (player.player_stats?.[0]?.stats?.[0]?.stat) {
                    const statsArray = Array.isArray(player.player_stats[0].stats[0].stat) ? player.player_stats[0].stats[0].stat : [player.player_stats[0].stats[0].stat];
                    const decodedStats = (0, yahooStatIds_1.decodeYahooStats)(statsArray);
                    const keyStats = (0, yahooStatIds_1.getKeyStats)(decodedStats);
                    model.hits = Math.round(keyStats.hits || 0);
                    model.runs = Math.round(keyStats.runs || 0);
                    model.rbis = Math.round(keyStats.rbis || 0);
                    model.homeRuns = Math.round(keyStats.home_runs || 0);
                    model.avg = keyStats.batting_average;
                    model.ops = typeof keyStats.ops === 'number' ? keyStats.ops : undefined;
                    model.sb = Math.round(keyStats.stolen_bases || 0);
                    model.ip = keyStats.innings_pitched;
                    model.wins = Math.round(keyStats.wins || 0);
                    model.losses = Math.round(keyStats.losses || 0);
                    model.saves = Math.round(keyStats.saves || 0);
                    model.strikeouts = Math.round((keyStats.strikeouts) || 0);
                    model.era = keyStats.era;
                    model.whip = keyStats.whip;
                    model.allStats = decodedStats;
                    if (opts?.debugPlayerKey && model.key === opts.debugPlayerKey) {
                        (0, logger_1.logToFile)('DEBUG Player Decoded Stats', { player_key: model.key, name: model.name, decodedStats, keyStats });
                    }
                }
                if (player.player_points?.[0]) {
                    model.totalPoints = parseFloat(player.player_points[0].total?.[0] || '0');
                    const coverageType = player.player_points[0].coverage_type?.[0];
                    if (coverageType === 'week' || coverageType === 'date') {
                        model.weekPoints = parseFloat(player.player_points[0].total?.[0] || '0');
                        model.week = player.player_points[0].coverage_value?.[0];
                    }
                }
                roster.push(model);
            }
        }
        catch (e) {
            (0, logger_1.logToFile)('Error parsing roster data', String(e));
        }
        return roster;
    }
    async getPlayerStats(playerKey) {
        const data = await this.makeRequest(`/player/${playerKey}/stats`);
        (0, logger_1.logToFile)('Raw Player Stats XML Structure', data);
        let playerStats = null;
        try {
            const player = data?.fantasy_content?.player?.[0];
            if (player?.player_stats?.[0]?.stats?.[0]?.stat) {
                const stats = player.player_stats[0].stats[0].stat;
                const statsArray = Array.isArray(stats) ? stats : [stats];
                const parsed = {
                    player_key: player.player_key?.[0], name: player.name?.[0]?.full?.[0], editorial_team_abbr: player.editorial_team_abbr?.[0], display_position: player.display_position?.[0],
                };
                for (const stat of statsArray) {
                    const id = stat.stat_id?.[0];
                    const val = stat.value?.[0];
                    parsed[`stat_${id}`] = val;
                }
                playerStats = parsed;
            }
        }
        catch (e) {
            (0, logger_1.logToFile)('Error parsing player stats', String(e));
        }
        (0, logger_1.logToFile)('Parsed Player Stats', playerStats);
        return playerStats;
    }
    async getStandings(leagueKey) {
        const data = await this.makeRequest(`/league/${leagueKey}/standings`);
        const standings = [];
        try {
            const league = data?.fantasy_content?.league?.[0];
            const teams = league?.standings?.[0]?.teams?.[0]?.team;
            const teamArray = Array.isArray(teams) ? teams : teams ? [teams] : [];
            for (const team of teamArray) {
                const teamStandings = team.team_standings?.[0];
                const outcomeTotal = teamStandings?.outcome_totals?.[0];
                standings.push({
                    team_key: team.team_key?.[0], team_id: team.team_id?.[0], name: team.name?.[0], url: team.url?.[0],
                    team_logo: team.team_logos?.[0]?.team_logo?.[0]?.url?.[0], wins: parseInt(outcomeTotal?.wins?.[0] || '0'), losses: parseInt(outcomeTotal?.losses?.[0] || '0'), ties: parseInt(outcomeTotal?.ties?.[0] || '0'), percentage: outcomeTotal?.percentage?.[0] || '0.000', games_back: teamStandings?.games_back?.[0] || '0', points_for: team.team_points?.[0]?.total?.[0] || '0', points_against: team.team_points?.[0]?.against?.[0] || '0', streak: teamStandings?.streak?.[0], playoff_seed: teamStandings?.playoff_seed?.[0], rank: parseInt(teamStandings?.rank?.[0] || '0'),
                });
            }
        }
        catch (e) {
            (0, logger_1.logToFile)('Error parsing standings data', String(e));
        }
        (0, logger_1.logToFile)('Parsed Standings', standings);
        return standings;
    }
    async getMatchups(teamKey) {
        const data = await this.makeRequest(`/team/${teamKey}/matchups`);
        const matchups = [];
        try {
            const team = data?.fantasy_content?.team?.[0];
            const matchupData = team?.matchups?.[0]?.matchup;
            const matchupArray = Array.isArray(matchupData) ? matchupData : matchupData ? [matchupData] : [];
            for (const matchup of matchupArray) {
                const teams = matchup.teams?.[0]?.team;
                const teamsArray = Array.isArray(teams) ? teams : teams ? [teams] : [];
                const statWinners = [];
                if (matchup.stat_winners?.[0]?.stat_winner) {
                    const winners = matchup.stat_winners[0].stat_winner;
                    const winnersArray = Array.isArray(winners) ? winners : [winners];
                    for (const winner of winnersArray) {
                        statWinners.push({ stat_id: winner.stat_id?.[0], winner_team_key: winner.winner_team_key?.[0], is_tied: winner.is_tied?.[0] === '1' });
                    }
                }
                matchups.push({
                    week: matchup.week?.[0], week_start: matchup.week_start?.[0], week_end: matchup.week_end?.[0], status: matchup.status?.[0], is_playoffs: matchup.is_playoffs?.[0] === '1', is_consolation: matchup.is_consolation?.[0] === '1', is_tied: matchup.is_tied?.[0] === '1', winner_team_key: matchup.winner_team_key?.[0], stat_winners: statWinners,
                    teams: teamsArray.map((t) => ({ team_key: t.team_key?.[0], team_id: t.team_id?.[0], name: t.name?.[0], team_points: t.team_points?.[0]?.total?.[0], team_projected_points: t.team_projected_points?.[0]?.total?.[0] }))
                });
            }
        }
        catch (e) {
            (0, logger_1.logToFile)('Error parsing matchups data', String(e));
        }
        (0, logger_1.logToFile)('Parsed Matchups', matchups);
        return matchups;
    }
    async getCurrentMatchup(teamKey, week) {
        const endpoint = week ? `/team/${teamKey}/matchups;weeks=${week}` : `/team/${teamKey}/matchups;weeks=current`;
        const data = await this.makeRequest(endpoint);
        let currentMatchup = null;
        try {
            const team = data?.fantasy_content?.team?.[0];
            const matchupData = team?.matchups?.[0]?.matchup;
            const matchup = Array.isArray(matchupData) ? matchupData[0] : matchupData;
            if (matchup) {
                const teams = matchup.teams?.[0]?.team;
                const teamsArray = Array.isArray(teams) ? teams : teams ? [teams] : [];
                const teamsWithStats = teamsArray.map((t) => ({
                    team_key: t.team_key?.[0], team_id: t.team_id?.[0], name: t.name?.[0], team_points: t.team_points?.[0]?.total?.[0], team_projected_points: t.team_projected_points?.[0]?.total?.[0],
                    team_stats: t.team_stats?.[0]?.stats?.[0]?.stat?.map((s) => ({ stat_id: s.stat_id?.[0], value: s.value?.[0] })) || []
                }));
                currentMatchup = { week: matchup.week?.[0], week_start: matchup.week_start?.[0], week_end: matchup.week_end?.[0], status: matchup.status?.[0], is_playoffs: matchup.is_playoffs?.[0] === '1', is_consolation: matchup.is_consolation?.[0] === '1', is_tied: matchup.is_tied?.[0] === '1', winner_team_key: matchup.winner_team_key?.[0], teams: teamsWithStats };
            }
        }
        catch (e) {
            (0, logger_1.logToFile)('Error parsing current matchup data', String(e));
        }
        (0, logger_1.logToFile)('Parsed Current Matchup', currentMatchup);
        return currentMatchup;
    }
    async testFantasyPointsEndpoints(teamKey) {
        const endpoints = [`/team/${teamKey}/stats`, `/team/${teamKey}/matchups;weeks=current`, `/team/${teamKey}/roster;out=stats`];
        for (const endpoint of endpoints) {
            try {
                (0, logger_1.logToFile)(`TESTING ENDPOINT: ${endpoint}`, 'Starting test...');
                const data = await this.makeRequest(endpoint);
                (0, logger_1.logToFile)(`SUCCESS ENDPOINT: ${endpoint}`, data);
            }
            catch (error) {
                (0, logger_1.logToFile)(`FAILED ENDPOINT: ${endpoint}`, { error: error.message });
            }
        }
    }
}
exports.YahooFantasyAPI = YahooFantasyAPI;
