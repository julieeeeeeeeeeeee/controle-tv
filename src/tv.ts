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

// known = TV que já foi pareada antes: se estiver desligada, o app fica tentando de novo em vez de dar erro.
type Cfg = { ip: string; token?: string; known?: boolean; onToken?: (t: string) => void };

class Tv {
  status: Status = 'off';
  detail = '';
  installed: { id: string; name: string }[] = [];
  sent: ((what: string) => void) | undefined; // só no modo demonstração
  private cfg?: Cfg;
  private tryIdx = 0;
  private trying = false;
  private everOn = false;
  private wanted = false;
  private paused = false;
  private pendingPower = 0;
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
    this.paused = false;
    this.everOn = false;
    if (DEMO) { this.set('on'); return; }
    this.attach();
    this.start(false);
  }

  private attach() {
    this.subs.forEach((s) => s.remove());
    this.subs = [
      TvLink!.addListener('onOpen', () => { if (this.trying && this.status !== 'on') this.set('pairing'); }),
      TvLink!.addListener('onMessage', (e) => this.onMessage(e.data)),
      TvLink!.addListener('onError', (e) => this.onDown(e?.message)),
      TvLink!.addListener('onClose', () => this.onDown()),
    ];
  }

  // quiet = tentativa em segundo plano (TV desligada): não pisca "Conectando…" na tela
  private start(quiet: boolean) {
    this.tryIdx = 0;
    this.open(quiet);
  }

  private open(quiet: boolean) {
    if (!this.cfg || !TvLink) return;
    const { proto, port } = PORTS[this.tryIdx];
    const tk = this.cfg.token && proto === 'wss' ? `&token=${this.cfg.token}` : '';
    this.trying = true;
    if (!quiet) this.set('connecting');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.status === 'on') return;
      if (this.cfg?.known || this.everOn) { this.trying = false; TvLink?.close(); this.set('off'); this.scheduleRetry(5000); }
      else this.fail('Sem resposta da TV. Ela está ligada e no mesmo Wi-Fi do celular?');
    }, 45000);
    TvLink.connect(`${proto}://${this.cfg.ip}:${port}/api/v2/channels/samsung.remote.control?name=${NAME}${tk}`);
  }

  private fail(msg: string) {
    clearTimeout(this.timer);
    clearTimeout(this.retry);
    this.trying = false;
    TvLink?.close();
    this.set('error', msg);
  }

  private scheduleRetry(ms: number) {
    clearTimeout(this.retry);
    this.retry = setTimeout(() => {
      if (this.wanted && !this.paused && this.status !== 'on' && !this.trying) this.start(true);
    }, ms);
  }

  private onDown(msg?: string) {
    if (!this.wanted || this.paused) return;
    if (this.trying && this.tryIdx + 1 < PORTS.length) {
      this.tryIdx += 1;
      this.open(this.status === 'off');
      return;
    }
    const wasUp = this.status === 'on';
    clearTimeout(this.timer);
    this.trying = false;
    if (!this.everOn && !this.cfg?.known && !this.cfg?.token) {
      this.fail(this.status === 'pairing' ? 'A TV não aceitou. Aperte Permitir na TV e tente de novo.' : msg || 'Não consegui falar com a TV.');
      return;
    }
    // TV desligada ou fora do ar: fica esperando e reconecta sozinho quando ela voltar
    this.set('off');
    this.scheduleRetry(wasUp ? 1500 : 5000);
  }

  private onMessage(raw: string) {
    let m: any;
    try { m = JSON.parse(raw); } catch { return; }
    if (m.event === 'ms.channel.connect') {
      clearTimeout(this.timer);
      this.trying = false;
      this.everOn = true;
      const t = m.data?.token;
      if (t && this.cfg?.onToken && String(t) !== this.cfg.token) {
        this.cfg.token = String(t);
        this.cfg.onToken(String(t));
      } else if (t && this.cfg) {
        this.cfg.token = String(t);
      }
      this.set('on');
      this.raw({ method: 'ms.channel.emit', params: { event: 'ed.installedApp.get', to: 'host' } });
      this.afterConnect();
    } else if (m.event === 'ms.channel.unauthorized') {
      // token velho (a TV esqueceu este celular): apaga e pede o "Permitir" de novo, uma vez só
      if (this.cfg?.token) {
        this.cfg.token = undefined;
        this.cfg.onToken?.('');
        TvLink?.close();
        this.start(false);
        return;
      }
      this.fail('A TV recusou a conexão. Na TV, abra Configurações › Geral › Gerenciador de dispositivos externos › Gerenciador de conexão de dispositivo e deixe a Notificação de acesso ligada. Depois tente de novo.');
    } else if (m.event === 'ed.installedApp.get') {
      const d = m.data?.data;
      const arr = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [];
      this.installed = arr.filter((a: any) => a?.appId).map((a: any) => ({ id: String(a.appId), name: String(a.name || '') }));
    }
  }

  // Se a Julie tocou em ligar e a TV só estava em espera (conecta, mas está apagada), aperta o botão de ligar.
  private async afterConnect() {
    if (!this.pendingPower || Date.now() - this.pendingPower > 40000) { this.pendingPower = 0; return; }
    this.pendingPower = 0;
    try {
      const i = TvLink && this.cfg ? await TvLink.info(this.cfg.ip) : null;
      if (i?.power === 'standby') this.key(KEY.power);
    } catch {}
  }

  private raw(o: object): boolean {
    if (DEMO) { this.sent?.(JSON.stringify(o).slice(0, 90)); return true; }
    return TvLink!.send(JSON.stringify(o));
  }

  reconnect() {
    if (DEMO || !this.cfg || this.trying) return;
    if (this.status === 'on' || this.status === 'pairing') return;
    this.wanted = true;
    this.paused = false;
    this.attach();
    this.start(false);
  }

  // app foi pro segundo plano: solta a conexão e para de tentar
  pause() {
    if (DEMO) return;
    this.paused = true;
    clearTimeout(this.timer);
    clearTimeout(this.retry);
    this.trying = false;
    TvLink?.close();
    if (this.wanted) this.set('off');
  }

  disconnect() {
    this.wanted = false;
    clearTimeout(this.timer);
    clearTimeout(this.retry);
    this.trying = false;
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

  // cursor na tela da TV (modo ponteiro): posição absoluta em pixels da tela
  mouseMove(x: number, y: number): boolean {
    if (DEMO) return true;
    if (this.status !== 'on') return false;
    return this.raw({ method: 'ms.remote.control', params: { Cmd: 'Move', Position: { x: Math.round(x), y: Math.round(y), Time: '0' }, TypeOfRemote: 'ProcessMouseDevice' } });
  }

  mouseClick(): boolean {
    if (DEMO) { this.sent?.('clique'); return true; }
    if (this.status !== 'on') { this.reconnect(); return false; }
    return this.raw({ method: 'ms.remote.control', params: { Cmd: 'LeftClick', TypeOfRemote: 'ProcessMouseDevice' } });
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

  // Ligar: com a TV acesa manda o botão de ligar (desliga). Apagada: Wake-on-LAN e espera ela voltar.
  async power(mac?: string): Promise<boolean> {
    if (this.status === 'on') return this.key(KEY.power);
    this.pendingPower = mac ? 0 : Date.now(); // com Wake-on-LAN a TV acorda sozinha; sem, aperta ligar quando conectar
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

export async function tvInfo(ip: string): Promise<Found | null> {
  if (!TvLink) return null;
  try { return await TvLink.info(ip); } catch { return null; }
}
