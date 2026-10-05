// Simulador do teclado do YouTube na TV Samsung (QN90A). Regras vindas dos testes reais:
//  - direita na borda PARA (no ⌫ da primeira linha); esquerda da coluna A sai pra "busca recente" e depois "voltar"
//  - cima da primeira linha sai pro topo; baixo da última linha sai pros vídeos
//  - ao voltar pro teclado, a TV cai no ÚLTIMO botão que estava focado
//  - a TV perde teclas de vez em quando (drop)
const ROWS = ['ABCDEFG', 'HIJKLMN', 'OPQRSTU', "VWXYZ-'"];

// Letras que abrem um menu de acentos em cima delas ao receber o foco; "cima" escolhe o acento em vez de subir.
const ACCENT = new Set(['A', 'E', 'I', 'O', 'U', 'C']);

function items() {
  const it = [];
  ROWS.forEach((s, r) => [...s].forEach((ch, c) => it.push({ id: ch, label: ch, x: c, row: r })));
  it.push({ id: 'DEL', label: '⌫', x: 7, row: 0 }, { id: 'SYM', label: '&123', x: 7, row: 1 }, { id: 'GLOBE', label: '🌐', x: 7, row: 2 });
  it.push({ id: 'SPACE', label: 'ESPAÇO', x: 0.5, row: 4 }, { id: 'CLEAR', label: 'LIMPAR', x: 2.5, row: 4 }, { id: 'SEARCH', label: 'PESQUISAR', x: 4.5, row: 4 });
  return it;
}

class Keyboard {
  constructor({ drop = 0, seed = 1, recents = 1, accents = true } = {}) {
    this.accents = accents;
    this.items = items();
    this.drop = drop;
    this.recents = recents;
    this.rng = mulberry(seed);
    this.focus = 'A';       // id do botão, ou 'TOP', 'VIDEOS', 'R1'.., 'BACK'
    this.memory = 'A';      // último botão do teclado focado
    this.text = '';
    this.keys = 0;
  }
  get(id) { return this.items.find((i) => i.id === id); }
  inKb() { return !!this.get(this.focus); }
  rowItems(r) { return this.items.filter((i) => i.row === r).sort((a, b) => a.x - b.x); }
  nearest(r, x) {
    return this.rowItems(r).reduce((best, i) => (Math.abs(i.x - x) < Math.abs(best.x - x) ? i : best));
  }
  press(k) {
    this.keys++;
    if (this.rng() < this.drop) return false; // a TV perdeu a tecla
    const f = this.focus;
    const cur = this.get(f);
    if (cur) {
      this.memory = f;
      if (k === 'ENTER') { this.enter(cur); return true; }
      if (k === 'LEFT' || k === 'RIGHT') {
        const row = this.rowItems(cur.row);
        const i = row.indexOf(cur) + (k === 'RIGHT' ? 1 : -1);
        if (i >= 0 && i < row.length) this.focus = row[i].id;
        else if (k === 'LEFT') this.focus = 'R1';
        return true;
      }
      if (k === 'UP') this.focus = this.accents && ACCENT.has(f) ? 'POP' : cur.row === 0 ? 'TOP' : cur.row === 4 ? 'V' : this.nearest(cur.row - 1, cur.x).id;
      if (k === 'DOWN') this.focus = cur.row === 4 ? 'VIDEOS' : cur.row === 3 ? 'SPACE' : this.nearest(cur.row + 1, cur.x).id;
      return true;
    }
    if (f === 'POP') { if (k === 'DOWN') this.focus = this.memory; } // menu de acentos: só "baixo" volta à letra
    else if (f === 'TOP' && k === 'DOWN') this.focus = this.memory;
    else if (f === 'VIDEOS' && k === 'UP') this.focus = this.memory;
    else if (/^R\d+$/.test(f)) {
      const n = +f.slice(1);
      if (k === 'RIGHT') this.focus = n > 1 ? 'R' + (n - 1) : this.memory;
      if (k === 'LEFT') this.focus = n < this.recents ? 'R' + (n + 1) : 'BACK';
    } else if (f === 'BACK' && k === 'RIGHT') this.focus = 'R' + this.recents;
    return true;
  }
  enter(it) {
    if (it.id === 'SPACE') this.text += ' ';
    else if (it.id === 'DEL') this.text = this.text.slice(0, -1);
    else if (it.id === 'CLEAR') this.text = '';
    else if (it.id.length === 1) this.text += it.id.toLowerCase();
  }
}

function mulberry(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

if (typeof module !== 'undefined') module.exports = { Keyboard, ROWS, items };
