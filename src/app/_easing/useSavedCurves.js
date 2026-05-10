"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "easing-editor:custom-curves";

export function useSavedCurves() {
  const [saved, setSaved] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSaved(parsed);
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {}
  }, [saved, hydrated]);

  const add = (anchors) => {
    const existing = new Set(saved.map((s) => s.name));
    let n = saved.length + 1;
    let defaultName = `custom ${n}`;
    while (existing.has(defaultName)) {
      n++;
      defaultName = `custom ${n}`;
    }
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()) + Math.random().toString(36).slice(2, 8);
    const entry = {
      id,
      name: defaultName,
      anchors: cloneAnchors(anchors),
      savedAt: Date.now(),
    };
    setSaved((s) => [...s, entry]);
    return id;
  };

  const remove = (id) => setSaved((s) => s.filter((x) => x.id !== id));

  const rename = (id, name) =>
    setSaved((s) => s.map((x) => (x.id === id ? { ...x, name } : x)));

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(saved, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "easing-presets.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!Array.isArray(parsed)) return;
        const valid = parsed.filter(
          (p) => p.id && p.name && Array.isArray(p.anchors)
        );
        if (!valid.length) return;
        setSaved((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const toAdd = valid.filter((p) => !existingIds.has(p.id));
          return [...prev, ...toAdd];
        });
      } catch {}
    };
    reader.readAsText(file);
  };

  return { saved, hydrated, add, remove, rename, exportJSON, importJSON };
}

function cloneAnchors(anchors) {
  return anchors.map((a) => ({
    x: a.x,
    y: a.y,
    hIn: a.hIn ? { dx: a.hIn.dx, dy: a.hIn.dy } : null,
    hOut: a.hOut ? { dx: a.hOut.dx, dy: a.hOut.dy } : null,
  }));
}
