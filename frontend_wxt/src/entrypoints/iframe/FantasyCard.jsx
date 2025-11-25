import React, { useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { LockClosedIcon, LockOpenIcon, CalendarDaysIcon } from "@heroicons/react/24/solid";
import { addPinnedItem, removePinnedItem, selectIsItemPinned } from "../store/pinnedSlice.js";

export default function FantasyCard({ player, dateBadge, sport }) {
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
  const TeamPos = () => (
    <div className="text-[10px] opacity-60 truncate">
      {(player.teamAbbr || player.teamFullName || '')}
      {" · "}
      {(player.selectedPosition || player.position || '-')}
    </div>
  );
  const generalStats = useMemo(() => {
    const statList = [];
    if (Array.isArray(player.stats)) {
      player.stats.forEach((stat) => {
        if (!stat || !stat.name) return;
        if (statList.length >= 3) return;
        const value = typeof stat.value === 'number' ? stat.value : stat.value ?? '-';
        statList.push({ label: stat.abbr || stat.name, value });
      });
    }
    if (!statList.length && typeof player.totalPoints === 'number') {
      statList.push({ label: 'PTS', value: player.totalPoints.toFixed(1) });
    }
    return statList;
  }, [player.stats, player.totalPoints]);

  if (isCompact) {
    // Compact: avatar + name/team/pos + quick stats
    return (
      <div className="card bg-base-200 border border-base-300 h-14 relative">
        {/* Date icon badge with tooltip */}
        {dateBadge && (
          <div className="tooltip tooltip-bottom absolute top-1 left-1 z-10" data-tip={dateBadge}>
            <div className="badge badge-ghost badge-sm p-1">
              <CalendarDaysIcon className="w-3.5 h-3.5" />
            </div>
          </div>
        )}
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
            {generalStats.slice(0, 3).map((stat) => (
              <span key={stat.label}>{stat.label} {stat.value}</span>
            ))}
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
        <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
          {generalStats.slice(0, 3).map((stat) => (
            <Stat key={stat.label} label={stat.label} val={stat.value} />
          ))}
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
