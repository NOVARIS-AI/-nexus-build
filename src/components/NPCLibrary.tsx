import type { HumanConfig } from "humanforge/human";
import { useCallback, useEffect, useRef, useState } from "react";
import HumanForgeStudio from "./HumanForgeStudio";
import NPCProductionHub from "./NPCProductionHub";
import CharacterTemplateStudio from "./CharacterTemplateStudio";
import { getAraCharacterAppearance } from "../lib/npcHumanFoundation";
import { loadAraEngine } from "../lib/araEngine";

type CharacterSettings = {
  preset: string;
  animation: string;
  expression: string;
  detail: string;
  outfit: string;
  shoes: string;
  carry: string;
  share: string;
};

const DEFAULTS: CharacterSettings = {
  preset: "The Female Executive",
  animation: "idle",
  expression: "happy",
  detail: "low",
  outfit: "#b58c67",
  shoes: "#29252b",
  carry: "#8a6549",
  share: "",
};

declare global {
  interface HTMLElementTagNameMap {
    "ara-character": HTMLElement;
  }
}


function validAraShare(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && url.hostname === "ara3dgen.com" && url.pathname.startsWith("/app/") && url.hash.includes("c=");
  } catch {
    return false;
  }
}

function AraCharacterStudio({ selectedNpc }: { selectedNpc?: { id: string; name: string; role: string; appearance?: { preset?: string; outfit?: string; shoes?: string; carry?: string; description?: string; humanConfig?: Partial<HumanConfig>; dailySchedule?: string; behaviourNotes?: string } } | null }) {
  const characterDefaults: CharacterSettings = selectedNpc
    ? { ...DEFAULTS, ...getAraCharacterAppearance(selectedNpc.id), ...(selectedNpc.appearance ?? {}), expression: "neutral" }
    : DEFAULTS;
  const host = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Preparing 3D preview…");
  const [attempt, setAttempt] = useState(0);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [draft, setDraft] = useState<CharacterSettings>(characterDefaults);
  const [applied, setApplied] = useState<CharacterSettings>(characterDefaults);
  const [message, setMessage] = useState("Choose the appearance options, then apply them to the live model.");

  const mountCharacter = useCallback(async () => {
    setModelLoaded(false);
    setStatus("Connecting to 3D engine…");
    try {
      await loadAraEngine();
      if (!host.current) return;

      const character = document.createElement("ara-character");
      if (applied.share) {
        character.setAttribute("share", applied.share);
      } else {
        character.setAttribute("preset", applied.preset);
      }
      character.setAttribute("animation", applied.animation);
      character.setAttribute("expression", applied.expression);
      character.setAttribute("detail", applied.detail);
      character.setAttribute("background", "#24232c");
      character.setAttribute("colors", `outfit: ${applied.outfit}; shoes: ${applied.shoes}; carry: ${applied.carry}`);
      character.setAttribute("auto-rotate", "");
      character.setAttribute("zoom", "");
      character.style.display = "block";
      character.style.width = "100%";
      character.style.height = "100%";

      const modelTimeout = window.setTimeout(() => {
        setStatus("Still loading character data… check your connection.");
      }, 10000);
      character.addEventListener("load", () => {
        window.clearTimeout(modelTimeout);
        setModelLoaded(true);
        setStatus("3D CHARACTER READY · DRAG TO ROTATE");
      }, { once: true });
      character.addEventListener("error", (event) => {
        window.clearTimeout(modelTimeout);
        const detail = event instanceof CustomEvent ? event.detail as { message?: string } | undefined : undefined;
        setStatus(detail?.message ? `Character data error: ${detail.message}` : "Character data did not load. Tap Retry.");
      }, { once: true });
      host.current.replaceChildren(character);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "3D preview unavailable. Check your connection.");
    }
  }, [applied]);

  useEffect(() => {
    void mountCharacter();
    return () => {
      if (host.current) host.current.replaceChildren();
    };
  }, [mountCharacter, attempt]);

  const update = (key: keyof CharacterSettings, value: string) => {
    setDraft(current => ({ ...current, [key]: value }));
  };

  const applySettings = () => {
    if (draft.share && !validAraShare(draft.share)) {
      setMessage("That link doesn't look like an Ara character share link. Open Ara Builder → Share → Copy link, then paste the full link here.");
      return;
    }
    setApplied({ ...draft, share: draft.share.trim() });
    setMessage(draft.share ? "Imported your Ara character design. Rebuilding the live preview…" : "Appearance settings applied. Rebuilding the live preview…");
  };

  const resetSettings = () => {
    setDraft(characterDefaults);
    setApplied(characterDefaults);
    setMessage("Back to the starter character.");
  };

  return <section className="npc-library">
    <div className="npc-library-head">
      <div>
        <div className="eyebrow">CHARACTER ASSET LIBRARY</div>
        <h2>NPC Library & Character Studio</h2>
        <p>Create and customise reusable 3D people for game projects. Characters are only added to a game when its developer chooses them.</p>
      </div>
      <span className="npc-library-count">LIVE 3D CHARACTER PREVIEW</span>
    </div>

    <div className="npc-studio-layout">
      <article className="npc-asset-card">
        <div className="npc-asset-preview">
          <div className="npc-preview-label">INTERACTIVE 3D VIEWPORT</div>
          <div className="npc-preview-stage" ref={host} />
          {!modelLoaded && <div className="npc-preview-loading" role="status"><span className="npc-loading-orb" /><b>{status}</b><small>Low detail is selected for a faster first preview. An internet connection is needed for the model data.</small><button type="button" onClick={() => setAttempt(value => value + 1)}>Retry preview</button></div>}
          {modelLoaded && <span className="npc-preview-hint">{status} · Pinch/scroll to zoom</span>}
        </div>
        <div className="npc-asset-info">
          <div className="npc-asset-title">
            <div><h3>{selectedNpc ? `${selectedNpc.name} · ${selectedNpc.role}` : "Amara · City Administrator"}</h3><p>{selectedNpc ? "Selected NPC · matched Ara 3D preview" : "Reusable human NPC · sample character"}</p></div>
            <span className="npc-asset-tag">{selectedNpc ? "SELECTED NPC" : "EDITABLE SAMPLE"}</span>
          </div>
          <div className="npc-asset-tags"><span>Real human mesh</span><span>Rigged</span><span>Animated</span><span>{applied.detail} detail</span></div>
          <p className="npc-asset-description">{selectedNpc ? selectedNpc.appearance?.description ? "AI appearance brief: " + selectedNpc.appearance.description + ". Ara applies the saved starter preset and colour choices; the brief remains saved as character metadata." : "This is the same Ara preset and deterministic appearance used for this NPC in the Library. Customise it here or import a saved Ara share design." : "Edit the sample below, or import a complete character design from Ara. The model can be rotated and zoomed in this viewport."}</p>
          <div className="npc-asset-meta"><span>MODEL <b>Ara 3D · CC0 character data</b></span><span>PREVIEW <b>{modelLoaded ? "Ready" : "Loading"}</b></span></div>
        </div>
      </article>

      <aside className="npc-editor-panel">
        <div className="npc-editor-title"><div><span className="eyebrow">APPEARANCE WORKSHOP</span><h3>Character settings</h3></div><span className="npc-live-pill">LIVE EDITOR</span></div>
        <label className="npc-field">Starting character
          <select value={draft.preset} onChange={event => update("preset", event.target.value)} disabled={!!draft.share}>
            <option>The Female Executive</option><option>The Adventurer</option><option>The Detective</option><option>The Athlete</option>
          </select>
        </label>
        <div className="npc-field-grid">
          <label className="npc-field">Expression
            <select value={draft.expression} onChange={event => update("expression", event.target.value)}>
              <option value="neutral">Neutral</option><option value="happy">Happy</option><option value="surprised">Surprised</option><option value="determined">Determined</option><option value="sad">Sad</option><option value="angry">Angry</option>
            </select>
          </label>
          <label className="npc-field">Animation
            <select value={draft.animation} onChange={event => update("animation", event.target.value)}>
              <option value="idle">Idle</option><option value="wave">Wave</option><option value="walk 3s, idle">Walk</option><option value="look_around">Look around</option><option value="talk_gestures">Talk gestures</option>
            </select>
          </label>
        </div>
        <label className="npc-field">Preview quality
          <select value={draft.detail} onChange={event => update("detail", event.target.value)}>
            <option value="low">Low · fastest</option><option value="medium">Medium · balanced</option><option value="high">High · most detail</option>
          </select>
        </label>
        <div className="npc-colour-group">
          <b>Clothing & accessory colours</b>
          <div className="npc-colour-row">
            <label>Outfit <input type="color" value={draft.outfit} onChange={event => update("outfit", event.target.value)} /></label>
            <label>Shoes <input type="color" value={draft.shoes} onChange={event => update("shoes", event.target.value)} /></label>
            <label>Bag / item <input type="color" value={draft.carry} onChange={event => update("carry", event.target.value)} /></label>
          </div>
          <small>Colours apply when the selected character has those clothing or accessory parts.</small>
        </div>
        <div className="npc-import-box">
          <b>Skin, eyes, face, hair & full outfit</b>
          <p>Open Ara Builder for the full editor. Change skin tone, eye colour, face details, hair and clothing there. Copy its Share link and paste it below to bring the exact design back into NEXUS BUILD.</p>
          <a href="https://ara3dgen.com/app/" target="_blank" rel="noreferrer">Open Ara Character Builder ↗</a>
          <label className="npc-field">Ara Share link
            <input type="url" value={draft.share} onChange={event => update("share", event.target.value)} placeholder="https://ara3dgen.com/app/#c=…" />
          </label>
          {draft.share && <button className="npc-text-button" type="button" onClick={() => { update("share", ""); setMessage("Ara import cleared. Choose a starter character again."); }}>Clear imported design</button>}
        </div>
        <div className="npc-editor-actions">
          <button type="button" className="npc-apply-button" onClick={applySettings}>Apply to 3D preview</button>
          <button type="button" className="npc-reset-button" onClick={resetSettings}>Reset</button>
        </div>
        <p className="npc-editor-message">{message}</p>
      </aside>
    </div>

    <div className="npc-tools-strip">
      <div><b>More free character tools</b><p>Extra tools for creating assets and bringing them into your game workflow.</p></div>
      <a href="https://www.makehumancommunity.org/" target="_blank" rel="noreferrer">MakeHuman <small>Desktop character creator</small></a>
      <a href="https://static.makehumancommunity.org/mpfb/index.html" target="_blank" rel="noreferrer">MPFB for Blender <small>Blender human creation add-on</small></a>
      <a href="https://github.com/abdulrehman043/humanforge" target="_blank" rel="noreferrer">HumanForge <small>Open-source avatar SDK · experimental</small></a>
    </div>

    <div className="npc-library-note npc-library-note-wide">
      <div className="npc-note-icon">✦</div>
      <b>Growing the NPC catalogue</b>
      <p>The resident index now contains 1,200+ profiles with streamed Ara 3D previews. Each generated resident opens in the in-app HumanForge 3D creator with an AI-selected starting appearance; Ara remains available as an alternate preview engine.</p>
    </div>
  </section>;
}


