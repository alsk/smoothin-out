"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Graph from "./Graph";
import PresetGrid from "./PresetGrid";
import SavedGrid from "./SavedGrid";
import CodePanel from "./CodePanel";
import { DEFAULT_ANCHORS, DEFAULT_ACTIVE_KEY, PRESETS } from "./presets";
import { buildPathString, buildLinearCss, curveGoesBackward, sampleCurve } from "./bezier";
import { useSavedCurves } from "./useSavedCurves";
import styles from "./easing.module.css";

const CubeScene = dynamic(() => import("./CubeScene"), { ssr: false });

export default function EasingTool() {
  const [anchors, setAnchors] = useState(DEFAULT_ANCHORS);
  const [activeKey, setActiveKey] = useState(DEFAULT_ACTIVE_KEY);
  const [newlyAddedId, setNewlyAddedId] = useState(null);
  const [duration, setDuration] = useState(1500);

  const { saved, add, remove, rename, exportJSON, importJSON } = useSavedCurves();

  const animStartRef = useRef(performance.now());

  const samples = useMemo(() => sampleCurve(anchors, 96), [anchors]);
  const samplesRef = useRef(samples);
  samplesRef.current = samples;

  const anchorsRef = useRef(anchors);
  useEffect(() => { anchorsRef.current = anchors; }, [anchors]);
  const historyRef = useRef([]);
  const redoRef = useRef([]);

  const saveHistory = useCallback(() => {
    historyRef.current = [...historyRef.current.slice(-49), cloneAnchors(anchorsRef.current)];
    redoRef.current = [];
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) {
        const next = redoRef.current.pop();
        if (!next) return;
        historyRef.current = [...historyRef.current.slice(-49), cloneAnchors(anchorsRef.current)];
        setAnchors(next);
        setActiveKey(null);
      } else {
        const prev = historyRef.current.pop();
        if (!prev) return;
        redoRef.current = [...redoRef.current.slice(-49), cloneAnchors(anchorsRef.current)];
        setAnchors(prev);
        setActiveKey(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const pathString = useMemo(() => buildPathString(anchors), [anchors]);
  const linearCss = useMemo(() => buildLinearCss(anchors), [anchors]);
  const linearGoesBackward = useMemo(() => curveGoesBackward(anchors), [anchors]);

  const onPickPreset = (name, variant) => {
    const preset = PRESETS[name];
    if (!preset) return;
    const data = preset.variants[variant];
    if (!data) return;
    saveHistory();
    setAnchors(cloneAnchors(data));
    setActiveKey(`${name}.${variant}`);
  };

  const onPickSaved = (cell) => {
    setAnchors(cloneAnchors(cell.anchors));
    setActiveKey(`saved.${cell.id}`);
  };

  const onSaveCurrent = () => {
    const id = add(anchors);
    setActiveKey(`saved.${id}`);
    setNewlyAddedId(id);
  };

  const onDeleteSaved = (id) => {
    remove(id);
    if (activeKey === `saved.${id}`) setActiveKey(null);
  };

  const handleSetAnchors = (updater) => {
    setAnchors(updater);
    setActiveKey(null);
  };

  const activeLabel = useMemo(() => {
    if (!activeKey) return "custom";
    if (activeKey.startsWith("saved.")) {
      const id = activeKey.slice("saved.".length);
      const found = saved.find((s) => s.id === id);
      return found ? found.name : "custom";
    }
    return activeKey;
  }, [activeKey, saved]);

  return (
    <div className={styles.shell}>
      <div className={styles.wrap}>
        <header className={styles.header}>
          <div>
            <div className={styles.titleBlock}>
              <h1>Smoothin-out</h1>
              <div className={styles.headerPreview}>
                <CubeScene samplesRef={samplesRef} duration={duration} animStartRef={animStartRef} />
              </div>
            </div>
            <div>
              <p className={styles.tagline}>
                Drag handles. Click the curve to add a point. Double-click a point to remove.
              </p>
            </div>
          </div>
          
          <div className={styles.meta}>
            <div className={styles.metaRow}>
              <span className={styles.metaKey}>curve</span>
              <span className={styles.metaVal}>{activeLabel}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaKey}>anchors</span>
              <span className={styles.metaVal}>{String(anchors.length).padStart(2, "0")}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaKey}>by</span>
              <a href="https://x.com/_alexand_re" target="_blank" rel="noopener noreferrer" className={styles.metaLink}>@_alexand_re</a>
            </div>
          </div>
        </header>

        <div className={styles.layout}>
          <div className={styles.left}>
            <div className={styles.graphCard}>
              <Graph anchors={anchors} setAnchors={handleSetAnchors} duration={duration} onDurationChange={setDuration} onWillChange={saveHistory} animStartRef={animStartRef} />
            </div>
          </div>

          <div className={styles.right}>
            <CodePanel pathString={pathString} linearCss={linearCss} linearGoesBackward={linearGoesBackward} />
            <SavedGrid
              saved={saved}
              activeKey={activeKey}
              onSave={onSaveCurrent}
              onPick={onPickSaved}
              onRename={rename}
              onDelete={onDeleteSaved}
              onExport={exportJSON}
              onImport={importJSON}
              newlyAddedId={newlyAddedId}
              onClearNewlyAdded={() => setNewlyAddedId(null)}
            />
            <PresetGrid onPick={onPickPreset} activeKey={activeKey} />
          </div>
        </div>
      </div>
    </div>
  );
}

function cloneAnchors(anchors) {
  return anchors.map((a) => ({
    ...a,
    hIn: a.hIn ? { ...a.hIn } : null,
    hOut: a.hOut ? { ...a.hOut } : null,
  }));
}
