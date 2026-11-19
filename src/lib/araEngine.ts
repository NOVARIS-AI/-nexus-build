const ARA_EMBED_URL = "https://cdn.jsdelivr.net/npm/ara3d@0.9.0/dist/embed.js";
let enginePromise: Promise<void> | null = null;

export function loadAraEngine(): Promise<void> {
  if (typeof window === "undefined" || typeof customElements === "undefined") {
    return Promise.reject(new Error("3D previews need a modern browser."));
  }
  if (customElements.get("ara-character")) return Promise.resolve();
  if (enginePromise) return enginePromise;

  enginePromise = new Promise<void>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>('script[data-ara-embed="true"]');
    let settled = false;
    let timeout = 0;

    const finish = () => {
      if (settled) return;
      customElements.whenDefined("ara-character").then(() => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        if (script) {
          script.dataset.araLoaded = "true";
          script.dataset.araState = "loaded";
        }
        resolve();
      }).catch(fail);
    };

    const fail = (reason: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      if (script && !customElements.get("ara-character")) {
        script.dataset.araState = "failed";
        script.remove();
      }
      reject(new Error(reason));
    };

    const onLoad = () => {
      if (script) {
        script.dataset.araLoaded = "true";
        script.dataset.araState = "loaded";
      }
      finish();
    };
    const onError = () => fail("Ara's 3D engine could not download. Check your connection and retry.");

    if (script?.dataset.araState === "failed") {
      script.remove();
      script = null;
    }

    if (!script) {
      const hint = document.createElement("link");
      hint.rel = "preconnect";
      hint.href = "https://cdn.jsdelivr.net";
      hint.crossOrigin = "anonymous";
      document.head.appendChild(hint);

      script = document.createElement("script");
      script.type = "module";
      script.src = ARA_EMBED_URL;
      script.dataset.araEmbed = "true";
      script.dataset.araState = "loading";
      script.addEventListener("load", onLoad, { once: true });
      script.addEventListener("error", onError, { once: true });
      document.head.appendChild(script);
    } else if (script.dataset.araLoaded === "true" || customElements.get("ara-character")) {
      finish();
    } else {
      script.addEventListener("load", onLoad, { once: true });
      script.addEventListener("error", onError, { once: true });
    }

    timeout = window.setTimeout(() => {
      fail("Ara's 3D engine did not start in time. Tap retry to download it again.");
    }, 25000);
  }).catch(error => {
    enginePromise = null;
    throw error;
  });

  return enginePromise;
}
