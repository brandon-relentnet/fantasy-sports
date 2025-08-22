// Yahoo Fantasy Baseball Stat ID Mappings
// Based on observed data and common baseball statistics

export const YAHOO_BASEBALL_STATS: { [key: string]: { name: string; category: string; description?: string } } = {
  // Batting Stats
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
  "14": { name: "Sacrifice Hits", category: "batting", description: "SH" },
  "15": { name: "Sacrifice Flies", category: "batting", description: "SF" },
  "16": { name: "Stolen Bases", category: "batting", description: "SB" },
  "17": { name: "Caught Stealing", category: "batting", description: "CS" },
  "18": { name: "Walks", category: "batting", description: "BB" },
  "19": { name: "Intentional Walks", category: "batting", description: "IBB" },
  "20": { name: "Hit By Pitch", category: "batting", description: "HBP" },
  "21": { name: "Strikeouts", category: "batting", description: "K" },
  "22": { name: "Ground Into Double Play", category: "batting", description: "GIDP" },
  "23": { name: "Total Bases", category: "batting", description: "TB" },

  // Pitching Stats
  "26": { name: "Wins", category: "pitching", description: "W" },
  "27": { name: "Losses", category: "pitching", description: "L" },
  "28": { name: "ERA", category: "pitching", description: "ERA" },
  "29": { name: "Games Pitched", category: "pitching", description: "G" },
  "30": { name: "Games Started", category: "pitching", description: "GS" },
  "31": { name: "Complete Games", category: "pitching", description: "CG" },
  "32": { name: "Saves", category: "pitching", description: "SV" },
  "33": { name: "Save Opportunities", category: "pitching", description: "SVO" },
  "34": { name: "Holds", category: "pitching", description: "HLD" },
  "35": { name: "Blown Saves", category: "pitching", description: "BS" },
  "42": { name: "Strikeouts", category: "pitching", description: "K" },
  "50": { name: "Innings Pitched", category: "pitching", description: "IP" },
  "85": { name: "ERA", category: "pitching", description: "ERA" },
  "89": { name: "WHIP", category: "pitching", description: "WHIP" },

  // Fielding Stats
  "51": { name: "Total Chances", category: "fielding", description: "TC" },
  "52": { name: "Putouts", category: "fielding", description: "PO" },
  "53": { name: "Assists", category: "fielding", description: "A" },
  "54": { name: "Fielding Percentage", category: "fielding", description: "FPCT" },
  "55": { name: "OPS", category: "batting", description: "OPS" },

  // Advanced Stats
  "58": { name: "Runs Created", category: "advanced", description: "RC" },
  "59": { name: "Runs Created Per Game", category: "advanced", description: "RC/G" },
  "60": { name: "On Base Percentage", category: "batting", description: "OBP" },
  "61": { name: "Extra Base Hits", category: "batting", description: "XBH" },
  "62": { name: "Times On Base", category: "batting", description: "TOB" },
  "63": { name: "Runs + RBIs", category: "batting", description: "R+RBI" },
  "64": { name: "Cycle", category: "batting", description: "CYC" },
  "65": { name: "Net Steals", category: "batting", description: "NSB" },
  "66": { name: "Grand Slams", category: "batting", description: "GS" },

  // Catcher Stats
  "86": { name: "Passed Balls", category: "fielding", description: "PB" },
  "87": { name: "Wild Pitches", category: "fielding", description: "WP" },
  "88": { name: "Stolen Bases Allowed", category: "fielding", description: "SBA" },
};

export function decodeYahooStats(stats: any[]): { [key: string]: any } {
  const decoded: { [key: string]: any } = {};
  
  for (const stat of stats) {
    const statId = stat.stat_id?.[0];
    const value = stat.value?.[0];
    const statInfo = YAHOO_BASEBALL_STATS[statId];
    
    if (statInfo) {
      // Convert to appropriate type
      let parsedValue: any = value;
      if (statInfo.category === 'batting' && (statInfo.description === 'AVG' || statInfo.description === 'OBP' || statInfo.description === 'SLG' || statInfo.description === 'OPS' || statInfo.description === 'FPCT')) {
        parsedValue = parseFloat(value || '0');
      } else if (!isNaN(value) && value !== '-') {
        parsedValue = parseInt(value) || parseFloat(value);
      }
      
      decoded[statInfo.description || statInfo.name] = {
        value: parsedValue,
        name: statInfo.name,
        category: statInfo.category,
        raw_stat_id: statId
      };
    } else {
      // Store unknown stats for debugging
      decoded[`unknown_${statId}`] = {
        value: value,
        name: `Unknown Stat ${statId}`,
        category: 'unknown',
        raw_stat_id: statId
      };
    }
  }
  
  return decoded;
}

export function getKeyStats(decodedStats: any): any {
  // Extract the most important fantasy stats
  return {
    // Batting
    batting_average: decodedStats.AVG?.value,
    home_runs: decodedStats.HR?.value,
    rbis: decodedStats.RBI?.value,
    runs: decodedStats.R?.value,
    stolen_bases: decodedStats.SB?.value,
    hits: decodedStats.H?.value,
    walks: decodedStats.BB?.value,
    strikeouts_batter: decodedStats.K?.value,
    obp: decodedStats.OBP?.value,
    slg: decodedStats.SLG?.value,
    ops: decodedStats.OPS?.value,
    
    // Pitching
    wins: decodedStats.W?.value,
    losses: decodedStats.L?.value,
    era: decodedStats.ERA?.value,
    saves: decodedStats.SV?.value,
    holds: decodedStats.HLD?.value,
    strikeouts_pitcher: decodedStats.K?.value,
    innings_pitched: decodedStats.IP?.value,
    whip: decodedStats.WHIP?.value,
  };
}