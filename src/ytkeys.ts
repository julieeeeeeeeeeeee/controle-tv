// Digitar nos teclados desenhados pelos apps da TV (YouTube, Netflix) só com as setas e o OK: eles
// não aceitam texto do celular. Regras descobertas testando na QN90A (veja /sim no repositório).
// A TV não perde tecla (testado até 70 ms entre elas); o que derrubava a digitação eram regras do teclado.
type Dir = 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';
type St = { f: string; m: string };
type Item = { id: string; x: number; row: number };

export type Layout = {
  key: string;
  name: string;
  hint: string;        // onde o destaque deve estar antes de digitar
  search: boolean;     // tem botão PESQUISAR pra apertar no fim
  pre: Dir[];          // teclas antes de começar (ex.: sair da lupa e descer pro teclado)
  step: (s: St, k: Dir) => St;
  toSpace: (s: St) => { keys: Dir[]; after: St };   // como apertar o espaço a partir de s (inclui o OK)
  toSearch?: (s: St) => Dir[];
};

const rowOf = (items: Item[], r: number) => items.filter((i) => i.row === r).sort((a, b) => a.x - b.x);
const nearestIn = (items: Item[], r: number, x: number) => rowOf(items, r).reduce((b, i) => (Math.abs(i.x - x) < Math.abs(b.x - x) ? i : b));
const sideStep = (items: Item[], cur: Item, k: Dir): string => {
  const row = rowOf(items, cur.row);
  const i = row.indexOf(cur) + (k === 'RIGHT' ? 1 : -1);
  return i >= 0 && i < row.length ? row[i].id : cur.id;
};

// Menor caminho passando só por letras/números (e pelo destino).
function path(layout: Layout, from: St, to: string): Dir[] {
  const seen = new Set([from.f + '|' + from.m]);
  const q: { s: St; keys: Dir[] }[] = [{ s: from, keys: [] }];
  while (q.length) {
    const { s, keys } = q.shift()!;
    if (s.f === to) return keys;
    for (const k of ['LEFT', 'RIGHT', 'UP', 'DOWN'] as Dir[]) {
      const n = layout.step(s, k);
      const id = n.f + '|' + n.m;
      if ((n.f.length === 1 || n.f === to) && !seen.has(id)) { seen.add(id); q.push({ s: n, keys: [...keys, k] }); }
    }
  }
  return [];
};

// ───────────── YouTube ─────────────
//  - o destaque começa na letra A; a TV lembra o último botão focado
//  - ao focar A, E, I, O, U ou C abre um menu de acentos e "cima" escolhe o acento (nunca subir dessas letras)
//  - de qualquer letra da última linha "baixo" cai no ESPAÇO; de ESPAÇO/LIMPAR/PESQUISAR "cima" cai no V
//  - o espaço é sempre alcançado pelo V
const YT_ROWS = ['ABCDEFG', 'HIJKLMN', 'OPQRSTU', "VWXYZ-'"];
const YT_ACCENT = new Set(['A', 'E', 'I', 'O', 'U', 'C']);
const YT: Item[] = [];
YT_ROWS.forEach((s, r) => [...s].forEach((ch, c) => YT.push({ id: ch, x: c, row: r })));
YT.push({ id: 'DEL', x: 7, row: 0 }, { id: 'SYM', x: 7, row: 1 }, { id: 'GLOBE', x: 7, row: 2 });
YT.push({ id: 'SPACE', x: 0.5, row: 4 }, { id: 'CLEAR', x: 2.5, row: 4 }, { id: 'SEARCH', x: 4.5, row: 4 });

const ytStep = (s: St, k: Dir): St => {
  const cur = YT.find((i) => i.id === s.f);
  if (!cur) return s;
  const m = s.f;
  if (k === 'LEFT' || k === 'RIGHT') return { f: sideStep(YT, cur, k), m };
  if (k === 'UP') return { f: YT_ACCENT.has(s.f) ? 'POP' : cur.row === 0 ? 'TOP' : cur.row === 4 ? 'V' : nearestIn(YT, cur.row - 1, cur.x).id, m };
  return { f: cur.row === 4 ? 'VIDEOS' : cur.row === 3 ? 'SPACE' : nearestIn(YT, cur.row + 1, cur.x).id, m };
};

