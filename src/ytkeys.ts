// Digitar no teclado do YouTube da TV só com as setas e o OK (o teclado desenhado pelo YouTube
// não aceita texto do celular). Regras descobertas testando na QN90A (veja /sim no repositório):
//  - o foco começa na letra A; a TV lembra o último botão focado
//  - ao focar A, E, I, O, U ou C abre um menu de acentos e "cima" escolhe o acento (nunca subir dessas letras)
//  - de qualquer letra da última linha, "baixo" cai no ESPAÇO; de ESPAÇO/LIMPAR/PESQUISAR, "cima" cai no V
//  - só se anda pelas letras (sem atalhos pela linha de baixo), e o espaço é sempre alcançado pelo V
const ROWS = ['ABCDEFG', 'HIJKLMN', 'OPQRSTU', "VWXYZ-'"];
const ACCENT = new Set(['A', 'E', 'I', 'O', 'U', 'C']);

type Dir = 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';
type St = { f: string; m: string };
type Item = { id: string; x: number; row: number };

const ITEMS: Item[] = [];
ROWS.forEach((s, r) => [...s].forEach((ch, c) => ITEMS.push({ id: ch, x: c, row: r })));
ITEMS.push({ id: 'DEL', x: 7, row: 0 }, { id: 'SYM', x: 7, row: 1 }, { id: 'GLOBE', x: 7, row: 2 });
ITEMS.push({ id: 'SPACE', x: 0.5, row: 4 }, { id: 'CLEAR', x: 2.5, row: 4 }, { id: 'SEARCH', x: 4.5, row: 4 });

const get = (id: string) => ITEMS.find((i) => i.id === id);
const rowItems = (r: number) => ITEMS.filter((i) => i.row === r).sort((a, b) => a.x - b.x);
const nearest = (r: number, x: number) => rowItems(r).reduce((b, i) => (Math.abs(i.x - x) < Math.abs(b.x - x) ? i : b));

// Onde o foco vai parar depois de apertar a tecla (modelo sem perda de tecla).
function step(s: St, k: Dir): St {
  const cur = get(s.f);
  if (!cur) return s;
  const m = s.f;
  if (k === 'LEFT' || k === 'RIGHT') {
    const row = rowItems(cur.row);
    const i = row.indexOf(cur) + (k === 'RIGHT' ? 1 : -1);
    return { f: i >= 0 && i < row.length ? row[i].id : s.f, m };
  }
  if (k === 'UP') return { f: ACCENT.has(s.f) ? 'POP' : cur.row === 0 ? 'TOP' : cur.row === 4 ? 'V' : nearest(cur.row - 1, cur.x).id, m };
  return { f: cur.row === 4 ? 'VIDEOS' : cur.row === 3 ? 'SPACE' : nearest(cur.row + 1, cur.x).id, m };
}

// Menor caminho passando só por letras (e pelo destino).
function path(from: St, to: string): Dir[] {
  const seen = new Set([from.f + '|' + from.m]);
  const q: { s: St; keys: Dir[] }[] = [{ s: from, keys: [] }];
  while (q.length) {
    const { s, keys } = q.shift()!;
    if (s.f === to) return keys;
    for (const k of ['LEFT', 'RIGHT', 'UP', 'DOWN'] as Dir[]) {
      const n = step(s, k);
      const id = n.f + '|' + n.m;
      if ((n.f.length === 1 || n.f === to) && !seen.has(id)) { seen.add(id); q.push({ s: n, keys: [...keys, k] }); }
    }
  }
  return [];
}

export const plain = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Lista de teclas pra digitar o texto, com o foco começando na letra A. Letras fora do teclado (números etc.) vão em `skipped`.
export function plan(text: string, search: boolean): { keys: string[]; skipped: string[] } {
  let s: St = { f: 'A', m: 'A' };
  const keys: string[] = [];
  const skipped: string[] = [];
  const go = (ds: Dir[]) => { for (const d of ds) { keys.push('KEY_' + d); s = step(s, d); } };
  const ok = () => keys.push('KEY_ENTER');
  for (const ch of plain(text)) {
    if (ch === ' ') {
      go(path(s, 'V')); go(['DOWN']); ok();
      s = { f: 'SPACE', m: 'V' };
      continue;
    }
    const id = ch.toUpperCase();
    if (!get(id) || id.length !== 1) { skipped.push(ch); continue; }
    if (s.f === 'SPACE') go(['UP']);
    go(path(s, id)); ok();
  }
  if (search) {
    if (s.f === 'SPACE') go(['UP']);
    go(path(s, 'V')); go(['DOWN', 'RIGHT', 'RIGHT']); ok();
  }
  return { keys, skipped };
}
