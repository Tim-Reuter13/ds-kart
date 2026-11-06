// Katalog aller Geraeusche, die man im Audio-Profil ersetzen kann
import { DRIVERS } from "./cars.js";
import { clean } from "./family.js";

export const SFX = [
  ["letsgo", "Ansage „Let's go!“ (Sonja)", "Kommt beim Start jedes Rennens zusammen mit dem Startsignal – Sonja spricht das ein!"],
  ["beep", "Countdown-Piep", "Die drei Pieptöne vor dem Start (3 … 2 … 1)."],
  ["go", "Startsignal", "Wenn das Rennen losgeht – „LOS!“"],
  ["box", "Item-Kiste", "Beim Durchfahren einer Item-Kiste."],
  ["got", "Item bekommen", "Wenn die Item-Lotterie stoppt."],
  ["boost", "Boost", "Energy, Kurze, Drift-Boost, Raketenstart."],
  ["spark", "Drift-Funken", "Jede neue Glut-Stufe beim Driften."],
  ["hit", "Getroffen", "Wenn dein Auto rumgeschleudert wird."],
  ["wall", "Wand streifen", "Leichtes Streifen an der Begrenzung."],
  ["crash", "Crash", "Harter Aufprall gegen Hecke, Zaun oder Mauer bei hohem Tempo."],
  ["bump", "Zusammenprall", "Wenn zwei Autos aneinanderstoßen."],
  ["land", "Aufsetzen", "Wenn das Auto nach einem Sprung auf den Boden knallt."],
  ["throw", "Wurf", "Kräuterschnaps nach vorne werfen."],
  ["drop", "Ablegen", "Kippenschachtel oder Bierkasten hinter sich lassen."],
  ["pfand", "Pfandflasche", "Beim Einsammeln einer Pfandflasche (+25 ct)."],
  ["camera", "Blitzer", "Wenn jemand den Blitzer zündet."],
  ["siren", "Ordnungsamt-Sirene", "Das Ordnungsamt jagt den Ersten."],
  ["kontrolle", "Kontrolle!", "Das Ordnungsamt hat den Ersten erwischt."],
  ["vape", "Vape-Zug", "Jemand bläst eine Vape-Wolke raus."],
  ["blind", "Vape im Gesicht", "Dir nimmt die Wolke die Sicht."],
  ["lighter", "Feuerzeug", "Kippe anzünden."],
  ["doener", "Döner-Power", "Döner mit alles – unverwundbar."],
  ["splash", "Platsch", "Ins Wasser gefallen."],
  ["trick", "Sprung-Trick", "Trick in der Luft."],
  ["finish", "Ziel", "Über die Ziellinie."],
  ["select", "Menü-Klick", "Im Menü weiterblättern."],
  ["confirm", "Menü-Bestätigen", "Im Menü auswählen."],
];

export const VOICE_LINES = [
  ["start", "Start-Spruch", "Beim Start des Rennens, z. B. „Los geht's!“", 4],
  ["hit", "Autsch", "Wenn die Person getroffen wird, z. B. „Ey!“", 3],
  ["overtake", "Überholen", "Wenn sie jemanden überholt, z. B. „Tschüss!“", 3],
  ["item", "Item-Ruf", "Beim Benutzen eines Items, z. B. „Nimm das!“", 3],
  ["win", "Sieg", "Bei Platz 1–3 im Ziel, z. B. „Ezzz!“", 5],
  ["lose", "Niederlage", "Bei Platz 4–8 im Ziel, z. B. „Unfair!“", 5],
  ["boost", "Boost-Jubel", "Bei Energy, Kurzen oder Drift-Boost, z. B. „Wuhuu!“", 3],
  ["drift", "Drift-Ruf", "Wenn der Drift voll glüht (rote Flammen), z. B. „Driiift!“", 3],
  ["gotitem", "Item bekommen", "Wenn die Item-Lotterie stoppt, z. B. „Ohh nice!“", 3],
  ["flash", "Geblitzt", "Wenn der Blitzer dich erwischt, z. B. „Neeein, Punkte!“", 3],
  ["splash", "Ins Wasser", "Beim Reinfallen in den Baggersee, z. B. „Kalt!“", 3],
  ["engine", "Motor", "Motorgeräusch – wird je nach Tempo höher/tiefer gespielt. 2–3 Sek. gleichmäßig brummen.", 4],
];

export const MUSIC = [
  ["schemmerhofen", "Musik Schemmerhofen", "Läuft in Schleife, solange du in Schemmerhofen fährst."],
  ["mcd", "Musik Mäcces Biberach", "Läuft in Schleife auf der Mäcces-Strecke."],
  ["baggersee", "Musik Baggersee", "Läuft in Schleife am Alberweiler Baggersee."],
];

export function catalog() {
  const out = [];
  for (const [id, name, desc] of SFX) out.push({ id: "sfx." + id, cat: "sfx", name, desc, max: 4 });
  for (const d of DRIVERS) for (const [line, name, desc, max] of VOICE_LINES) out.push({ id: `voice.${d.id}.${line}`, cat: "voice", driver: d.id, line, name: `${name}`, who: d.name, desc, max, color: d.hud });
  for (const [id, name, desc] of MUSIC) out.push({ id: "music." + id, cat: "music", name, desc, max: 60 });
  for (const o of out) { o.name = clean(o.name); o.desc = clean(o.desc); }
  return out;
}
