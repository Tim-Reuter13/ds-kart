// Audio-Profile in der Cloud: Dateien liegen im GitHub-Repo unter site/audio/ und werden
// ueber GitHub Pages ausgeliefert (lesen ohne Login). Schreiben braucht einen Token mit
// "Contents: Read and write" nur fuer dieses Repo; der Token bleibt im Browser dieses PCs.
const REPO = "Tim-Reuter13/ds-kart", BRANCH = "main", DIR = "site/audio";
const API = "https://api.github.com/repos/" + REPO;
const KEY = "dskart_gh_token";

const safe = (s) => String(s).normalize("NFKD").replace(/[^\w.-]+/g, "_").slice(0, 40) || "profil";
const ext = (mime) => /webm/.test(mime) ? "webm" : /mp4|aac|m4a/.test(mime) ? "m4a" : /wav/.test(mime) ? "wav" : /ogg/.test(mime) ? "ogg" : "bin";
async function b64(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = ""; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return btoa(s);
}

export const Cloud = {
  token() { try { return localStorage.getItem(KEY) || ""; } catch (e) { return ""; } },
  setToken(t) { try { t ? localStorage.setItem(KEY, t.trim()) : localStorage.removeItem(KEY); } catch (e) {} },
  status: "",

  // Manifest von GitHub Pages (oeffentlich, ohne Login)
  async manifest() {
    try {
      const r = await fetch("audio/index.json?t=" + Date.now(), { cache: "no-store" });
      if (!r.ok) return { profiles: {} };
      return await r.json();
    } catch (e) { return { profiles: {} }; }
  },

  // Neuere Aufnahmen aus der Cloud in den lokalen Speicher holen
  async pull(store, profile) {
    const m = await this.manifest();
    const remote = m.profiles?.[profile];
    if (!remote) return 0;
    const local = await store.load(profile);
    let n = 0;
    for (const [id, e] of Object.entries(remote)) {
      const l = local.get(id);
      if (l && l.at >= e.at) continue;
      try {
        const r = await fetch("audio/" + e.path + "?v=" + e.at, { cache: "no-store" });
        if (!r.ok) continue;
        await store.save(profile, id, new Blob([await r.arrayBuffer()], { type: e.mime || "" }), e.at);
        n++;
      } catch (x) {}
    }
    return n;
  },
  async profilesInCloud() { const m = await this.manifest(); return Object.keys(m.profiles || {}); },

  async gh(path, opts = {}) {
    const r = await fetch(API + path, { ...opts, headers: { Authorization: "Bearer " + this.token(), Accept: "application/vnd.github+json", "Content-Type": "application/json", ...(opts.headers || {}) } });
    if (!r.ok) throw new Error(`GitHub ${r.status}: ${(await r.text()).slice(0, 120)}`);
    return r.json();
  },

  // Ein Profil komplett hochladen (ein Commit). Geloeschte Aufnahmen verschwinden auch in der Cloud.
  async push(store, profile) {
    if (!this.token()) throw new Error("Kein GitHub-Token hinterlegt");
    const local = await store.load(profile);
    const ref = await this.gh(`/git/ref/heads/${BRANCH}`);
    const head = await this.gh(`/git/commits/${ref.object.sha}`);
    // aktuelles Manifest direkt aus dem Repo (Pages kann hinterherhinken)
    let man = { profiles: {} };
    try { const f = await this.gh(`/contents/${DIR}/index.json?ref=${BRANCH}`); man = JSON.parse(decodeURIComponent(escape(atob(f.content.replace(/\n/g, ""))))); } catch (e) {}
    const old = man.profiles[profile] || {};
    const dir = safe(profile);
    const entries = [], next = {};
    for (const [id, c] of local) {
      const path = `${dir}/${id}.${ext(c.blob.type)}`;
      next[id] = { path, at: c.at, mime: c.blob.type };
      if (old[id] && old[id].at === c.at && old[id].path === path) continue;
      const blob = await this.gh("/git/blobs", { method: "POST", body: JSON.stringify({ content: await b64(c.blob), encoding: "base64" }) });
      entries.push({ path: `${DIR}/${path}`, mode: "100644", type: "blob", sha: blob.sha });
      if (old[id] && old[id].path !== path) entries.push({ path: `${DIR}/${old[id].path}`, mode: "100644", type: "blob", sha: null });
    }
    for (const [id, e] of Object.entries(old)) if (!local.has(id)) entries.push({ path: `${DIR}/${e.path}`, mode: "100644", type: "blob", sha: null });
    if (!entries.length && JSON.stringify(old) === JSON.stringify(next)) return 0;
    man.profiles[profile] = next; man.updated = Date.now();
    entries.push({ path: `${DIR}/index.json`, mode: "100644", type: "blob", content: JSON.stringify(man, null, 1) });
    const tree = await this.gh("/git/trees", { method: "POST", body: JSON.stringify({ base_tree: head.tree.sha, tree: entries }) });
    const commit = await this.gh("/git/commits", { method: "POST", body: JSON.stringify({ message: `Audio-Profil „${profile}“ aktualisiert`, tree: tree.sha, parents: [ref.object.sha] }) });
    await this.gh(`/git/refs/heads/${BRANCH}`, { method: "PATCH", body: JSON.stringify({ sha: commit.sha }) });
    return entries.length - 1;
  },
};
