import { useEffect, useRef, useState } from "react";
import { getAraCharacterAppearance } from "../lib/npcHumanFoundation";

type Props = { id: string; name: string; index: number; appearance?: { preset?: string; outfit?: string; shoes?: string; carry?: string } };

import { loadAraEngine } from "../lib/araEngine";

export function preloadAraEngine() { void loadAraEngine().catch(() => undefined); }

let activeCards = 0;
const waiting: Array<() => void> = [];
function pump() {
  while (activeCards < 3 && waiting.length) {
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
  return (hash >>> 0) || 1;
}

export default function AraCharacterCard({ id, name, index, appearance }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState("3D preview loads when visible");
  const [retryKey, setRetryKey] = useState(0);
  useEffect(() => {
    const node = host.current;
    if (!node || typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      setVisible(entries.some(entry => entry.isIntersecting));
    }, { rootMargin: "180px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !host.current) return;
    let cancelled = false;
    let element: HTMLElement | null = null;
    let hasSlot = false;
    let timeout = 0;
    let modelReady = false;
    const cancelQueued = requestSlot(() => {
      if (cancelled || !host.current) { releaseSlot(); return; }
      hasSlot = true;
      setStatus("Loading real 3D character…");
      void loadAraEngine().then(() => {
        if (cancelled || !host.current) { if (hasSlot) { releaseSlot(); hasSlot = false; } return; }
        const character = document.createElement("ara-character");
        const characterAppearance = { ...getAraCharacterAppearance(id), ...(appearance ?? {}) };
        // A stable seed gives each catalogue resident a repeatable procedural appearance.
        character.setAttribute("random", String(stableCharacterSeed(id)));
        character.setAttribute("animation", "idle");
        character.setAttribute("expression", "neutral");
        character.setAttribute("detail", "low");
        character.setAttribute("background", "#24232c");
        character.setAttribute("colors", `outfit: ${characterAppearance.outfit}; shoes: ${characterAppearance.shoes}; carry: ${characterAppearance.carry}`);
        character.setAttribute("look-at", "camera");
        character.setAttribute("auto-rotate", "");
        character.setAttribute("zoom", "");
        character.style.display = "block";
        character.style.width = "100%";
        character.style.height = "100%";
        character.setAttribute("aria-label", name + " 3D character");
        character.addEventListener("load", () => {
          modelReady = true;
          window.clearTimeout(timeout);
          setStatus("REAL 3D CHARACTER · DRAG TO ROTATE");
        }, { once: true });
        character.addEventListener("error", (event) => {
          window.clearTimeout(timeout);
          const detail = event instanceof CustomEvent
            ? event.detail as { message?: string } | undefined
            : undefined;
          setStatus(detail?.message ? `3D model error: ${detail.message}` : "3D character data unavailable · check connection");
          if (hasSlot) { releaseSlot(); hasSlot = false; }
        }, { once: true });
        host.current.replaceChildren(character);
        element = character;
        timeout = window.setTimeout(() => {
          if (cancelled || modelReady) return;
          setStatus("3D data is taking too long · scroll away and back to retry");
          character.remove();
          if (hasSlot) { releaseSlot(); hasSlot = false; }
        }, 30000);
      }).catch(() => {
        if (!cancelled) setStatus("Ara 3D engine unavailable · retry by scrolling back");
        if (hasSlot) { releaseSlot(); hasSlot = false; }
      });
    });
    return () => {
      cancelled = true;
      cancelQueued();
      window.clearTimeout(timeout);
      element?.remove();
      if (host.current) host.current.replaceChildren();
      if (hasSlot) { releaseSlot(); hasSlot = false; }
    };
  }, [visible, id, name, retryKey, appearance?.preset, appearance?.outfit, appearance?.shoes, appearance?.carry]);

  return <div className="ara-npc-preview">
    <div className="ara-npc-canvas-host" ref={host} aria-label={name + " 3D preview"} />
    {!visible && <span className="ara-npc-placeholder">3D character loads on scroll</span>}
    {visible && status !== "REAL 3D CHARACTER · DRAG TO ROTATE" && <><span className="ara-npc-status">{status}</span><button type="button" className="ara-npc-retry" onClick={() => setRetryKey(value => value + 1)}>Retry 3D preview</button></>}
    <span className="ara-npc-index">{String(index + 1).padStart(4, "0")}</span>
  </div>;
}
