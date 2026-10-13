// Fala com a Lume (o tablet da sala) pelo canal secreto do ntfy.sh: pedido falado e chamado de atenção.
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVIDOR = 'https://ntfy.sh';
export type LumeCfg = { canal: string; nome: string };

export async function loadLume(): Promise<LumeCfg> {
  try {
    const [c, n] = await Promise.all([AsyncStorage.getItem('lume:canal'), AsyncStorage.getItem('lume:nome')]);
    return { canal: c || '', nome: n || '' };
  } catch { return { canal: '', nome: '' }; }
}
export async function saveLume(cfg: LumeCfg) {
  try { await AsyncStorage.multiSet([['lume:canal', cfg.canal.trim()], ['lume:nome', cfg.nome.trim()]]); } catch {}
}

async function enviar(cfg: LumeCfg, corpo: object): Promise<{ id: string; time: number }> {
  const r = await fetch(`${SERVIDOR}/${cfg.canal.trim()}`, { method: 'POST', body: JSON.stringify({ de: cfg.nome.trim() || 'Alguém', ...corpo }) });
  if (!r.ok) throw new Error('canal ' + r.status);
  return r.json();
}

// procura, a cada segundo, a resposta (ou o "visto") ligada à mensagem enviada
async function esperar(cfg: LumeCfg, sufixo: string, enviada: { id: string; time: number }, ms: number, ok: (m: any) => boolean): Promise<any | null> {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    await new Promise((r) => setTimeout(r, 1200));
    try {
      const t = await (await fetch(`${SERVIDOR}/${cfg.canal.trim()}-${sufixo}/json?poll=1&since=${enviada.time - 1}`)).text();
      for (const linha of t.split('\n')) {
        if (!linha.trim()) continue;
        const m = JSON.parse(linha);
        if (m.event === 'message' && ok(m)) return m;
      }
    } catch { /* rede oscilou: tenta de novo até o prazo */ }
  }
  return null;
}

// devolve o que a Lume respondeu (texto) ou null se não respondeu a tempo
export async function pedir(cfg: LumeCfg, texto: string): Promise<string | null> {
  const e = await enviar(cfg, { tipo: 'pedido', texto });
  const m = await esperar(cfg, 'resp', e, 25000, (m) => { try { return JSON.parse(m.message).pedido === e.id; } catch { return false; } });
  return m ? JSON.parse(m.message).fala : null;
}

// true se alguém tocou em "Estou aqui" no tablet
export async function chamar(cfg: LumeCfg, texto: string): Promise<boolean> {
  const e = await enviar(cfg, { tipo: 'chamado', texto });
  return !!(await esperar(cfg, 'ack', e, 60000, () => true));
}