export default function NPCLibrary({ selectedNpc, onBack }: { selectedNpc?: { id: string; name: string; role: string; personality?: string; routine?: string; appearance?: { preset?: string; outfit?: string; shoes?: string; carry?: string; description?: string; characterFamily?: string; species?: string; visualStyle?: string; assetStatus?: string; characterDesign?: Record<string, unknown> } } | null; onBack?: () => void }) {
  const [studio, setStudio] = useState<"humanforge" | "ara">("humanforge");
  return <section className="npc-library-shell">
    {selectedNpc && <button type="button" className="npc-library-back" onClick={onBack}>← Back to NPC Library</button>}
    {selectedNpc?.appearance?.characterFamily && selectedNpc.appearance.characterFamily !== "humanoid" ? <CharacterTemplateStudio selectedNpc={selectedNpc} /> : <>
      <div className="npc-studio-switch" role="tablist" aria-label="Character creator">
        <button type="button" role="tab" aria-selected={studio === "humanforge"} className={studio === "humanforge" ? "active" : ""} onClick={() => setStudio("humanforge")}>In-app Human Creator</button>
        <button type="button" role="tab" aria-selected={studio === "ara"} className={studio === "ara" ? "active" : ""} onClick={() => setStudio("ara")}>Ara 3D Studio</button>
      </div>
      {studio === "humanforge" ? <HumanForgeStudio selectedNpc={selectedNpc} /> : <AraCharacterStudio selectedNpc={selectedNpc} />}
    </>}
    <NPCProductionHub />
  </section>;
}
