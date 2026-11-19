import { useEffect, useRef, useState } from "react";
import { seededHumanChoice } from "../lib/npcHumanFoundation";

type Props = { id: string; name: string; index: number };

let enginePromise: Promise<void> | null = null;
function loadAraEngine(): Promise<void> {
  if (customElements.get("ara-character")) return Promise.resolve();
  if (enginePromise) return enginePromise;
  enginePromise = new Promise<void>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>('script[data-ara-embed="true"]');
    const ready = () => {
      const timeout = window.setTimeout(() => reject(new Error("Ara 3D engine timed out.")), 15000);
      customElements.whenDefined("ara-character").then(() => {
        window.clearTimeout(timeout);
        resolve();
      }, reject);
    };
    if (script) {
      if (customElements.get("ara-character") || script.dataset.araLoaded === "true") ready();
      else {
        script.addEventListener("load", ready, { once: true });
        script.addEventListener("error", () => reject(new Error("Ara 3D engine could not load.")), { once: true });
      }
      return;
    }
    const hint = document.createElement("link");
    hint.rel = "preconnect";
    hint.href = "https://cdn.jsdelivr.net";
    hint.crossOrigin = "anonymous";
    document.head.appendChild(hint);
    script = document.createElement("script");
    script.type = "module";
    script.src = "https://cdn.jsdelivr.net/npm/ara3d@0/dist/embed.js";
    script.dataset.araEmbed = "true";
    script.addEventListener("load", () => { script!.dataset.araLoaded = "true"; ready(); }, { once: true });
    script.addEventListener("error", () => reject(new Error("Ara 3D engine could not load.")), { once: true });
    document.head.appendChild(script);
  }).catch(error => { enginePromise = null; throw error; });
  return enginePromise;
}

let activeCards = 0;
const waiting: Array<() => void> = [];
function pump() {
  while (activeCards < 4 && waiting.length) {
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

export default function AraCharacterCard({ id, name, index }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState("3D preview loads when visible");
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
    const cancelQueued = requestSlot(() => {
      if (cancelled || !host.current) { releaseSlot(); return; }
      hasSlot = true;
      setStatus("Loading real 3D character…");
      void loadAraEngine().then(() => {
        if (cancelled || !host.current) { if (hasSlot) { releaseSlot(); hasSlot = false; } return; }
        const character = document.createElement("ara-character");
        const presets = ["The Female Executive", "The Adventurer", "The Detective", "The Athlete"];
        const outfit = ["#6685a8", "#a66d69", "#668b75", "#b18a57", "#8675a8", "#5f9294", "#9a718f", "#8a795f"];
        const shoes = ["#29252b", "#343c4c", "#4b3d35", "#293c38"];
        character.setAttribute("preset", seededHumanChoice(id + "-preset", presets));
        character.setAttribute("animation", "idle");
        character.setAttribute("expression", "neutral");
        character.setAttribute("detail", "low");
        character.setAttribute("background", "#24232c");
        character.setAttribute("colors", `outfit: ${seededHumanChoice(id + "-outfit", outfit)}; shoes: ${seededHumanChoice(id + "-shoes", shoes)}; carry: #8a6549`);
        character.setAttribute("auto-rotate", "");
        character.style.display = "block";
        character.style.width = "100%";
        character.style.height = "100%";
        character.setAttribute("aria-label", name + " 3D character");
        character.addEventListener("load", () => setStatus("REAL 3D CHARACTER · DRAG TO ROTATE"), { once: true });
        character.addEventListener("error", () => {
          setStatus("3D character unavailable · check connection");
          if (hasSlot) { releaseSlot(); hasSlot = false; }
        }, { once: true });
        host.current.replaceChildren(character);
        element = character;
        timeout = window.setTimeout(() => {
          if (cancelled) return;
          if (host.current?.contains(character) && !character.isConnected) setStatus("3D preview could not start");
        }, 18000);
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
  }, [visible, id, name]);

  return <div className="ara-npc-preview" ref={host}>
    {!visible && <span className="ara-npc-placeholder">3D character loads on scroll</span>}
    {visible && status !== "REAL 3D CHARACTER · DRAG TO ROTATE" && <span className="ara-npc-status">{status}</span>}
    <span className="ara-npc-index">{String(index + 1).padStart(4, "0")}</span>
  </div>;
}
