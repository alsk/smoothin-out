"use client";

import { useEffect, useRef, useState } from "react";
import CurveThumbnail from "./CurveThumbnail";

export default function SavedGrid({
  saved,
  activeKey,
  onSave,
  onPick,
  onRename,
  onDelete,
  onExport,
  onImport,
  newlyAddedId,
  onClearNewlyAdded,
}) {
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (newlyAddedId) {
      setEditingId(newlyAddedId);
      onClearNewlyAdded?.();
    }
  }, [newlyAddedId, onClearNewlyAdded]);

  return (
    <div className="savedSection">
      <div className="savedHeader">
        <span className="savedHeaderLabel">
          Saved {saved.length > 0 ? `(${saved.length})` : ""}
        </span>
        <div className="savedHeaderActions">
          {saved.length > 0 && (
            <button type="button" className="pushBtn savedChipBtn" onClick={onExport}>
              <span className="pushFace">
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M5.5 7.5V1.5M2.5 4 5.5 1 8.5 4M1 9.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                export
              </span>
            </button>
          )}
          <button
            type="button"
            className="pushBtn savedChipBtn"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="pushFace">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M5.5 1v6M2.5 4.5 5.5 7.5 8.5 4.5M1 9.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              import
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImport(file);
              e.target.value = "";
            }}
          />
          <button type="button" className="pushBtn savedPrimaryBtn" onClick={onSave}>
            <span className="pushFace">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              save current curve
            </span>
          </button>
        </div>
      </div>

      {saved.length === 0 ? (
        <div className="savedEmpty">No saved curves yet</div>
      ) : (
        <div className="presetGrid">
          {saved.map((cell) => {
            const key = `saved.${cell.id}`;
            const isActive = key === activeKey;
            const isEditing = editingId === cell.id;
            return (
              <SavedCell
                key={cell.id}
                cell={cell}
                isActive={isActive}
                isEditing={isEditing}
                onPick={() => onPick(cell)}
                onStartEdit={() => setEditingId(cell.id)}
                onEndEdit={() => setEditingId(null)}
                onRename={(name) => onRename(cell.id, name)}
                onDelete={() => {
                  if (isEditing) setEditingId(null);
                  onDelete(cell.id);
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function SavedCell({
  cell,
  isActive,
  isEditing,
  onPick,
  onStartEdit,
  onEndEdit,
  onRename,
  onDelete,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const onCellClick = () => {
    if (isEditing) return;
    onPick();
  };

  const onCellKeyDown = (e) => {
    if (isEditing) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onPick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onCellClick}
      onKeyDown={onCellKeyDown}
      className={`presetCell savedCell ${isActive ? "presetCellActive" : ""}`}
    >
      <button
        type="button"
        className="savedDelete"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        aria-label={`Delete ${cell.name}`}
      >
        ×
      </button>
      <div className="presetThumb">
        <CurveThumbnail anchors={cell.anchors} />
      </div>
      {isEditing ? (
        <input
          ref={inputRef}
          className="savedNameInput"
          defaultValue={cell.name}
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v) onRename(v);
            onEndEdit();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              e.preventDefault();
              onEndEdit();
            }
          }}
        />
      ) : (
        <span
          className="presetCellLabel"
          onDoubleClick={(e) => {
            e.stopPropagation();
            onStartEdit();
          }}
          title="Double-click to rename"
        >
          {cell.name}
        </span>
      )}
    </div>
  );
}
