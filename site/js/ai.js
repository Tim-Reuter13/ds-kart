// Computer-Fahrer: folgt der Ideallinie mit eigener Spur, driftet in Kurven, nutzt Items
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

export function initAI(r, track) {
  r.ai = { lane: (Math.random() - 0.5) * track.half * 0.9, laneT: 2 + Math.random() * 4, hold: 0, wob: 0, itemT: 1 + Math.random() * 3, skill: 0.85 + Math.random() * 0.2 };
}

function curvAhead(track, s, from, to) {
  let sum = 0, n = 0;
  for (let d = from; d <= to; d += 3) {
    const p = track.at(s + d);
    sum += track.curv[p.i]; n++;
  }
  return sum / Math.max(1, n);
}

export function driveAI(r, race, dt) {
  const tr = race.track;
  const a = r.ai;
  const inp = r.input;
  a.laneT -= dt;
  if (a.laneT <= 0) { a.laneT = 2 + Math.random() * 5; a.lane = (Math.random() - 0.5) * tr.half * 1.1; }
  // Hindernissen ausweichen
  let lane = a.lane;
  for (const o of race.items.objs) {
    if (o.kind === "amt" || o.kind === "jaegi") continue;
    const q = tr.locate(o.x, o.z, o.hint ?? r.hint);
    let ahead = q.s - r.s; if (ahead < 0) ahead += tr.L;
    if (ahead > 2 && ahead < 30 && Math.abs(q.d - lane) < 3) lane = q.d + (q.d > 0 ? -4 : 4);
  }
  // Item-Kiste ansteuern, wenn kein Item
  if (!r.item && r.roulette <= 0) {
    for (const b of race.items.boxes) {
      if (b.t > 0) continue;
      const q = tr.locate(b.x, b.z, r.hint);
      let ahead = q.s - r.s; if (ahead < 0) ahead += tr.L;
      if (ahead > 4 && ahead < 35) { lane = q.d; break; }
    }
  }
  lane = clamp(lane, -tr.half + 1.5, tr.half - 1.5);

  const sp = Math.abs(r.speed);
  const look = 8 + sp * 0.5;
  const p = tr.at(r.s + look, lane);
  const want = Math.atan2(p.x - r.x, p.z - r.z);
  let diff = wrap(want - r.heading);
  if (r.blindT > 0) { a.wob += dt * 3; diff += Math.sin(a.wob * 2.3) * 0.5; }
  const c = curvAhead(tr, r.s, 6, 30);
  inp.steer = clamp(diff * 2.6, -1, 1);
  inp.gas = true;
  inp.brake = Math.abs(diff) > 1.3 && sp > 8;

  // Driften in laengeren Kurven
  a.cool = (a.cool || 0) - dt;
  if (!r.drift && !r.air && Math.abs(c) > 0.028 && sp > 14 && a.hold <= 0 && a.cool <= 0) {
    a.cool = 2.5; inp.drift = false;
    if (Math.random() < 0.65 * a.skill) { inp.drift = true; a.hold = 0.45; a.dir = Math.sign(c); }
  } else if (r.drift) {
    const keep = Math.abs(c) > 0.012 && Math.sign(c) === r.drift.dir && r.driftLevel < 3;
    inp.drift = keep || r.driftLevel === 0 && Math.abs(c) > 0.008;
    if (inp.drift) inp.steer = clamp(r.drift.dir * 0.4 + diff * 1.6, -1, 1);
  } else {
    inp.drift = a.hold > 0;
    if (a.hold > 0) inp.steer = a.dir || inp.steer;
  }
  a.hold -= dt;
  if (r.spinT > 0) inp.drift = false;

  // Items
  inp.item = false;
  if (r.item && r.roulette <= 0) {
    a.itemT -= dt;
    const k = r.item;
    let use = false;
    if (k === "jaegi") {
      for (const o of race.racers) {
        if (o === r) continue;
        const dx = o.x - r.x, dz = o.z - r.z, dist = Math.hypot(dx, dz);
        if (dist < 45 && Math.abs(wrap(Math.atan2(dx, dz) - r.heading)) < 0.2) use = true;
      }
      if (a.itemT < -6) use = true;
    } else if (k === "pack" || k === "kasten") {
      for (const o of race.racers) if (o !== r && o.total < r.total && r.total - o.total < 25) use = true;
      if (a.itemT < -4) use = true;
    } else if (k === "energy" || k === "kurze") {
      use = a.itemT < 0 && Math.abs(c) < 0.01;
    } else if (k === "kippe") use = a.itemT < 0;
    else if (k === "vape") use = r.place > 1 && a.itemT < 0;
    else use = a.itemT < 0;
    if (use) { inp.item = true; a.itemT = 1 + Math.random() * 3; }
  }
}
