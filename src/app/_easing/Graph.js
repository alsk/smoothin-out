"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  buildPathString,
  handlePoint,
  findSegmentForX,
  solveTForX,
  splitSegment,
  sampleCurve,
  sampleY,
} from "./bezier";

const W = 1000;
const H = 1000;
const PAD = 80;
const Y_MIN = 0;
const Y_MAX = 1;
const FADE_IN_DURATION = 0;
const HOLD_BEFORE_FADE = 400;
const FADE_DURATION = 200;
const PAUSE_AFTER_FADE = 300;

const gxToSvg = (gx) => PAD + gx * (W - 2 * PAD);
const gyToSvg = (gy) =>
  PAD + (1 - (gy - Y_MIN) / (Y_MAX - Y_MIN)) * (H - 2 * PAD);
const svgToGx = (sx) => (sx - PAD) / (W - 2 * PAD);
const svgToGy = (sy) =>
  Y_MIN + (1 - (sy - PAD) / (H - 2 * PAD)) * (Y_MAX - Y_MIN);

export default function Graph({ anchors, setAnchors, duration = 1500, onDurationChange, onWillChange, animStartRef }) {
  const svgRef = useRef(null);
  const [drag, setDrag] = useState(null); // { kind, index, pointerId }
  const [selectedAnchor, setSelectedAnchor] = useState(null);
  const tracerRef = useRef(null);
  const trackerRef = useRef(null);
  const durationDragRef = useRef(null);

  useLayoutEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    let raf = null;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const cellPx = rect.width * (W - 2 * PAD) / W / 10;
      const originX = rect.left + rect.width * (PAD / W);
      const originY = rect.top + rect.height * (PAD / H);
      const mc = cellPx * 5;
      const r = document.documentElement;
      r.style.setProperty("--bg-cell", `${cellPx}px`);
      r.style.setProperty("--bg-ox-major", `${((originX % mc) + mc) % mc}px`);
      r.style.setProperty("--bg-oy-major", `${((originY % mc) + mc) % mc}px`);
      r.style.setProperty("--bg-ox-minor", `${((originX % cellPx) + cellPx) % cellPx}px`);
      r.style.setProperty("--bg-oy-minor", `${((originY % cellPx) + cellPx) % cellPx}px`);
      raf = null;
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    let revealRaf = requestAnimationFrame(() => {
      document.documentElement.classList.add("grid-ready");
      revealRaf = null;
    });
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      if (revealRaf) cancelAnimationFrame(revealRaf);
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", update);
      document.documentElement.classList.remove("grid-ready");
    };
  }, []);

  const samples = useMemo(() => sampleCurve(anchors, 96), [anchors]);
  const samplesRef = useRef(samples);
  samplesRef.current = samples;

  // Continuous tracer that runs the curve in a loop with a fade-out between loops.
  useEffect(() => {
    let raf = 0;
    animStartRef.current = performance.now();
    const cycle = duration + HOLD_BEFORE_FADE + FADE_DURATION + PAUSE_AFTER_FADE;
    const tick = (now) => {
      const elapsed = (now - animStartRef.current) % cycle;
      if (elapsed < duration) {
        const progress = elapsed / duration;
        const y = sampleY(samplesRef.current, progress);
        const opacity = elapsed < FADE_IN_DURATION ? elapsed / FADE_IN_DURATION : 1;
        if (tracerRef.current) {
          tracerRef.current.setAttribute("cx", String(gxToSvg(progress)));
          tracerRef.current.setAttribute("cy", String(gyToSvg(y)));
          tracerRef.current.style.opacity = String(opacity);
        }
        if (trackerRef.current) {
          trackerRef.current.style.top = `${8 + (1 - y) * 84}%`;
          trackerRef.current.style.opacity = String(opacity);
        }
      } else if (elapsed < duration + HOLD_BEFORE_FADE) {
        // hold at end position, full opacity
      } else {
        const fadeElapsed = elapsed - duration - HOLD_BEFORE_FADE;
        const opacity = fadeElapsed < FADE_DURATION
          ? String(1 - fadeElapsed / FADE_DURATION)
          : "0";
        if (tracerRef.current) tracerRef.current.style.opacity = opacity;
        if (trackerRef.current) trackerRef.current.style.opacity = opacity;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration]);

  const pointerToSvg = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  };

  const onPointerMove = (e) => {
    if (!drag) return;
    const p = pointerToSvg(e);
    const gx = svgToGx(p.x);
    const gy = svgToGy(p.y);
    setAnchors((prev) => {
      const next = prev.map((a) => ({
        ...a,
        hIn: a.hIn ? { ...a.hIn } : null,
        hOut: a.hOut ? { ...a.hOut } : null,
      }));
      const a = next[drag.index];
      if (drag.kind === "anchor") {
        if (drag.index === 0 || drag.index === next.length - 1) return prev;
        const minX = next[drag.index - 1].x + 0.001;
        const maxX = next[drag.index + 1].x - 0.001;
        a.x = Math.min(maxX, Math.max(minX, gx));
        a.y = gy;
      } else if (drag.kind === "hIn" && a.hIn) {
        a.hIn.dx = gx - a.x;
        a.hIn.dy = gy - a.y;
        if (a.hOut) {
          const len = Math.sqrt(a.hIn.dx ** 2 + a.hIn.dy ** 2);
          const outLen = Math.sqrt(a.hOut.dx ** 2 + a.hOut.dy ** 2);
          if (len > 0) { a.hOut.dx = (-a.hIn.dx / len) * outLen; a.hOut.dy = (-a.hIn.dy / len) * outLen; }
        }
      } else if (drag.kind === "hOut" && a.hOut) {
        a.hOut.dx = gx - a.x;
        a.hOut.dy = gy - a.y;
        if (a.hIn) {
          const len = Math.sqrt(a.hOut.dx ** 2 + a.hOut.dy ** 2);
          const inLen = Math.sqrt(a.hIn.dx ** 2 + a.hIn.dy ** 2);
          if (len > 0) { a.hIn.dx = (-a.hOut.dx / len) * inLen; a.hIn.dy = (-a.hOut.dy / len) * inLen; }
        }
      }
      return next;
    });
  };

  const startDrag = (kind, index) => (e) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    onWillChange?.();
    setSelectedAnchor(index);
    setDrag({ kind, index, pointerId: e.pointerId });
  };

  const endDrag = (e) => {
    if (drag && e.currentTarget.releasePointerCapture) {
      try {
        e.currentTarget.releasePointerCapture(drag.pointerId);
      } catch {}
    }
    setDrag(null);
  };

  const onCurveClick = (e) => {
    if (drag) return;
    onWillChange?.();
    const p = pointerToSvg(e);
    const gx = svgToGx(p.x);
    if (gx <= 0.01 || gx >= 0.99) return;
    const i = findSegmentForX(anchors, gx);
    const prev = anchors[i - 1];
    const next = anchors[i];
    const p0 = { x: prev.x, y: prev.y };
    const p3 = { x: next.x, y: next.y };
    const p1 = handlePoint(prev, "out") || p0;
    const p2 = handlePoint(next, "in") || p3;
    const t = solveTForX(p0, p1, p2, p3, gx);
    const { newAnchor, leftHOut, rightHIn } = splitSegment(prev, next, t);
    setAnchors((arr) => {
      const out = arr.map((a) => ({
        ...a,
        hIn: a.hIn ? { ...a.hIn } : null,
        hOut: a.hOut ? { ...a.hOut } : null,
      }));
      out[i - 1].hOut = leftHOut;
      out[i].hIn = rightHIn;
      out.splice(i, 0, newAnchor);
      return out;
    });
  };

  const onDurationPointerDown = (e) => {
    if (!onDurationChange) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    durationDragRef.current = { startX: e.clientX, startDuration: duration };
  };

  const onDurationPointerMove = (e) => {
    if (!durationDragRef.current) return;
    const delta = e.clientX - durationDragRef.current.startX;
    const raw = durationDragRef.current.startDuration + delta * 8;
    onDurationChange(Math.round(Math.max(100, Math.min(8000, raw)) / 10) * 10);
  };

  const onDurationPointerUp = () => {
    durationDragRef.current = null;
  };

  const removeAnchor = (index) => (e) => {
    e.stopPropagation();
    if (index === 0 || index === anchors.length - 1) return;
    onWillChange?.();
    setAnchors((arr) => arr.filter((_, i) => i !== index));
  };

  const dSvg = anchorsToSvgPath(anchors);

  return (
    <div className="graphWrapper">
      <div className="trackerTrack">
        <div ref={trackerRef} className="trackerDot" />
      </div>
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      overflow="visible"
      className="graph"
      onPointerDown={() => setSelectedAnchor(null)}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <Grid />
      <BoundsRect />

      <path d={dSvg} className="curve" fill="none" />

      {/* Invisible thick hit area for click-to-insert */}
      <path
        d={dSvg}
        className="curveHit"
        fill="none"
        onClick={onCurveClick}
      />

      {/* Tracer dot */}
      <circle ref={tracerRef} r={16} className="tracer" />

      {/* Handle lines */}
      {anchors.map((a, i) => {
        const sel = selectedAnchor === i;
        const lines = [];
        if (a.hIn) {
          const hp = handlePoint(a, "in");
          lines.push(
            <line
              key={`l-in-${i}`}
              x1={gxToSvg(a.x)}
              y1={gyToSvg(a.y)}
              x2={gxToSvg(hp.x)}
              y2={gyToSvg(hp.y)}
              className={sel ? "handleLine handleLineSelected" : "handleLine"}
            />
          );
        }
        if (a.hOut) {
          const hp = handlePoint(a, "out");
          lines.push(
            <line
              key={`l-out-${i}`}
              x1={gxToSvg(a.x)}
              y1={gyToSvg(a.y)}
              x2={gxToSvg(hp.x)}
              y2={gyToSvg(hp.y)}
              className={sel ? "handleLine handleLineSelected" : "handleLine"}
            />
          );
        }
        return lines;
      })}

      {/* Handles (drawn before anchors so anchors sit on top) */}
      {anchors.map((a, i) => {
        const sel = selectedAnchor === i;
        const els = [];
        if (a.hIn) {
          const hp = handlePoint(a, "in");
          els.push(
            <circle
              key={`h-in-${i}`}
              cx={gxToSvg(hp.x)}
              cy={gyToSvg(hp.y)}
              r={13}
              className={sel ? "handle handleSelected" : "handle"}
              onPointerDown={startDrag("hIn", i)}
            />
          );
        }
        if (a.hOut) {
          const hp = handlePoint(a, "out");
          els.push(
            <circle
              key={`h-out-${i}`}
              cx={gxToSvg(hp.x)}
              cy={gyToSvg(hp.y)}
              r={13}
              className={sel ? "handle handleSelected" : "handle"}
              onPointerDown={startDrag("hOut", i)}
            />
          );
        }
        return els;
      })}

      {/* Anchors */}
      {anchors.map((a, i) => {
        const isEnd = i === 0 || i === anchors.length - 1;
        const sel = selectedAnchor === i;
        const cx = gxToSvg(a.x);
        const cy = gyToSvg(a.y);
        if (isEnd) {
          const s = 8;
          return (
            <rect
              key={`a-${i}`}
              x={cx - s}
              y={cy - s}
              width={s * 2}
              height={s * 2}
              className="anchorEnd"
            />
          );
        }
        return (
          <circle
            key={`a-${i}`}
            cx={cx}
            cy={cy}
            r={10}
            className={sel ? "anchor anchorSelected" : "anchor"}
            onPointerDown={startDrag("anchor", i)}
            onDoubleClick={removeAnchor(i)}
          />
        );
      })}

      <text x={gxToSvg(0)} y={H - PAD + 46} className="xAxisZero">0</text>

      {onDurationChange && (() => {
        const label = formatDuration(duration);
        const pillW = Math.round(label.length * 16 + 40);
        return (
          <g
            transform={`translate(${gxToSvg(1)}, ${H - PAD + 38})`}
            className="durationBtn"
            onPointerDown={onDurationPointerDown}
            onPointerMove={onDurationPointerMove}
            onPointerUp={onDurationPointerUp}
            onPointerCancel={onDurationPointerUp}
          >
            <rect x={-pillW} y={-24} width={pillW} height={48} rx={10} className="durationPill" />
            <text x={-14} y={9} textAnchor="end" className="durationLabelText">
              {label}
            </text>
          </g>
        );
      })()}
    </svg>
    </div>
  );
}

