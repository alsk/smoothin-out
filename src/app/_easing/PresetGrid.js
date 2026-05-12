"use client";

import { useMemo, useState } from "react";
import { flattenPresets } from "./presets";
import CurveThumbnail from "./CurveThumbnail";

const PENNER_NAMES = new Set(["power1", "power2", "power3", "power4", "back", "bounce", "circ", "elastic", "expo", "sine"]);

function CellButton({ cell, activeKey, onPick }) {
  const isActive = cell.key === activeKey;
  return (
    <button
      key={cell.key}
      type="button"
      onClick={() => onPick(cell.name, cell.variant)}
      className={`presetCell ${isActive ? "presetCellActive" : ""}`}
    >
      <div className="presetThumb">
        <CurveThumbnail anchors={cell.anchors} />
      </div>
      <span className="presetCellLabel">{cell.label}</span>
    </button>
  );
}

export default function PresetGrid({ onPick, activeKey }) {
  const [pennerOpen, setPennerOpen] = useState(false);
  const cells = useMemo(() => flattenPresets(), []);

  const customCells = cells.filter((c) => !PENNER_NAMES.has(c.name));
  const pennerCells = cells.filter((c) => PENNER_NAMES.has(c.name));
  const pennerActive = pennerCells.some((c) => c.key === activeKey);

  return (
    <div className="presetSection">
      <div className="savedHeader">
        <span className="savedHeaderLabel">Presets</span>
      </div>

      <div className="presetGrid">
        {customCells.map((cell) => (
          <CellButton key={cell.key} cell={cell} activeKey={activeKey} onPick={onPick} />
        ))}
      </div>

      <button
        type="button"
        className={`pennerToggle ${pennerActive ? "pennerToggleActive" : ""}`}
        onClick={() => setPennerOpen((v) => !v)}
      >
        Penner easings
        {pennerActive && <span className="pennerActiveDot" />}
        <svg
          width="13"
          height="13"
          viewBox="0 0 10 10"
          className={`pennerChevron ${pennerOpen ? "pennerChevronOpen" : ""}`}
        >
          <path d="M3 1.5 L7 5 L3 8.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className={`pennerDrawer ${pennerOpen ? "pennerDrawerOpen" : ""}`}>
        <div className="pennerDrawerInner">
          <div className="presetGrid">
            {pennerCells.map((cell) => (
              <CellButton key={cell.key} cell={cell} activeKey={activeKey} onPick={onPick} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
