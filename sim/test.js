// Compara jeitos de digitar no teclado do YouTube com perda aleatória de teclas.
const { Keyboard } = require('./engine');

const clone = (k) => { const c = new Keyboard(); c.focus = k.focus; c.memory = k.memory; return c; };

// menor caminho entre dois botões no modelo perfeito (sem perda de tecla)
function path(from, memory, to, accents = true) {
  const start = { f: from, m: memory, keys: [] };
  const seen = new Set([from + '|' + memory]);
  const q = [start];
  while (q.length) {
    const s = q.shift();
    if (s.f === to) return s.keys;
    for (const k of ['LEFT', 'RIGHT', 'UP', 'DOWN']) {
      const c = new Keyboard({ accents }); c.focus = s.f; c.memory = s.m; c.press(k);
      const id = c.focus + '|' + c.memory;
      const allowed = c.focus.length === 1 || c.focus === to;   // só letras (e o destino): nada de atalhos por outros botões
      if (allowed && !seen.has(id)) { seen.add(id); q.push({ f: c.focus, m: c.memory, keys: [...s.keys, k] }); }
    }
  }
  throw new Error('sem caminho ' + from + '→' + to);
}

const ANCHOR = [...Array(8).fill('RIGHT'), ...Array(4).fill('UP'), 'DOWN', ...Array(3).fill('RIGHT')]; // termina no ⌫

// Planeja o texto inteiro. anchorEvery = a cada quantas letras volta ao ponto fixo (0 = nunca).
function plan(text, anchorEvery, accents = true) {
  const m = new Keyboard({ accents });
  const out = [];
  const apply = (keys) => { for (const k of keys) { out.push(k); m.press(k); } };
  let since = 0;
  if (anchorEvery) { apply(ANCHOR); }
  for (const ch of text) {
    if (anchorEvery && since >= anchorEvery) { apply(ANCHOR); since = 0; }
    const id = ch === ' ' ? 'SPACE' : ch.toUpperCase();
    if (id === 'SPACE') { apply(path(m.focus, m.memory, 'V', accents)); apply(['DOWN']); }  // sempre pelo V
    else apply(path(m.focus, m.memory, id, accents));
    apply(['ENTER']);
    since++;
  }
  return out;
}

function run(text, anchorEvery, drop, seed) {
  const kb = new Keyboard({ drop, seed });
  const keys = plan(text, anchorEvery);
  for (const k of keys) kb.press(k);
  return { ok: kb.text === text, n: keys.length, got: kb.text };
}

const text = process.argv[2] || 'gatos engracados';
console.log('texto:', text);
// 1) plano antigo (ignora o menu de acentos) rodando na TV que TEM o menu
let ok = 0;
for (const t of ['abe gato', 'gato de gato', 'gatos engracados', 'stranger things', 'ola mundo']) {
  const kb = new Keyboard({ accents: true });
  for (const k of plan(t, 0, false)) kb.press(k);
  console.log(`plano antigo  "${t}" -> "${kb.text}"`);
}
// 2) plano novo (sabe do menu de acentos)
for (const t of ['abe gato', 'gato de gato', 'gatos engracados', 'stranger things', 'ola mundo', 'the last of us', 'jujutsu kaisen']) {
  const kb = new Keyboard({ accents: true });
  const keys = plan(t, 0, true);
  for (const k of keys) kb.press(k);
  console.log(`plano novo    "${t}" -> "${kb.text}" ${kb.text === t ? 'OK' : 'ERRO'} (${keys.length} teclas, ~${Math.round(keys.length * 0.35)} s)`);
}