// ───────────── Netflix ─────────────
//  - 6 colunas: a-f, g-l, m-r, s-x, y z 1-4, 5-0. Em cima: ESPAÇO (sobre A B C) e APAGAR (sobre D E F)
//  - "cima" de A/B/C vai pro ESPAÇO e de D/E/F pro APAGAR; "baixo" do ESPAÇO cai no B e do APAGAR no E
//  - sem menu de acentos
//  - o destaque começa na lupa (1º ícone do menu); "baixo" leva à letra a, mas só na 1ª vez: depois de mexer no teclado a TV lembra o último botão, então a busca precisa estar recém-aberta
const NF_ROWS = ['ABCDEF', 'GHIJKL', 'MNOPQR', 'STUVWX', 'YZ1234', '567890'];
const NF: Item[] = [];
NF_ROWS.forEach((s, r) => [...s].forEach((ch, c) => NF.push({ id: ch, x: c, row: r })));
NF.push({ id: 'SPACE', x: 1, row: -1 }, { id: 'BKSP', x: 4, row: -1 });

const nfStep = (s: St, k: Dir): St => {
  const cur = NF.find((i) => i.id === s.f);
  if (!cur) return s;
  const m = s.f;
  if (k === 'LEFT' || k === 'RIGHT') return { f: sideStep(NF, cur, k), m };
  if (k === 'UP') return { f: cur.row === -1 ? 'TOP' : cur.row === 0 ? (cur.x <= 2 ? 'SPACE' : 'BKSP') : nearestIn(NF, cur.row - 1, cur.x).id, m };
  return { f: cur.row === 5 ? 'LIST' : cur.row === -1 ? (cur.id === 'SPACE' ? 'B' : 'E') : nearestIn(NF, cur.row + 1, cur.x).id, m };
};

export const LAYOUTS: Layout[] = [
  {
    key: 'youtube', name: 'YouTube', search: true, pre: [],
    hint: 'Abra a busca do YouTube na TV com o destaque na letra A.',
    step: ytStep,
    toSpace: (s) => { const l = LAYOUTS[0]; const keys = [...path(l, s, 'V'), 'DOWN' as Dir]; return { keys, after: { f: 'SPACE', m: 'V' } }; },
    toSearch: (s) => { const l = LAYOUTS[0]; return [...path(l, s, 'V'), 'DOWN', 'RIGHT', 'RIGHT']; },
  },
  {
    key: 'netflix', name: 'Netflix', search: false, pre: ['DOWN'],
    hint: 'Abra a busca da Netflix na TV, recém-aberta, com o destaque na lupa. Pra digitar de novo, saia da busca e entre outra vez.',
    step: nfStep,
    toSpace: (s) => { const l = LAYOUTS[1]; const keys = [...path(l, s, 'B'), 'UP' as Dir]; return { keys, after: { f: 'SPACE', m: 'B' } }; },
  },
];

export const plain = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Lista de teclas pra digitar o texto, com o destaque começando na letra A. Caracteres que o teclado não tem vão em `skipped`.
export function plan(layout: Layout, text: string, search: boolean): { keys: string[]; skipped: string[] } {
  let s: St = { f: 'A', m: 'A' };
  const keys: string[] = layout.pre.map((d) => 'KEY_' + d);
  const skipped: string[] = [];
  const go = (ds: Dir[]) => { for (const d of ds) { keys.push('KEY_' + d); s = layout.step(s, d); } };
  const ok = () => keys.push('KEY_ENTER');
  const leaveBottom = () => { if (s.f === 'SPACE') go([layout.key === 'youtube' ? 'UP' : 'DOWN']); };
  const valid = (id: string) => id.length === 1 && (layout === LAYOUTS[0] ? /[A-Z'-]/.test(id) : /[A-Z0-9]/.test(id));
  for (const ch of plain(text)) {
    if (ch === ' ') {
      leaveBottom();
      const r = layout.toSpace(s);
      for (const d of r.keys) keys.push('KEY_' + d);
      ok();
      s = r.after;
      continue;
    }
    const id = ch.toUpperCase();
    if (!valid(id)) { skipped.push(ch); continue; }
    leaveBottom();
    go(path(layout, s, id)); ok();
  }
  if (search && layout.toSearch) {
    leaveBottom();
    for (const d of layout.toSearch(s)) keys.push('KEY_' + d);
    ok();
  }
  return { keys, skipped };
}
