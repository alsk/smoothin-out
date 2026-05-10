"use client";

import { useMemo } from "react";
import { sampleCurve } from "./bezier";
import styles from "./easing.module.css";

const W = 100;
const H = 100;
const PAD = 8;

export default function CurveThumbnail({ anchors }) {
  const d = useMemo(() => buildThumbPath(anchors), [anchors]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.presetThumbSvg}>
      <path d={d} className={styles.presetThumbPath} fill="none" />
    </svg>
  );
}

function buildThumbPath(anchors) {
  const samples = sampleCurve(anchors, 48);
  if (!samples.length) return "";

  let yMin = Infinity;
  let yMax = -Infinity;
  for (const p of samples) {
    if (p.y < yMin) yMin = p.y;
    if (p.y > yMax) yMax = p.y;
  }
  yMin = Math.min(yMin, 0);
  yMax = Math.max(yMax, 1);
  const range = yMax - yMin || 1;

  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;
  const mapX = (x) => PAD + x * innerW;
  const mapY = (y) => PAD + (1 - (y - yMin) / range) * innerH;

  let d = `M ${mapX(samples[0].x).toFixed(2)} ${mapY(samples[0].y).toFixed(2)}`;
  for (let i = 1; i < samples.length; i++) {
    d += ` L ${mapX(samples[i].x).toFixed(2)} ${mapY(samples[i].y).toFixed(2)}`;
  }
  return d;
}
