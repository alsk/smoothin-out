"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./easing.module.css";

const PATH_DESC =
  "An SVG path string that traces the easing curve from (0,0) to (1,1). Used by animation tools that accept path-based custom easings.";

const CSS_DESC =
  "A CSS timing function that approximates the curve as a series of linear stops. Natively supported in all modern browsers — no JavaScript required.";

const PATH_USAGE = `// GSAP CustomEase
const ease = CustomEase.create("ease", "M0,0 C…")

gsap.to(".el", {
  ease,
  duration: 1,
})`;

const CSS_USAGE = `.element {
  transition: transform 1s linear(0, …, 1);
}`;

export default function CodePanel({ pathString, linearCss, linearGoesBackward }) {
  return (
    <div className={styles.codeStack}>
      <CodeCell label="vector path" code={pathString} description={PATH_DESC} usage={PATH_USAGE} lang="js" />
      <CodeCell label="css linear()" code={linearCss} description={CSS_DESC} usage={CSS_USAGE} lang="css" showAlert={linearGoesBackward} />
    </div>
  );
}

const STR_STYLE = { color: '#b8a46a' };
const EASING_HIGHLIGHT = {
  background: 'rgba(255, 210, 80, 0.14)',
  borderRadius: '3px',
  padding: '0 3px',
  boxShadow: 'inset 0 0 0 1px rgba(255, 210, 80, 0.22)',
};

function SyntaxHighlight({ code, lang }) {
  const parts = [];
  let key = 0;

  if (lang === 'css') {
    for (const line of code.split('\n')) {
      if (parts.length > 0) parts.push('\n');
      const sel = line.match(/^(\s*)([.#][\w-]+)(.*)$/);
      if (sel) {
        parts.push(sel[1]);
        parts.push(<span key={key++} style={{ color: '#f0899c' }}>{sel[2]}</span>);
        parts.push(sel[3]);
      } else {
        const prop = line.match(/^(\s*)([\w-]+)(\s*:)(.*)$/);
        if (prop) {
          parts.push(prop[1]);
          parts.push(<span key={key++} style={{ color: '#9bb5c4' }}>{prop[2]}</span>);
          parts.push(<span key={key++} style={{ color: '#6b6560' }}>{prop[3]}</span>);
          const valueStr = prop[4];
          const lm = valueStr.match(/(.*)(linear\([^)]*…[^)]*\))(.*)/);
          if (lm) {
            parts.push(lm[1]);
            parts.push(<span key={key++} style={EASING_HIGHLIGHT}>{lm[2]}</span>);
            parts.push(lm[3]);
          } else {
            parts.push(valueStr);
          }
        } else {
          parts.push(line);
        }
      }
    }
    return <>{parts}</>;
  }

  // JS tokenizer: comments > strings > numbers > fn-calls > identifiers > punctuation > rest
  const re = /(\/\/[^\n]*)|(["'][^"'\n]*["'])|(\b\d+\b)|([\w$]+)(?=\s*\()|([\w$]+)|([.,()\[\]{}:;])|[\s\S]/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    if (m[1])      parts.push(<span key={key++} style={{ color: '#6b6560' }}>{m[1]}</span>);
    else if (m[2]) parts.push(<span key={key++} style={m[2].includes('…') ? { ...STR_STYLE, ...EASING_HIGHLIGHT } : STR_STYLE}>{m[2]}</span>);
    else if (m[3]) parts.push(<span key={key++} style={{ color: '#9db87a' }}>{m[3]}</span>);
    else if (m[4]) parts.push(<span key={key++} style={{ color: '#f0899c' }}>{m[4]}</span>);
    else if (m[5]) parts.push(m[5]);
    else if (m[6]) parts.push(<span key={key++} style={{ color: '#6b6560' }}>{m[6]}</span>);
    else           parts.push(m[0]);
  }
  return <>{parts}</>;
}

function CodeCell({ label, code, description, usage, showAlert, lang = 'js' }) {
  const [copied, setCopied] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const infoRef = useRef(null);

  useEffect(() => {
    if (!infoOpen) return;
    const handler = (e) => {
      if (infoRef.current && !infoRef.current.contains(e.target)) {
        setInfoOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [infoOpen]);

  useEffect(() => {
    if (!alertOpen) return;
    const handler = (e) => {
      if (infoRef.current && !infoRef.current.contains(e.target)) {
        setAlertOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [alertOpen]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className={styles.codePanel}>
      <div className={styles.codeHeader}>
        <div className={styles.codeLabelRow} ref={infoRef}>
          <span>{label}</span>
          <button
            type="button"
            className={`${styles.infoBtn} ${infoOpen ? styles.infoBtnActive : ""}`}
            onClick={() => { if (infoOpen) setInfoOpen(false); else { setInfoOpen(true); setAlertOpen(false); } }}
            aria-label="About this format"
            aria-expanded={infoOpen}
          >
            <InfoIcon />
          </button>
          <div className={`${styles.infoPopup} ${infoOpen ? styles.infoPopupOpen : ""}`}>
            <p className={styles.infoDesc}>{description}</p>
          </div>
          {showAlert && (
            <button
              type="button"
              className={`${styles.alertBtn} ${alertOpen ? styles.alertBtnActive : ""}`}
              onClick={() => { if (alertOpen) setAlertOpen(false); else { setAlertOpen(true); setInfoOpen(false); } }}
              aria-label="Why CSS linear() may be inaccurate"
              aria-expanded={alertOpen}
            >
              <AlertIcon />
            </button>
          )}
          {showAlert && (
            <div className={`${styles.alertPopup} ${alertOpen ? styles.alertPopupOpen : ""}`}>
              <p className={styles.infoDesc}>
                CSS linear() is monotonic, meaning its values can't go backward in time. <span className={styles.alertHighlight}>Your curve reverses in X.</span> Use the vector path with GSAP CustomEase for backward-going curves.
              </p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={copy}
          className={`${styles.copyBlockBtn} ${copied ? styles.copyBlockBtnDone : ""}`}
        >
          {copied ? <CheckIcon /> : <ClipboardIcon />}
          {copied ? "Copied!" : "Copy code"}
        </button>
      </div>
      <pre className={styles.codeBlock}>
        <code>{code}</code>
      </pre>
      <div className={styles.usageDrawerWrap}>
        <button
          type="button"
          className={styles.howToBtn}
          onClick={() => setHowToOpen((v) => !v)}
          aria-expanded={howToOpen}
        >
          <svg
            className={`${styles.howToChevron} ${howToOpen ? styles.howToChevronOpen : ""}`}
            width="10" height="10" viewBox="0 0 10 10" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="2,3.5 5,6.5 8,3.5" />
          </svg>
          <span>How to integrate</span>
        </button>
        <div className={`${styles.codeDrawer} ${howToOpen ? styles.codeDrawerOpen : ""}`}>
          <div className={styles.codeDrawerInner}>
            <pre className={styles.codeUsageBlock}>
              <SyntaxHighlight code={usage} lang={lang} />
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 1.5L12 11.5H1L6.5 1.5Z" />
      <line x1="6.5" y1="5.5" x2="6.5" y2="8" />
      <circle cx="6.5" cy="9.75" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="5.5" />
      <line x1="6.5" y1="5.5" x2="6.5" y2="9" />
      <circle cx="6.5" cy="3.75" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4.5" y="0.5" width="8" height="10" rx="1.5" />
      <path d="M2.5 2.5H1.5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="1.5,7 5,10.5 11.5,2.5" />
    </svg>
  );
}
