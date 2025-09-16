"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YAHOO_BASEBALL_STATS = void 0;
exports.decodeYahooStats = decodeYahooStats;
exports.getKeyStats = getKeyStats;
exports.YAHOO_BASEBALL_STATS = {
    "0": { name: "Games Played", category: "batting", description: "GP" },
    "1": { name: "Games Started", category: "batting", description: "GS" },
    "2": { name: "At Bats", category: "batting", description: "AB" },
    "3": { name: "Batting Average", category: "batting", description: "AVG" },
    "4": { name: "On Base Percentage", category: "batting", description: "OBP" },
    "5": { name: "Slugging Percentage", category: "batting", description: "SLG" },
    "6": { name: "Plate Appearances", category: "batting", description: "PA" },
    "7": { name: "Runs", category: "batting", description: "R" },
    "8": { name: "Hits", category: "batting", description: "H" },
    "9": { name: "Singles", category: "batting", description: "1B" },
    "10": { name: "Doubles", category: "batting", description: "2B" },
    "11": { name: "Triples", category: "batting", description: "3B" },
    "12": { name: "Home Runs", category: "batting", description: "HR" },
    "13": { name: "RBIs", category: "batting", description: "RBI" },
    "16": { name: "Stolen Bases", category: "batting", description: "SB" },
    "21": { name: "Strikeouts", category: "batting", description: "K" },
    "23": { name: "Total Bases", category: "batting", description: "TB" },
    "24": { name: "Earned Runs", category: "pitching", description: "ER" },
    "26": { name: "Wins", category: "pitching", description: "W" },
    "27": { name: "Losses", category: "pitching", description: "L" },
    "28": { name: "ERA", category: "pitching", description: "ERA" },
    "32": { name: "Saves", category: "pitching", description: "SV" },
    "42": { name: "Strikeouts", category: "pitching", description: "K" },
    "50": { name: "Innings Pitched", category: "pitching", description: "IP" },
    "55": { name: "OPS", category: "batting", description: "OPS" },
    "83": { name: "Earned Runs", category: "pitching", description: "ER" },
    "85": { name: "ERA", category: "pitching", description: "ERA" },
    "89": { name: "WHIP", category: "pitching", description: "WHIP" },
};
function decodeYahooStats(stats) {
    const decoded = {};
    for (const stat of stats) {
        const statId = stat.stat_id?.[0];
        const value = stat.value?.[0];
        const statInfo = exports.YAHOO_BASEBALL_STATS[statId];
        if (typeof value === 'string' && value.includes('/')) {
            const parts = value.split('/');
            if (parts.length === 2) {
                const [hStr, abStr] = parts;
                const h = hStr === '-' ? 0 : parseInt(hStr, 10);
                const ab = abStr === '-' ? 0 : parseInt(abStr, 10);
                if (!Number.isNaN(h) && !Number.isNaN(ab)) {
                    decoded['H'] = { value: h, name: 'Hits', category: 'batting', raw_stat_id: statId };
                    decoded['AB'] = { value: ab, name: 'At Bats', category: 'batting', raw_stat_id: statId };
                    continue;
                }
            }
        }
        if (statInfo) {
            let parsedValue = value;
            if (statInfo.category === 'batting' && ['AVG', 'OBP', 'SLG', 'OPS', 'FPCT'].includes(statInfo.description || '')) {
                parsedValue = parseFloat(value || '0');
            }
            else if (!isNaN(value) && value !== '-') {
                parsedValue = parseInt(value) || parseFloat(value);
            }
            else if (value === '-') {
                parsedValue = 0;
            }
            decoded[statInfo.description || statInfo.name] = { value: parsedValue, name: statInfo.name, category: statInfo.category, raw_stat_id: statId };
        }
        else {
            decoded[`unknown_${statId}`] = { value, name: `Unknown Stat ${statId}`, category: 'unknown', raw_stat_id: statId };
        }
    }
    return decoded;
}
function getKeyStats(decodedStats) {
    let hits = decodedStats.H?.value ?? undefined;
    const atBats = decodedStats.AB?.value || 0;
    const avg = decodedStats.AVG?.value;
    const calculatedAvg = atBats > 0 && typeof hits === 'number' ? hits / atBats : (typeof avg === 'number' ? avg : 0);
    if ((hits === undefined || hits === null) && atBats > 0 && typeof avg === 'number') {
        hits = Math.round(avg * atBats);
    }
    const obp = decodedStats.OBP?.value;
    const slg = decodedStats.SLG?.value;
    const ops = (typeof decodedStats.OPS?.value === 'number') ? decodedStats.OPS.value : (typeof obp === 'number' && typeof slg === 'number' ? obp + slg : undefined);
    const strikeouts = decodedStats.K?.value || 0;
    return {
        hits: hits || 0,
        runs: decodedStats.R?.value || 0,
        rbis: decodedStats.RBI?.value || 0,
        home_runs: decodedStats.HR?.value || 0,
        batting_average: decodedStats.AVG?.value || calculatedAvg,
        ops,
        stolen_bases: decodedStats.SB?.value || 0,
        innings_pitched: decodedStats.IP?.value || 0,
        hits_allowed: decodedStats.HA?.value || 0,
        earned_runs: decodedStats.ER?.value || 0,
        wins: decodedStats.W?.value || 0,
        losses: decodedStats.L?.value || 0,
        era: decodedStats.ERA?.value || 0,
        saves: decodedStats.SV?.value || 0,
        strikeouts,
        whip: decodedStats.WHIP?.value || 0,
        allStats: decodedStats,
    };
}
