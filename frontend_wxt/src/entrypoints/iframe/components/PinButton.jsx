import React from "react";
import { LockOpenIcon, LockClosedIcon } from "@heroicons/react/24/solid";

/**
 * Unified pin/unpin button for all card types.
 * Pass the pinned state and a toggle handler.
 */
export default function PinButton({ isPinned, onToggle, size = "w-4 h-4", className = "" }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle?.();
      }}
      className={`${size} text-base-content/60 hover:text-base-content transition-colors p-1 rounded hover:bg-base-300 ${className}`}
      title={isPinned ? "Unpin item" : "Pin item"}
    >
      {isPinned ? (
        <LockClosedIcon className="w-full h-full" />
      ) : (
        <LockOpenIcon className="w-full h-full" />
      )}
    </button>
  );
}
