import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';

export default function FantasyCard({ player, dateBadge }) {
  const layout = useSelector((state) => state.layout?.mode || 'compact');
  const isCompact = useMemo(() => layout === 'compact', [layout]);
  const isPitcher = (player.positionType || '').toUpperCase() === 'P';

  if (isCompact) {
    // Compact mode: single-line concise summary
    return (
      <div className="card bg-base-200 border border-base-300 h-14">
        <div className="card-body py-2 px-2 flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="badge badge-outline text-[10px]">
              {player.selectedPosition || player.position || '-'}
            </span>
            <div className="font-medium truncate max-w-[130px]">{player.name}</div>
            <div className="text-[10px] opacity-60 truncate max-w-[70px]">
              {player.teamAbbr || player.teamFullName || ''}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {dateBadge && (
              <span className="badge badge-ghost badge-xs">{dateBadge}</span>
            )}
            {!isPitcher ? (
              <>
                <span>HR {player.homeRuns ?? 0}</span>
                <span>RBI {player.rbis ?? 0}</span>
                <span>AVG {typeof player.avg === 'number' ? player.avg.toFixed(3) : '0.000'}</span>
              </>
            ) : (
              <>
                <span>K {player.strikeouts ?? 0}</span>
                <span>ERA {typeof player.era === 'number' ? player.era.toFixed(2) : '-'}</span>
                <span>WHIP {typeof player.whip === 'number' ? player.whip.toFixed(2) : '-'}</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Comfort mode: richer layout
  return (
    <div className="card bg-base-200 border border-base-300 h-40">
      <div className="card-body p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="badge badge-outline">{player.selectedPosition || player.position || '-'}</span>
            <div>
              <div className="font-semibold leading-tight">{player.name}</div>
              <div className="text-[10px] opacity-60">{player.teamAbbr || player.teamFullName || ''}</div>
            </div>
          </div>
          {typeof player.totalPoints === 'number' && (
            <div className="text-right">
              <div className="text-xs opacity-60">Pts</div>
              <div className="font-semibold">{player.totalPoints.toFixed(1)}</div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
          {dateBadge && (
            <div className="col-span-4">
              <span className="badge badge-ghost badge-xs">{dateBadge}</span>
            </div>
          )}
          {!isPitcher ? (
            <>
              <Stat label="R" val={player.runs ?? 0} />
              <Stat label="H" val={player.hits ?? 0} />
              <Stat label="RBI" val={player.rbis ?? 0} />
              <Stat label="HR" val={player.homeRuns ?? 0} />
              <Stat label="SB" val={player.sb ?? 0} />
              <Stat label="AVG" val={typeof player.avg === 'number' ? player.avg.toFixed(3) : '0.000'} />
              <Stat label="OPS" val={typeof player.ops === 'number' ? player.ops.toFixed(3) : '-'} />
            </>
          ) : (
            <>
              <Stat label="IP" val={player.ip ?? 0} />
              <Stat label="W" val={player.wins ?? 0} />
              <Stat label="L" val={player.losses ?? 0} />
              <Stat label="SV" val={player.saves ?? 0} />
              <Stat label="K" val={player.strikeouts ?? 0} />
              <Stat label="ERA" val={typeof player.era === 'number' ? player.era.toFixed(2) : '-'} />
              <Stat label="WHIP" val={typeof player.whip === 'number' ? player.whip.toFixed(2) : '-'} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, val }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-[10px] opacity-60">{label}</div>
      <div className="font-semibold">{val}</div>
    </div>
  );
}
