// Familienmodus (in den Einstellungen unauffaellig als "Test" geschaltet):
// keine Vape/Kippen/Alkohol-Begriffe, kein Logo mit Flasche/Vape, keine Vape-Posen.
export const FAMILY = (() => { try { return localStorage.getItem("dskart_family") === "1"; } catch (e) { return false; } })();
export function setFamily(on) { try { localStorage.setItem("dskart_family", on ? "1" : "0"); } catch (e) {} location.reload(); }

export const FAMILY_ITEMS = {
  vape: { icon: "🫧", name: "Seifenblasen" },
  kippe: { icon: "🍭", name: "Lolli" },
  pack: { icon: "🍬", name: "Bonbonpapier" },
  energy: { icon: "🥤", name: "Brause" },
  kurze: { icon: "🧃", name: "3 Saftboxen" },
  jaegi: { icon: "💦", name: "Wasserbombe" },
  kasten: { icon: "📦", name: "Saftkiste" },
};

// Texte im Spiel/Audio-Menue entschaerfen
const WORDS = [
  [/Vape-Wolke/g, "Seifenblasen-Wolke"], [/Vape-Zug/g, "Seifenblasen pusten"], [/Vape im Gesicht/g, "Blasen im Gesicht"],
  [/Vape/g, "Seifenblasen"], [/vape/g, "Seifenblasen"], [/Kippenschachtel/g, "Bonbonpapier"], [/Kippe anzünden/g, "Lolli auspacken"],
  [/Kippe/g, "Lolli"], [/Feuerzeug/g, "Lolli auspacken"], [/Bierkasten/g, "Saftkiste"], [/Kasten Bier/g, "Saftkiste"],
  [/Kräuterschnaps/g, "Wasserbombe"], [/Kurze/g, "Saftboxen"], [/Energy/g, "Brause"], [/Mango-Ice/g, "Seifenblasen"],
  [/rauchen/g, "schlecken"], [/geblasen/g, "gepustet"],
];
export function clean(s) { if (!FAMILY || !s) return s; for (const [a, b] of WORDS) s = s.replace(a, b); return s; }
