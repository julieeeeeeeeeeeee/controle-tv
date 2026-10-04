import { CAT } from './apps';
import { KEY } from './keys';

export type Action =
  | { type: 'key'; key: string; label: string; repeat?: number }
  | { type: 'app'; app: string; label: string }
  | { type: 'text'; text: string; label: string };

// Transforma o que a Julie falou em um comando para a TV.
export function interpret(said: string): Action {
  const t = said.toLowerCase().trim();
  const k = (key: string, label: string, repeat?: number): Action => ({ type: 'key', key, label, repeat });

  if (/(aument|sobe|mais alto|mais volume)/.test(t)) return k(KEY.volUp, 'Volume +', 3);
  if (/(diminu|abaix|baixa|menos volume)/.test(t)) return k(KEY.volDown, 'Volume −', 3);
  if (/(mudo|silenc)/.test(t)) return k(KEY.mute, 'Mudo');
  if (/(canal anterior)/.test(t)) return k(KEY.chDown, 'Canal −');
  if (/(próximo canal|proximo canal|muda o canal|passa o canal)/.test(t)) return k(KEY.chUp, 'Canal +');
  if (/(desliga|liga a tv|ligar a tv)/.test(t)) return k(KEY.power, 'Ligar / desligar');
  if (/\b(voltar|volta)\b/.test(t)) return k(KEY.back, 'Voltar');
  if (/(início|inicio|\bhome\b)/.test(t)) return k(KEY.home, 'Início');

  const app = Object.values(CAT).find((a) => t.includes(a.name.toLowerCase().replace('+', '')));
  if (app && /(abr|vai pra|ir pro|ir para|coloca)/.test(t)) return { type: 'app', app: app.key, label: 'Abrir ' + app.name };

  const q = t.match(/(?:procura|busca|pesquisa)(?: por)?\s+(.+)/);
  const text = q ? q[1] : said.trim();
  return { type: 'text', text, label: 'Digitar na TV: ' + text };
}
