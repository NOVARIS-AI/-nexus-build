import { useEffect, useRef, useState } from "react";
import { getAraCharacterAppearance } from "../lib/npcHumanFoundation";
import { formatAraDiagnosticSummary, loadAraEngine } from "../lib/araEngine";

type Props = { id: string; name: string; index: number; appearance?: { preset?: string; outfit?: string; shoes?: string; carry?: string } };

export function preloadAraEngine() { void loadAraEngine().catch(() => undefined); }

// A single live Ara/WebGL scene across the whole catalogue. The phone keeps the
// lightweight NPC cards, but never accumulates dozens of hidden GPU canvases.
let activeCards = 0;
const waiting: Array<() => void> = [];
function pump() {
  while (activeCards < 1 && waiting.length) {
    activeCards++;
    waiting.shift()?.();
  }
}
function requestSlot(start: () => void) {
  waiting.push(start);
  pump();
  return () => {
    const index = waiting.indexOf(start);
    if (index >= 0) waiting.splice(index, 1);
  };
}
function releaseSlot() {
  activeCards = Math.max(0, activeCards - 1);
  pump();
}

function stableCharacterSeed(id: string) {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  return (hash >>> 0) % 1_000_000_001;
}

export default function AraCharacterCard({ id, name, index, appearance }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [previewRequested, setPreviewRequested] = useState(false);
  const [status, setStatus] = useState("Tap to load the 3D preview");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const node = host.current;
    if (!node || typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      setVisible(entries.some(entry => entry.isIntersecting));
    }, { rootMargin: "0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !previewRequested || !host.current) return;
    let cancelled = false;
    let element: HTMLElement | null = null;
    let hasSlot = false;
    let timeout = 0;
    let modelReady = false;
    let released = false;
    const release = () => {
      if (hasSlot && !released) {
        released = true;
        hasSlot = false;
        releaseSlot();
      }
    };
    const cancelQueued = requestSlot(() => {
      if (cancelled || !host.current) { releaseSlot(); return; }
      hasSlot = true;
      setStatus("Loading one lightweight 3D preview…");
      void loadAraEngine().then(() => {
        if (cancelled || !host.current) { release(); return; }
        const character = document.createElement("ara-character");
        const characterAppearance = { ...getAraCharacterAppearance(id), ...(appearance ?? {}) };
        character.setAttribute("random", String(stableCharacterSeed(id)));
        character.setAttribute("animation", "idle");
        character.setAttribute("expression", "neutral");
        character.setAttribute("detail", "low");
        character.setAttribute("background", "#24232c");
        character.setAttribute("colors", `outfit: ${characterAppearance.outfit}; shoes: ${characterAppearance.shoes}; carry: ${characterAppearance.carry}`);
        character.setAttribute("look-at", "camera");
        character.style.display = "block";
        character.style.width = "100%";
        character.style.height = "100%";
        character.setAttribute("aria-label", name + " 3D character");
        character.addEventListener("load", () => {
          modelReady = true;
          window.clearTimeout(timeout);
          setStatus("REAL 3D CHARACTER · DRAG TO ROTATE");
          // Keep the single slot while this card is visible; release on scroll-away.
        }, { once: true });
        character.addEventListener("error", event => {
          window.clearTimeout(timeout);
          const detail = event instanceof CustomEvent ? event.detail as { message?: string } | undefined : undefined;
          setStatus(`${detail?.message ? `3D model error: ${detail.message}` : "3D character data unavailable"} · ${formatAraDiagnosticSummary()}`);
          release();
        }, { once: true });
        host.current.replaceChildren(character);
        element = character;
        timeout = window.setTimeout(() => {
          if (cancelled || modelReady) return;
          setStatus(`3D data is taking too long · ${formatAraDiagnosticSummary()}`);
          character.remove();
          release();
        }, 30000);
      }).catch(error => {
        if (!cancelled) setStatus(`${error instanceof Error ? error.message : "Ara 3D engine unavailable"} · ${formatAraDiagnosticSummary()}`);
        release();
      });
    });
    return () => {
      cancelled = true;
      cancelQueued();
      window.clearTimeout(timeout);
      element?.remove();
      release();
    };
  }, [visible, previewRequested, id, name, retryKey, appearance?.preset, appearance?.outfit, appearance?.shoes, appearance?.carry]);

  return <div className="ara-npc-preview">
    <div className="ara-npc-canvas-host" ref={host} aria-label={name + " 3D preview"} />
    {!previewRequested && <><span className="ara-npc-status">{visible ? "3D preview is paused to keep the catalogue smooth" : "3D preview loads on request"}</span><button type="button" className="ara-npc-retry" disabled={!visible} onClick={() => { setStatus("Preparing preview…"); setPreviewRequested(true); }}>Load 3D preview</button></>}
    {previewRequested && status !== "REAL 3D CHARACTER · DRAG TO ROTATE" && <><span className="ara-npc-status">{status}</span><button type="button" className="ara-npc-retry" onClick={() => setRetryKey(value => value + 1)}>Retry 3D preview</button></>}
    {previewRequested && status === "REAL 3D CHARACTER · DRAG TO ROTATE" && <button type="button" className="ara-npc-retry" onClick={() => setPreviewRequested(false)}>Close 3D preview</button>}
    <span className="ara-npc-index">{String(index + 1).padStart(4, "0")}</span>
  </div>;
}
