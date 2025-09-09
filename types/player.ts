export type Player = {
  id: string; // player_id
  key: string; // player_key
  name: string;
  firstName?: string;
  lastName?: string;
  teamAbbr?: string;
  teamFullName?: string;
  position?: string; // display_position or primary
  selectedPosition?: string;
  eligiblePositions: string[];
  uniformNumber?: string;
  imageUrl?: string;
  headshot?: string;
  isUndroppable?: boolean;
  positionType?: 'B' | 'P' | string;
  // stats (normalized)
  hits?: number;
  runs?: number;
  rbis?: number;
  homeRuns?: number;
  avg?: number;
  ops?: number;
  sb?: number;
  ip?: number;
  wins?: number;
  losses?: number;
  saves?: number;
  strikeouts?: number;
  era?: number;
  whip?: number;
  totalPoints?: number;
  weekPoints?: number;
  week?: string;
  // full decoded map if needed
  allStats?: Record<string, { value: number | string; name: string; category: string; raw_stat_id: string }>;
};
