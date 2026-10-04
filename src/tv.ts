import { TvLink, Found } from '../modules/tv-link';
import { b64 } from './base64';
import { CAT } from './apps';
import { KEY } from './keys';

export { KEY };
export type Status = 'off' | 'connecting' | 'pairing' | 'on' | 'error';

const NAME = b64('Controle TV');
// 8002 = seguro (guarda o token do "Permitir"); 8001 = antigo, sem token.
const PORTS: { proto: 'wss' | 'ws'; port: number }[] = [
  { proto: 'wss', port: 8002 },
  { proto: 'ws', port: 8001 },
];

// Sem o módulo nativo (navegador), o app roda em modo demonstração.
export const DEMO = !TvLink;

type Cfg = { ip: string; token?: string; onToken?: (t: string) => void };

class Tv {
  status: Status = 'off';
  detail = '';
  installed: { id: string; name: string }[] = [];
  sent: ((what: string) => void) | undefined; // só no modo demonstração
  private cfg?: Cfg;
  private tryIdx = 0;
  private wanted = false;
  private subs: { remove: () => void }[] = [];
  private listeners = new Set<() => void>();
  private timer?: ReturnType<typeof setTimeout>;
  private retry?: ReturnType<typeof setTimeout>;

  get token() { return this.cfg?.token; }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  private set(s: Status, detail = '') {
    this.status = s;
    this.detail = detail;
    this.listeners.forEach((f) => f());
  }

  connect(cfg: Cfg) {
    this.cfg = cfg;
    this.wanted = true;
    this.tryIdx = 0;
    if (DEMO) { this.set('on'); return; }
    this.attach();
    this.open();
  }

  private attach() {
    this.subs.forEach((s) => s.remove());
    this.subs = [
      TvLink!.addListener('onOpen', () => { if (this.status === 'connecting') this.set('pairing'); }),
      TvLink!.addListener('onMessage', (e) => this.onMessage(e.data)),
      TvLink!.addListener('onError', (e) => this.onDown(e?.message)),
      TvLink!.addListener('onClose', () => this.onDown()),
    ];
  }

  private open() {
    if (!this.cfg || !TvLink) return;
    const { proto, port } = PORTS[this.tryIdx];
    const tk = this.cfg.token && proto === 'wss' ? `&token=${this.cfg.token}` : '';
    this.set('connecting');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { if (this.status !== 'on') this.fail('Sem resposta da TV. Ela está ligada e no mesmo Wi-Fi do celular?'); }, 45000);
    TvLink.connect(`${proto}://${this.cfg.ip}:${port}/api/v2/channels/samsung.remote.control?name=${NAME}${tk}`);
  }

  private fail(msg: string) {
    clearTimeout(this.timer);
    TvLink?.close();
    this.set('error', msg);
  }

  private onDown(msg?: string) {
    if (!this.wanted) return;
    if (this.status === 'connecting' && this.tryIdx + 1 < PORTS.length) {
      this.tryIdx += 1;
      this.open();
      return;
    }
    if (this.status === 'on' || this.status === 'pairing') {
      this.set('off');
      clearTimeout(this.retry);
      this.retry = setTimeout(() => { this.tryIdx = 0; this.open(); }, 2000);
      return;
    }
    if (this.status === 'connecting') this.fail(msg || 'Não consegui falar com a TV');
  }

  private onMessage(raw: string) {
    let m: any;
    try { m = JSON.parse(raw); } catch { return; }
    if (m.event === 'ms.channel.connect') {
      clearTimeout(this.timer);
      const t = m.data?.token;
      if (t && this.cfg?.onToken && String(t) !== this.cfg.token) {
        this.cfg.token = String(t);
        this.cfg.onToken(String(t));
      }
      this.set('on');
      this.raw({ method: 'ms.channel.emit', params: { event: 'ed.installedApp.get', to: 'host' } });
    } else if (m.event === 'ms.channel.unauthorized') {
      // token velho (a TV esqueceu este celular): apaga e pede o "Permitir" de novo, uma vez só
      if (this.cfg?.token) {
        this.cfg.token = undefined;
        this.cfg.onToken?.('');
        this.tryIdx = 0;
        TvLink?.close();
        this.open();
        return;
      }
      this.fail('A TV recusou a conexão. Na TV, abra Configurações › Geral › Gerenciador de dispositivos externos › Gerenciador de conexão de dispositivo e deixe a Notificação de acesso ligada. Depois tente de novo.');
    } else if (m.event === 'ed.installedApp.get') {
      const d = m.data?.data;
      const arr = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [];
      this.installed = arr.filter((a: any) => a?.appId).map((a: any) => ({ id: String(a.appId), name: String(a.name || '') }));
    }
  }

  private raw(o: object): boolean {
    if (DEMO) { this.sent?.(JSON.stringify(o).slice(0, 90)); return true; }
    return TvLink!.send(JSON.stringify(o));
  }

  reconnect() {
    if (DEMO || !this.cfg) return;
    if (this.status === 'on' || this.status === 'connecting' || this.status === 'pairing') return;
    this.wanted = true;
    this.tryIdx = 0;
    this.attach();
    this.open();
  }

  disconnect() {
    this.wanted = false;
    clearTimeout(this.timer);
    clearTimeout(this.retry);
    this.subs.forEach((s) => s.remove());
    this.subs = [];
    TvLink?.close();
    this.set('off');
  }

  key(k: string): boolean {
    if (DEMO) { this.sent?.(k); return true; }
    if (this.status !== 'on') { this.reconnect(); return false; }
    return this.raw({ method: 'ms.remote.control', params: { Cmd: 'Click', DataOfCmd: k, Option: 'false', TypeOfRemote: 'SendRemoteKey' } });
  }

  text(t: string): boolean {
    if (DEMO) { this.sent?.('texto: ' + t); return true; }
    if (this.status !== 'on') { this.reconnect(); return false; }
    const ok = this.raw({ method: 'ms.remote.control', params: { Cmd: b64(t), DataOfCmd: 'base64', TypeOfRemote: 'SendInputString' } });
    // a TV só aplica o texto depois do "fim da digitação"
    setTimeout(() => this.raw({ method: 'ms.remote.control', params: { TypeOfRemote: 'SendInputEnd' } }), 150);
    return ok;
  }

  appId(key: string): string | undefined {
    const def = CAT[key];
    if (!def) return undefined;
    const hit = this.installed.find((a) => def.match.some((m) => a.name.toLowerCase().includes(m)));
    return hit?.id ?? def.fallbackId;
  }

  launch(key: string): boolean {
    if (DEMO) { this.sent?.('abrir ' + key); return true; }
    if (this.status !== 'on') { this.reconnect(); return false; }
    const id = this.appId(key);
    if (!id) return false;
    return this.raw({ method: 'ms.channel.emit', params: { event: 'ed.apps.launch', to: 'host', data: { appId: id, action_type: 'DEEP_LINK' } } });
  }

  async power(mac?: string): Promise<boolean> {
    if (this.status === 'on') return this.key(KEY.power);
    if (mac && TvLink) { try { await TvLink.wake(mac); } catch {} }
    this.reconnect();
    return true;
  }
}

export const tv = new Tv();

export async function discover(): Promise<Found[]> {
  if (!TvLink) {
    return [{ ip: '192.168.0.14', name: 'Sala (demonstração)', model: 'QN55Q60', mac: '', power: 'on' }];
  }
  try { return await TvLink.discover(); } catch { return []; }
}
