import React from 'react';

export default function FantasyCard({ player }) {
  const isPitcher = (player.positionType || '').toUpperCase() === 'P';
  return (
    <div className="card card-compact bg-base-100 border border-base-300 h-full">
      <div className="card-body py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="badge badge-outline">{player.selectedPosition || player.position || '-'}</span>
            <div>
              <div className="font-medium leading-tight">{player.name}</div>
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

