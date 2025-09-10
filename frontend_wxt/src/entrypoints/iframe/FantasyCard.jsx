import React, { useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { LockClosedIcon, LockOpenIcon } from "@heroicons/react/24/solid";
import { addPinnedItem, removePinnedItem, selectIsItemPinned } from "../store/pinnedSlice.js";

export default function FantasyCard({ player, dateBadge }) {
  const layout = useSelector((state) => state.layout?.mode || 'compact');
  const dispatch = useDispatch();
  const isPinned = useSelector((state) => selectIsItemPinned(state, 'fantasy', player.key));
  const avatarSrc = useMemo(() => player.headshot || player.imageUrl || '', [player.headshot, player.imageUrl]);
  const PinButton = ({ size = "w-4 h-4" }) => (
    <button
      onClick={(e) => { e.stopPropagation(); if (isPinned) { dispatch(removePinnedItem({ type: 'fantasy', id: player.key })); } else { dispatch(addPinnedItem({ type: 'fantasy', data: { ...player, id: player.key } })); } }}
      className={`${size} text-base-content/60 hover:text-base-content transition-colors p-1 rounded hover:bg-base-300`}
      title={isPinned ? "Unpin" : "Pin"}
    >
      {isPinned ? <LockClosedIcon className="w-full h-full" /> : <LockOpenIcon className="w-full h-full" />}
    </button>
  );
  const isCompact = useMemo(() => layout === 'compact', [layout]);
  const isPitcher = (player.positionType || '').toUpperCase() === 'P';
  const TeamPos = () => (
    <div className="text-[10px] opacity-60 truncate">
      {(player.teamAbbr || player.teamFullName || '')}
      {" · "}
      {(player.selectedPosition || player.position || '-')}
    </div>
  );

  if (isCompact) {
    // Compact: avatar + name/team/pos + quick stats
    return (
      <div className="card bg-base-200 border border-base-300 h-14 relative">
        <div className="absolute top-1 right-1 opacity-0 hover:opacity-100 transition-opacity z-10"><PinButton size="size-6" /></div>
        <div className="card-body py-2 px-2 flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative w-8 h-8 rounded-full bg-base-300 text-[10px] font-semibold flex items-center justify-center overflow-hidden flex-shrink-0">
              <span className="z-0 select-none">{(player.firstName?.[0] || player.name?.[0] || '?')}</span>
              {avatarSrc ? (
                <img src={avatarSrc} alt={player.name} className="absolute inset-0 w-full h-full object-cover z-10" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : null}
            </div>
            <div className="min-w-0">
              <div className="font-medium leading-tight truncate max-w-[140px]">{player.name}</div>
              <TeamPos />
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] whitespace-nowrap">
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

  // Comfort: avatar + rich header + tidy stats grid
  return (
    <div className="card bg-base-200 border border-base-300 h-40 relative">
      <div className="absolute top-2 right-2 opacity-0 hover:opacity-100 transition-opacity z-10"><PinButton size="size-6" /></div>
      <div className="card-body p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-10 h-10 rounded-full bg-base-300 text-[11px] font-semibold flex items-center justify-center overflow-hidden flex-shrink-0">
              <span className="z-0 select-none">{(player.firstName?.[0] || player.name?.[0] || '?')}</span>
              {avatarSrc ? (
                <img src={avatarSrc} alt={player.name} className="absolute inset-0 w-full h-full object-cover z-10" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : null}
            </div>
            <div className="min-w-0">
              <div className="font-semibold leading-tight truncate max-w-[160px]">{player.name}</div>
              <TeamPos />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dateBadge && (
              <span className="badge badge-ghost badge-xs">{dateBadge}</span>
            )}
            {typeof player.totalPoints === 'number' && (
              <div className="text-right">
                <div className="text-[10px] opacity-60">Pts</div>
                <div className="font-semibold">{player.totalPoints.toFixed(1)}</div>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-6 gap-2 mt-3 text-xs">
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
