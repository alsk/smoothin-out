"use client";

import { useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { sampleCurve } from "./bezier";
import styles from "./easing.module.css";

const CubeScene = dynamic(() => import("./CubeScene"), { ssr: false });

export default function Preview({ anchors, duration = 1500, animStartRef }) {
  const samples = useMemo(() => sampleCurve(anchors, 96), [anchors]);
  const samplesRef = useRef(samples);
  samplesRef.current = samples;

  return (
    <div className={styles.preview}>
      <div className={styles.previewCell}>
        <span className={styles.previewLabel}>3d</span>
        <div className={styles.cubeTrack}>
          <CubeScene samplesRef={samplesRef} duration={duration} animStartRef={animStartRef} />
        </div>
      </div>
    </div>
  );
}
