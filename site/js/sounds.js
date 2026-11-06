// Katalog aller Geraeusche, die man im Audio-Profil ersetzen kann
import { DRIVERS } from "./cars.js";

export const SFX = [
  ["beep", "Countdown-Piep", "Die drei Pieptöne vor dem Start (3 … 2 … 1)."],
  ["go", "Startsignal", "Wenn das Rennen losgeht – „LOS!“"],
  ["box", "Item-Kiste", "Beim Durchfahren einer Item-Kiste."],
  ["got", "Item bekommen", "Wenn die Item-Lotterie stoppt."],
  ["boost", "Boost", "Energy, Kurze, Drift-Boost, Raketenstart."],
  ["spark", "Drift-Funken", "Jede neue Glut-Stufe beim Driften."],
  ["hit", "Getroffen", "Wenn dein Auto rumgeschleudert wird."],
  ["wall", "Wand / Leitplanke", "Beim Reinfahren in die Begrenzung."],
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
  return out;
}
