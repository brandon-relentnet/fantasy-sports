import axios from 'axios';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import { logToFile } from './logger';
import { decodeYahooStats, getKeyStats } from './yahoo-stat-ids';
import { Player } from '@/types/player';

const parseXML = promisify(parseString);
const YAHOO_API_BASE = 'https://fantasysports.yahooapis.com/fantasy/v2';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.109 Safari/537.36';

export class YahooFantasyAPI {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async makeRequest(endpoint: string) {
    try {
      const response = await axios.get(`${YAHOO_API_BASE}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: 'application/xml',
          'User-Agent': USER_AGENT,
        },
      });
      
      // Parse XML to JSON
      const parsedData = await parseXML(response.data);
      return parsedData;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Yahoo API Error:', error);
      }
      throw error;
    }
  }

  async getUserLeagues(gameKey = 'mlb') {
    const data = await this.makeRequest(`/users;use_login=1/games;game_keys=${gameKey}/leagues`);
    
    // Extract leagues from Yahoo's XML structure
    const leagues = [];
    
    try {
      const users = data?.fantasy_content?.users?.[0]?.user;
      if (users && users.length > 0) {
        const games = users[0]?.games?.[0]?.game;
        if (games && games.length > 0) {
          const leaguesData = games[0]?.leagues?.[0]?.league;
          if (leaguesData) {
            // Handle both single league and multiple leagues
            const leagueArray = Array.isArray(leaguesData) ? leaguesData : [leaguesData];
            
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
        }
      }
    } catch (parseError) {
      console.error('Error parsing leagues data:', parseError);
    }
    
    logToFile('Parsed Leagues', leagues);
    return leagues;
  }

  async getLeague(leagueKey: string) {
    return this.makeRequest(`/league/${leagueKey}`);
  }

  async getTeam(teamKey: string) {
    const data = await this.makeRequest(`/team/${teamKey}`);
    
    logToFile('Raw Team XML Structure', data);
    
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
          managers: teamData.managers?.[0]?.manager?.map((manager: any) => ({
            manager_id: manager.manager_id?.[0],
            nickname: manager.nickname?.[0],
            guid: manager.guid?.[0],
            email: manager.email?.[0],
            image_url: manager.image_url?.[0],
            felo_score: manager.felo_score?.[0],
            felo_tier: manager.felo_tier?.[0],
          })) || [],
        };
      }
    } catch (parseError) {
      console.error('Error parsing team data:', parseError);
    }
    
    logToFile('Parsed Team', team);
    return team;
  }

  async getRoster(teamKey: string, opts?: { debugPlayerKey?: string }) {
    // Get roster with today's stats
    const endpoint = `/team/${teamKey}/roster/players/stats`;
    const data = await this.makeRequest(endpoint);
    logToFile('Raw Roster with Players Stats XML Structure', data);
    const roster = this.parseRosterFromData(data, opts);
    logToFile('Parsed Roster', roster);
    return roster;
  }

  async getRosterWithStats(teamKey: string) {
    return this.makeRequest(`/team/${teamKey}/roster/players/stats`);
  }

  async getWeeklyRoster(teamKey: string, week?: string) {
    // Deprecated: weekly coverage is not aligned with Yahoo's UI filters.
    // Use date-based coverage instead.
    return this.getRosterByDate(teamKey);
  }

  async getRosterByDate(teamKey: string, date?: string, opts?: { debugPlayerKey?: string }) {
    // Fetch roster stats for a specific calendar date or today if not provided
    const endpoint = date
      ? `/team/${teamKey}/roster;date=${date}/players/stats`
      : `/team/${teamKey}/roster/players/stats`;

    const data = await this.makeRequest(endpoint);
    logToFile('Raw Roster (date-based) XML Structure', data);

    const roster = this.parseRosterFromData(data, opts);
    logToFile('Parsed Roster (date-based)', roster);
    return roster;
  }

  private parseRosterFromData(data: any, opts?: { debugPlayerKey?: string }): Player[] {
    const roster: Player[] = [];
    try {
      const team = data?.fantasy_content?.team?.[0];
      if (!team?.roster?.[0]?.players?.[0]?.player) return roster;
      const players = team.roster[0].players[0].player;
      const playerArray = Array.isArray(players) ? players : [players];

      for (const player of playerArray) {
        const eligible = player.eligible_positions?.[0]?.position || [];
        const eligibleArray = Array.isArray(eligible) ? eligible : [eligible].filter(Boolean);
        const model: Player = {
          id: player.player_id?.[0],
          key: player.player_key?.[0],
          name: player.name?.[0]?.full?.[0],
          firstName: player.name?.[0]?.first?.[0],
          lastName: player.name?.[0]?.last?.[0],
          teamAbbr: player.editorial_team_abbr?.[0],
          teamFullName: player.editorial_team_full_name?.[0],
          uniformNumber: player.uniform_number?.[0],
          position: player.display_position?.[0] || player.primary_position?.[0],
          selectedPosition: player.selected_position?.[0]?.position?.[0],
          eligiblePositions: eligibleArray,
          imageUrl: player.image_url?.[0],
          headshot: player.headshot?.[0]?.url?.[0],
          isUndroppable: player.is_undroppable?.[0] === '1',
          positionType: player.position_type?.[0],
        };

        if (player.player_stats?.[0]?.stats?.[0]?.stat) {
          const stats = player.player_stats[0].stats[0].stat;
          const statsArray = Array.isArray(stats) ? stats : [stats];
          const decodedStats = decodeYahooStats(statsArray);
          const keyStats = getKeyStats(decodedStats);

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
            logToFile('DEBUG Player Decoded Stats', {
              player_key: model.key,
              name: model.name,
              decodedStats,
              keyStats,
            });
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
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error parsing roster data:', e);
      }
    }
    return roster;
  }

  async getPlayerStats(playerKey: string) {
    const data = await this.makeRequest(`/player/${playerKey}/stats`);
    
    logToFile('Raw Player Stats XML Structure', data);
    
    let playerStats = null;
    
    try {
      const player = data?.fantasy_content?.player?.[0];
      if (player?.player_stats?.[0]?.stats?.[0]?.stat) {
        const stats = player.player_stats[0].stats[0].stat;
        const statsArray = Array.isArray(stats) ? stats : [stats];
        
        const parsedStats: any = {
          player_key: player.player_key?.[0],
          name: player.name?.[0]?.full?.[0],
          editorial_team_abbr: player.editorial_team_abbr?.[0],
          display_position: player.display_position?.[0],
        };
        
        // Parse individual stats
        for (const stat of statsArray) {
          const statId = stat.stat_id?.[0];
          const value = stat.value?.[0];
          
          // Map stat IDs to meaningful names for baseball
          switch (statId) {
            case '7': parsedStats.runs = parseInt(value || '0'); break;
            case '12': parsedStats.home_runs = parseInt(value || '0'); break;
            case '13': parsedStats.rbis = parseInt(value || '0'); break;
            case '16': parsedStats.stolen_bases = parseInt(value || '0'); break;
            case '3': parsedStats.batting_average = parseFloat(value || '0.000'); break;
            case '50': parsedStats.innings_pitched = parseFloat(value || '0.0'); break;
            case '26': parsedStats.wins = parseInt(value || '0'); break;
            case '27': parsedStats.losses = parseInt(value || '0'); break;
            case '32': parsedStats.saves = parseInt(value || '0'); break;
            case '42': parsedStats.strikeouts = parseInt(value || '0'); break;
            case '28': parsedStats.era = parseFloat(value || '0.00'); break; // ERA (some contexts)
            case '85': parsedStats.era = parseFloat(value || '0.00'); break; // ERA (daily/weekly contexts)
            case '89': parsedStats.whip = parseFloat(value || '0.00'); break;
            default:
              // Store unknown stats with their ID
              parsedStats[`stat_${statId}`] = value;
          }
        }
        
        playerStats = parsedStats;
      }
    } catch (parseError) {
      console.error('Error parsing player stats:', parseError);
    }
    
    logToFile('Parsed Player Stats', playerStats);
    return playerStats;
  }

  async getStandings(leagueKey: string) {
    const data = await this.makeRequest(`/league/${leagueKey}/standings`);
    
    logToFile('Raw Standings XML Structure', data);
    
    // Extract standings from Yahoo's XML structure
    const standings = [];
    
    try {
      const league = data?.fantasy_content?.league?.[0];
      if (league?.standings?.[0]?.teams?.[0]?.team) {
        const teams = league.standings[0].teams[0].team;
        const teamArray = Array.isArray(teams) ? teams : [teams];
        
        logToFile('Sample Team Structure', teamArray[0]);
        
        for (const team of teamArray) {
          const teamStandings = team.team_standings?.[0];
          const outcomeTotal = teamStandings?.outcome_totals?.[0];
          
          standings.push({
            team_key: team.team_key?.[0],
            team_id: team.team_id?.[0],
            name: team.name?.[0],
            url: team.url?.[0],
            team_logo: team.team_logos?.[0]?.team_logo?.[0]?.url?.[0],
            wins: parseInt(outcomeTotal?.wins?.[0] || '0'),
            losses: parseInt(outcomeTotal?.losses?.[0] || '0'),
            ties: parseInt(outcomeTotal?.ties?.[0] || '0'),
            percentage: outcomeTotal?.percentage?.[0] || '0.000',
            games_back: teamStandings?.games_back?.[0] || '0',
            points_for: team.team_points?.[0]?.total?.[0] || '0',
            points_against: team.team_points?.[0]?.against?.[0] || '0',
            streak: teamStandings?.streak?.[0],
            playoff_seed: teamStandings?.playoff_seed?.[0],
            rank: parseInt(teamStandings?.rank?.[0] || '0'),
          });
        }
      }
    } catch (parseError) {
      console.error('Error parsing standings data:', parseError);
    }
    
    logToFile('Parsed Standings', standings);
    return standings;
  }

  async getMatchups(teamKey: string) {
    const data = await this.makeRequest(`/team/${teamKey}/matchups`);
    
    logToFile('Raw Matchups XML Structure', data);
    
    const matchups = [];
    
    try {
      const team = data?.fantasy_content?.team?.[0];
      if (team?.matchups?.[0]?.matchup) {
        const matchupData = team.matchups[0].matchup;
        const matchupArray = Array.isArray(matchupData) ? matchupData : [matchupData];
        
        for (const matchup of matchupArray) {
          const teams = matchup.teams?.[0]?.team;
          const teamsArray = Array.isArray(teams) ? teams : [teams];
          
          // Parse stat winners/categories
          const statWinners = [];
          if (matchup.stat_winners?.[0]?.stat_winner) {
            const winners = matchup.stat_winners[0].stat_winner;
            const winnersArray = Array.isArray(winners) ? winners : [winners];
            
            for (const winner of winnersArray) {
              statWinners.push({
                stat_id: winner.stat_id?.[0],
                winner_team_key: winner.winner_team_key?.[0],
                is_tied: winner.is_tied?.[0] === '1'
              });
            }
          }
          
          matchups.push({
            week: matchup.week?.[0],
            week_start: matchup.week_start?.[0],
            week_end: matchup.week_end?.[0],
            status: matchup.status?.[0],
            is_playoffs: matchup.is_playoffs?.[0] === '1',
            is_consolation: matchup.is_consolation?.[0] === '1',
            is_tied: matchup.is_tied?.[0] === '1',
            winner_team_key: matchup.winner_team_key?.[0],
            stat_winners: statWinners,
            teams: teamsArray.map(team => ({
              team_key: team.team_key?.[0],
              team_id: team.team_id?.[0],
              name: team.name?.[0],
              team_points: team.team_points?.[0]?.total?.[0],
              team_projected_points: team.team_projected_points?.[0]?.total?.[0],
            }))
          });
        }
      }
    } catch (parseError) {
      console.error('Error parsing matchups data:', parseError);
    }
    
    logToFile('Parsed Matchups', matchups);
    return matchups;
  }

  async getCurrentMatchup(teamKey: string, week?: string) {
    const endpoint = week 
      ? `/team/${teamKey}/matchups;weeks=${week}` 
      : `/team/${teamKey}/matchups;weeks=current`;
    
    const data = await this.makeRequest(endpoint);
    logToFile('Raw Current Matchup XML Structure', data);
    
    // Parse current matchup with detailed stats
    let currentMatchup = null;
    
    try {
      const team = data?.fantasy_content?.team?.[0];
      if (team?.matchups?.[0]?.matchup) {
        const matchupData = team.matchups[0].matchup;
        const matchup = Array.isArray(matchupData) ? matchupData[0] : matchupData;
        
        if (matchup) {
          const teams = matchup.teams?.[0]?.team;
          const teamsArray = Array.isArray(teams) ? teams : [teams];
          
          // Parse detailed team stats for current matchup
          const teamsWithStats = teamsArray.map(team => ({
            team_key: team.team_key?.[0],
            team_id: team.team_id?.[0],
            name: team.name?.[0],
            team_points: team.team_points?.[0]?.total?.[0],
            team_projected_points: team.team_projected_points?.[0]?.total?.[0],
            team_stats: team.team_stats?.[0]?.stats?.[0]?.stat?.map((stat: any) => ({
              stat_id: stat.stat_id?.[0],
              value: stat.value?.[0]
            })) || []
          }));
          
          currentMatchup = {
            week: matchup.week?.[0],
            week_start: matchup.week_start?.[0],
            week_end: matchup.week_end?.[0],
            status: matchup.status?.[0],
            is_playoffs: matchup.is_playoffs?.[0] === '1',
            is_consolation: matchup.is_consolation?.[0] === '1',
            is_tied: matchup.is_tied?.[0] === '1',
            winner_team_key: matchup.winner_team_key?.[0],
            teams: teamsWithStats
          };
        }
      }
    } catch (parseError) {
      console.error('Error parsing current matchup data:', parseError);
    }
    
    logToFile('Parsed Current Matchup', currentMatchup);
    return currentMatchup;
  }

  // Test different Yahoo API combinations to find fantasy points
  async testFantasyPointsEndpoints(teamKey: string) {
    const endpoints = [
      `/team/${teamKey}/stats`,
      `/team/${teamKey}/matchups;weeks=current`,
      `/league/458.l.40137/players;player_keys=${teamKey}.p.11531/stats`,
      `/team/${teamKey}/roster;out=stats`,
    ];

    for (const endpoint of endpoints) {
      try {
        logToFile(`TESTING ENDPOINT: ${endpoint}`, 'Starting test...');
        const data = await this.makeRequest(endpoint);
        logToFile(`SUCCESS ENDPOINT: ${endpoint}`, data);
      } catch (error) {
        logToFile(`FAILED ENDPOINT: ${endpoint}`, { error: error.message });
      }
    }
  }
}
