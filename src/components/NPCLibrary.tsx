import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface HTMLElementTagNameMap {
    "ara-character": HTMLElement;
  }
}

let araEnginePromise: Promise<void> | null = null;

function loadAraEngine(): Promise<void> {
  if (customElements.get("ara-character")) return Promise.resolve();
  if (araEnginePromise) return araEnginePromise;

  araEnginePromise = new Promise<void>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>('script[data-ara-embed="true"]');
    const waitForElement = () => {
      const timeout = window.setTimeout(() => reject(new Error("The 3D engine took too long to start.")), 12000);
      customElements.whenDefined("ara-character").then(() => {
        window.clearTimeout(timeout);
        resolve();
      }).catch(reject);
    };

    if (script) {
      if (script.dataset.araLoaded === "true" || customElements.get("ara-character")) {
        waitForElement();
      } else {
        script.addEventListener("load", () => {
          script!.dataset.araLoaded = "true";
          waitForElement();
        }, { once: true });
        script.addEventListener("error", () => reject(new Error("Could not download the 3D engine.")), { once: true });
      }
      return;
    }

    // Warm up the CDN connection before downloading the character engine.
    for (const rel of ["preconnect", "dns-prefetch"]) {
      const hint = document.createElement("link");
      hint.rel = rel;
      hint.href = "https://cdn.jsdelivr.net";
      if (rel === "preconnect") hint.crossOrigin = "anonymous";
      document.head.appendChild(hint);
    }

    script = document.createElement("script");
    script.type = "module";
    script.src = "https://cdn.jsdelivr.net/npm/ara3d@0/dist/embed.js";
    script.dataset.araEmbed = "true";
    script.addEventListener("load", () => {
      script!.dataset.araLoaded = "true";
      waitForElement();
    }, { once: true });
    script.addEventListener("error", () => reject(new Error("Could not download the 3D engine.")), { once: true });
    document.head.appendChild(script);
  }).catch(error => {
    araEnginePromise = null;
    throw error;
  });

  return araEnginePromise;
}

export default function NPCLibrary() {
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Preparing 3D preview…");
  const [attempt, setAttempt] = useState(0);
  const [modelLoaded, setModelLoaded] = useState(false);

  const mountCharacter = useCallback(async () => {
    setModelLoaded(false);
    setStatus("Connecting to 3D engine…");
    try {
      await loadAraEngine();
      if (!host.current) return;

      const character = document.createElement("ara-character");
      character.setAttribute("preset", "The Female Executive");
      // Start with one lightweight idle animation; extra motions can be selected later.
      character.setAttribute("animation", "idle");
      character.setAttribute("expression", "happy");
      character.setAttribute("detail", "medium");
      character.setAttribute("background", "#24232c");
      character.setAttribute("auto-rotate", "");
      character.setAttribute("zoom", "");
      character.style.display = "block";
      character.style.width = "100%";
      character.style.height = "100%";

      let settled = false;
      const modelTimeout = window.setTimeout(() => {
        if (!settled) setStatus("Still loading the character data… check your connection.");
      }, 10000);
      character.addEventListener("load", () => {
        settled = true;
        window.clearTimeout(modelTimeout);
        setModelLoaded(true);
        setStatus("3D CHARACTER READY · DRAG TO ROTATE");
      }, { once: true });
      character.addEventListener("error", () => {
        settled = true;
        window.clearTimeout(modelTimeout);
        setStatus("Character data did not load. Tap Retry.");
      }, { once: true });

      host.current.replaceChildren(character);
      // Some browsers dispatch the custom-element load event before React attaches listeners.
      // Keep a bounded fallback message instead of leaving an endless spinner.
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "3D preview unavailable. Check your connection.");
    }
  }, []);

  useEffect(() => {
    void mountCharacter();
    return () => {
      if (host.current) host.current.replaceChildren();
    };
  }, [mountCharacter, attempt]);

  return <section className="npc-library">
    <div className="npc-library-head">
      <div>
        <div className="eyebrow">CHARACTER ASSET LIBRARY</div>
        <h2>NPC Library</h2>
        <p>Real, reusable 3D characters for game projects. Developers choose which NPCs to add; nothing is placed automatically.</p>
      </div>
      <span className="npc-library-count">LIVE 3D CHARACTER PREVIEW</span>
    </div>
    <div className="npc-library-grid">
      <article className="npc-asset-card">
        <div className="npc-asset-preview">
          <div className="npc-preview-label">INTERACTIVE 3D VIEWPORT</div>
          <div className="npc-preview-stage" ref={host} />
          {!modelLoaded && <div className="npc-preview-loading" role="status"><span className="npc-loading-orb" /><b>{status}</b><small>First load needs an internet connection. Medium detail is selected for a quicker start.</small><button type="button" onClick={() => setAttempt(value => value + 1)}>Retry preview</button></div>}
          {modelLoaded && <span className="npc-preview-hint">{status} · Pinch/scroll to zoom</span>}
        </div>
        <div className="npc-asset-info">
          <div className="npc-asset-title">
            <div><h3>Amara · City Administrator</h3><p>Human NPC · public services and city scenes</p></div>
            <span className="npc-asset-tag">LIBRARY SAMPLE</span>
          </div>
          <div className="npc-asset-tags"><span>Real human mesh</span><span>Rigged skeleton</span><span>Animated</span><span>Medium detail</span></div>
          <p className="npc-asset-description">A real 3D human character generated from the Ara character system, with a full rig, facial features and animation support. Drag the model to rotate it; use pinch or scroll to zoom.</p>
          <div className="npc-asset-meta"><span>MODEL <b>Ara 3D · CC0 character data</b></span><span>PREVIEW <b>{modelLoaded ? "Ready" : "Loading"}</b></span></div>
          <a className="npc-open-builder" href="https://ara3dgen.com/app/" target="_blank" rel="noreferrer">Customise this character in the 3D builder ↗</a>
        </div>
      </article>
      <div className="npc-library-note">
        <div className="npc-note-icon">✦</div>
        <b>1,000+ NPC library target</b>
        <p>This is one real rigged 3D character preview. The larger library will grow through reusable presets, custom character variations, outfits, roles and animation sets. We will not label the catalogue as 1,000 assets until those assets actually exist.</p>
        <div className="npc-note-stats"><span><b>1</b> live 3D sample</span><span><b>1,000+</b> target catalogue</span></div>
      </div>
    </div>
  </section>;
}
