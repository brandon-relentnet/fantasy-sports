const DEFENSE_POSITIONS = new Set([
  "DEF",
  "D",
  "DL",
  "DE",
  "DT",
  "DB",
  "CB",
  "S",
  "LB",
  "MLB",
  "OLB",
  "ILB",
  "FS",
  "SS",
  "DST",
]);

const SPECIAL_TEAMS_POSITIONS = new Set(["K", "P", "PK"]);
const BENCH_CODES = new Set(["BN", "BE", "BENCH", "RES", "RESERVE"]);
const INJURED_CODES = new Set(["IL", "DL", "IR", "IR+", "NA"]);

export const SUPPORTED_SPORTS_ORDER = ["mlb", "nfl", "nba"];
export const DEFAULT_SPORT = "mlb";

const SPORT_ALIAS_MAP = {
  mlb: "mlb",
  baseball: "mlb",
  nfl: "nfl",
  football: "nfl",
  nba: "nba",
  basketball: "nba",
};

export const FANTASY_STORAGE_KEYS = {
  sport: "yahoo_selected_sport",
  league: "yahoo_selected_league",
  team: "yahoo_selected_team",
  typeFilter: "yahoo_type_filter",
  sortKey: "yahoo_sort_key",
  sortDir: "yahoo_sort_dir",
  accessToken: "yahoo_access_token",
  refreshToken: "yahoo_refresh_token",
};

const defaultSortOptions = [
  { value: "", label: "None" },
  { value: "totalPoints", label: "Fantasy Points" },
];

export const FANTASY_SPORTS = {
  mlb: {
    id: "mlb",
    label: "Baseball",
    shortLabel: "MLB",
    emoji: "⚾",
    sportParam: "baseball",
    typeFilters: [
      { value: "all", label: "All" },
      { value: "batters", label: "Batters" },
      { value: "pitchers", label: "Pitchers" },
    ],
    sortOptions: [
      { value: "", label: "None" },
      { value: "HR", label: "Home Runs" },
      { value: "RBI", label: "RBIs" },
      { value: "R", label: "Runs" },
      { value: "H", label: "Hits" },
      { value: "SB", label: "Stolen Bases" },
      { value: "AVG", label: "AVG" },
      { value: "OPS", label: "OPS" },
      { value: "K", label: "Strikeouts (P)" },
      { value: "W", label: "Wins" },
      { value: "L", label: "Losses" },
      { value: "SV", label: "Saves" },
      { value: "IP", label: "Innings" },
      { value: "ERA", label: "ERA" },
      { value: "WHIP", label: "WHIP" },
    ],
    defaultSortByFilter: {
      batters: "HR",
      pitchers: "K",
    },
    getSortValue(player, key) {
      switch (key) {
        case "HR":
          return player.homeRuns ?? 0;
        case "RBI":
          return player.rbis ?? 0;
        case "R":
          return player.runs ?? 0;
        case "H":
          return player.hits ?? 0;
        case "SB":
          return player.sb ?? 0;
        case "AVG":
          return typeof player.avg === "number" ? player.avg : 0;
        case "OPS":
          return typeof player.ops === "number" ? player.ops : 0;
        case "K":
          return player.strikeouts ?? 0;
        case "W":
          return player.wins ?? 0;
        case "L":
          return player.losses ?? 0;
        case "SV":
          return player.saves ?? 0;
        case "IP":
          return player.ip ?? 0;
        case "ERA":
          return typeof player.era === "number"
            ? player.era
            : Number.POSITIVE_INFINITY;
        case "WHIP":
          return typeof player.whip === "number"
            ? player.whip
            : Number.POSITIVE_INFINITY;
        case "totalPoints":
          return (
            player.totalPoints ??
            player.playerPoints?.total ??
            player.weekPoints ??
            0
          );
        default:
          return 0;
      }
    },
    filterPredicate(player, filterKey) {
      if (filterKey === "batters") {
        return (player.positionType || "").toUpperCase() !== "P";
      }
      if (filterKey === "pitchers") {
        return (player.positionType || "").toUpperCase() === "P";
      }
      return true;
    },
  },
  nfl: {
    id: "nfl",
    label: "Football",
    shortLabel: "NFL",
    emoji: "🏈",
    sportParam: "football",
    typeFilters: [{ value: "all", label: "All Players" }],
    sortOptions: defaultSortOptions,
    defaultSort: "totalPoints",
    getSortValue(player, key) {
      if (key === "totalPoints") {
        return (
          player.totalPoints ??
          player.playerPoints?.total ??
          player.weekPoints ??
          0
        );
      }
      return 0;
    },
    filterPredicate() {
      return true;
    },
  },
  nba: {
    id: "nba",
    label: "Basketball",
    shortLabel: "NBA",
    emoji: "🏀",
    sportParam: "basketball",
    typeFilters: [{ value: "all", label: "All Players" }],
    sortOptions: defaultSortOptions,
    defaultSort: "totalPoints",
    getSortValue(player, key) {
      if (key === "totalPoints") {
        return (
          player.totalPoints ??
          player.playerPoints?.total ??
          player.weekPoints ??
          0
        );
      }
      return 0;
    },
    filterPredicate() {
      return true;
    },
  },
};

export function resolveSportKey(value, fallback = DEFAULT_SPORT) {
  if (!value) return fallback;
  const normalized = String(value).toLowerCase();
  return SPORT_ALIAS_MAP[normalized] || fallback;
}

export function getSportParam(sportKey) {
  const key = resolveSportKey(sportKey);
  return FANTASY_SPORTS[key]?.sportParam;
}

export function isBenchSlot(code) {
  if (!code) return false;
  return BENCH_CODES.has(String(code).toUpperCase());
}

export function isInjuredSlot(code) {
  if (!code) return false;
  return INJURED_CODES.has(String(code).toUpperCase());
}

export function isDefensePosition(code) {
  if (!code) return false;
  return DEFENSE_POSITIONS.has(String(code).toUpperCase());
}

export function isSpecialTeamsPosition(code) {
  if (!code) return false;
  return SPECIAL_TEAMS_POSITIONS.has(String(code).toUpperCase());
}

export const getScopedStorageKey = (base, sport) => {
  const sportKey = resolveSportKey(sport);
  return `${base}_${sportKey}`;
};

export function readScopedPreference(base, sport, fallback = "") {
  if (typeof window === "undefined") return fallback;
  try {
    const scopedKey = getScopedStorageKey(base, sport);
    const scoped = window.localStorage.getItem(scopedKey);
    if (scoped !== null && scoped !== undefined) return scoped;
    const legacy = window.localStorage.getItem(base);
    return legacy ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeScopedPreference(base, sport, value) {
  if (typeof window === "undefined") return;
  try {
    const scopedKey = getScopedStorageKey(base, sport);
    if (value === undefined || value === null) {
      window.localStorage.removeItem(scopedKey);
      window.localStorage.removeItem(base);
      return;
    }
    window.localStorage.setItem(scopedKey, value);
    window.localStorage.setItem(base, value);
  } catch {
    /* noop */
  }
}

export function removeScopedPreference(base, sport) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(getScopedStorageKey(base, sport));
  } catch {
    /* noop */
  }
}
