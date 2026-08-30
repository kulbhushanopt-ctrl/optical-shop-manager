// Fetches the live index.html (bypassing any cache) and compares its
// build id against the one this page booted with (see vite.config.js) --
// tells the caller whether a newer deploy is available. An installed
// Android PWA in particular doesn't always re-check for updates on its
// own, so without this a device can keep running old code indefinitely
// even after a fix has shipped, with no sign anything's stale.
export async function isUpdateAvailable() {
  try {
    const res = await fetch(`/index.html?_=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return false;
    const html = await res.text();
    const match = html.match(/__BUILD_ID__\s*=\s*"([^"]+)"/);
    const liveBuildId = match?.[1];
    return !!liveBuildId && !!window.__BUILD_ID__ && liveBuildId !== window.__BUILD_ID__;
  } catch {
    return false;
  }
}