function anchorsToSvgPath(anchors) {
  if (anchors.length < 2) return "";
  let d = `M ${gxToSvg(anchors[0].x)} ${gyToSvg(anchors[0].y)}`;
  for (let i = 1; i < anchors.length; i++) {
    const a = anchors[i - 1];
    const b = anchors[i];
    const c1 = handlePoint(a, "out") || { x: a.x, y: a.y };
    const c2 = handlePoint(b, "in") || { x: b.x, y: b.y };
    d += ` C ${gxToSvg(c1.x)} ${gyToSvg(c1.y)} ${gxToSvg(c2.x)} ${gyToSvg(c2.y)} ${gxToSvg(b.x)} ${gyToSvg(b.y)}`;
  }
  return d;
}

function Grid() {
  const lines = [];
  for (let i = 0; i <= 10; i++) {
    const x = PAD + (i / 10) * (W - 2 * PAD);
    const cls = i % 5 === 0 ? "gridLineMajor" : "gridLine";
    lines.push(
      <line key={`gx${i}`} x1={x} y1={PAD} x2={x} y2={H - PAD} className={cls} />
    );
  }
  for (let i = 0; i <= 10; i++) {
    const y = PAD + (i / 10) * (H - 2 * PAD);
    const cls = i % 5 === 0 ? "gridLineMajor" : "gridLine";
    lines.push(
      <line key={`gy${i}`} x1={PAD} y1={y} x2={W - PAD} y2={y} className={cls} />
    );
  }
  return <g>{lines}</g>;
}

function BoundsRect() {
  return (
    <rect
      x={gxToSvg(0)}
      y={gyToSvg(1)}
      width={gxToSvg(1) - gxToSvg(0)}
      height={gyToSvg(0) - gyToSvg(1)}
      className="bounds"
    />
  );
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  return `${Math.round(s * 10) / 10}s`;
}
