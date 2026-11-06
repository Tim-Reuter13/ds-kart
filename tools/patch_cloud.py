import os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site", "js"))


def edit(p, pairs):
    s = open(p, encoding="utf8").read()
    for a, b in pairs:
        if a not in s:
            raise SystemExit("NICHT GEFUNDEN in %s: %s" % (p, a[:90]))
        s = s.replace(a, b)
    open(p, "w", encoding="utf8").write(s)


edit("audiostore.js", [
    ('  async save(profile, id, blob) { await tx("readwrite", s => s.put({ blob, at: Date.now() }, profile + "|" + id)); },',
     '  async save(profile, id, blob, at) { await tx("readwrite", s => s.put({ blob, at: at || Date.now() }, profile + "|" + id)); },\n  addProfiles(names) { const m = meta(); let ch = false; for (const n of names) if (n && !m.profiles.includes(n)) { m.profiles.push(n); ch = true; } if (ch) saveMeta(m); },'),
])
edit("audioui.js", [
    ('import { catalog } from "./sounds.js";', 'import { catalog } from "./sounds.js";\nimport { Cloud } from "./cloud.js";'),
    ("""  async function loadActive() {
    clips = await AudioStore.load(AudioStore.active());
    await audio.loadProfile(clips);
  }
  loadActive().catch(e => console.warn("Audio-Profil laden", e));""", """  let cloudMsg = "";
  async function loadActive() {
    try {
      AudioStore.addProfiles(await Cloud.profilesInCloud());
      const n = await Cloud.pull(AudioStore, AudioStore.active());
      cloudMsg = n ? `☁ ${n} Aufnahme(n) aus der Cloud geladen` : "☁ aktuell";
    } catch (e) { cloudMsg = "☁ offline"; }
    clips = await AudioStore.load(AudioStore.active());
    await audio.loadProfile(clips);
    renderCloud();
  }
  loadActive().catch(e => console.warn("Audio-Profil laden", e));

  // Cloud-Zeile (GitHub)
  const cl = document.createElement("div");
  cl.className = "abar"; cl.id = "aCloud";
  cl.innerHTML = `<span id="cStat" class="small"></span><button class="btn sm" id="cTok">🔑 GitHub-Token</button><button class="btn sm" id="cPush">☁ Jetzt hochladen</button>`;
  document.querySelector("#aTabs").before(cl);
  function renderCloud() {
    const has = !!Cloud.token();
    const s = document.querySelector("#cStat"); if (!s) return;
    s.textContent = (has ? "Cloud: an – neue Aufnahmen werden automatisch hochgeladen. " : "Cloud: nur lesen (kein Token) – Aufnahmen bleiben auf diesem PC. ") + cloudMsg;
    document.querySelector("#cPush").style.display = has ? "" : "none";
  }
  let syncT = null;
  function scheduleSync() {
    if (!Cloud.token()) return;
    clearTimeout(syncT);
    cloudMsg = "☁ lade gleich hoch …"; renderCloud();
    syncT = setTimeout(syncNow, 3000);
  }
  async function syncNow() {
    cloudMsg = "☁ lade hoch …"; renderCloud();
    try { const n = await Cloud.push(AudioStore, AudioStore.active()); cloudMsg = `☁ hochgeladen (${n} Datei(en)) – in ca. 1 Minute auf allen Geräten`; }
    catch (e) { cloudMsg = "☁ Fehler: " + e.message; }
    renderCloud();
  }
  document.querySelector("#cPush").onclick = syncNow;
  document.querySelector("#cTok").onclick = () => {
    const t = prompt("GitHub-Token einfügen (Fine-grained, nur Repo ds-kart, Contents: Read and write).\\nLeer lassen = Token entfernen.", Cloud.token() ? "••••••••" : "");
    if (t === null || t === "••••••••") return;
    Cloud.setToken(t); renderCloud(); if (t) syncNow();
  };"""),
    ("""    await audio.setClip(it.id, blob);
    renderList();
    audio.preview(it);
  }""", """    await audio.setClip(it.id, blob);
    renderList();
    audio.preview(it);
    scheduleSync();
  }"""),
    ("""    if (b.dataset.a === "reset") { await AudioStore.remove(AudioStore.active(), it.id); clips.delete(it.id); await audio.setClip(it.id, null); renderList(); }""",
     """    if (b.dataset.a === "reset") { await AudioStore.remove(AudioStore.active(), it.id); clips.delete(it.id); await audio.setClip(it.id, null); renderList(); scheduleSync(); }"""),
    ("""  function open(from) { back = from || "lobby"; audio.ensure(); renderBar(); renderList(); show("audio"); }""",
     """  function open(from) { back = from || "lobby"; audio.ensure(); renderBar(); renderList(); renderCloud(); show("audio"); }"""),
])
print("ok")
