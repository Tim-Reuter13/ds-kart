// Speichert Audio-Profile und Aufnahmen dauerhaft im Browser (IndexedDB)
const DB = "dskart-audio", STORE = "clips";
let dbp = null;
function db() {
  return dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => res(out && "result" in out ? out.result : out);
    t.onerror = () => rej(t.error);
  });
}
const LS = "dskart_audio_profiles";
function meta() {
  try { const m = JSON.parse(localStorage.getItem(LS)); if (m && m.profiles?.length) return m; } catch (e) {}
  return { profiles: ["Unser Dub"], active: "Unser Dub" };
}
function saveMeta(m) { try { localStorage.setItem(LS, JSON.stringify(m)); } catch (e) {} }

export const AudioStore = {
  profiles() { return meta().profiles; },
  active() { return meta().active; },
  setActive(name) { const m = meta(); if (m.profiles.includes(name)) { m.active = name; saveMeta(m); } },
  create(name) {
    const m = meta(); name = name.trim().slice(0, 24);
    if (!name || m.profiles.includes(name)) return false;
    m.profiles.push(name); m.active = name; saveMeta(m); return true;
  },
  async rename(oldName, name) {
    const m = meta(); name = name.trim().slice(0, 24);
    if (!name || m.profiles.includes(name)) return false;
    const clips = await this.load(oldName);
    for (const [id, c] of clips) { await this.save(name, id, c.blob); await this.remove(oldName, id); }
    m.profiles = m.profiles.map(p => p === oldName ? name : p);
    if (m.active === oldName) m.active = name;
    saveMeta(m); return true;
  },
  async drop(name) {
    const m = meta();
    if (m.profiles.length <= 1) return false;
    const clips = await this.load(name);
    for (const id of clips.keys()) await this.remove(name, id);
    m.profiles = m.profiles.filter(p => p !== name);
    if (m.active === name) m.active = m.profiles[0];
    saveMeta(m); return true;
  },
  async save(profile, id, blob, at) { await tx("readwrite", s => s.put({ blob, at: at || Date.now() }, profile + "|" + id)); },
  addProfiles(names) { const m = meta(); let ch = false; for (const n of names) if (n && !m.profiles.includes(n)) { m.profiles.push(n); ch = true; } if (ch) saveMeta(m); },
  async remove(profile, id) { await tx("readwrite", s => s.delete(profile + "|" + id)); },
  // Map id -> {blob, at}
  async load(profile) {
    const d = await db();
    return new Promise((res, rej) => {
      const out = new Map();
      const t = d.transaction(STORE, "readonly");
      const cur = t.objectStore(STORE).openCursor();
      cur.onsuccess = () => {
        const c = cur.result;
        if (!c) return;
        const [p, id] = String(c.key).split("|");
        if (p === profile) out.set(id, c.value);
        c.continue();
      };
      t.oncomplete = () => res(out);
      t.onerror = () => rej(t.error);
    });
  },
};
