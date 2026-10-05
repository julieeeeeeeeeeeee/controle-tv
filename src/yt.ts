// YouTube na TV: busca no celular e manda o vídeo escolhido pelo mesmo caminho do botão "Transmitir".
const API = 'https://www.youtube.com/api/lounge';
const NAME = 'Controle TV';

export type Video = { id: string; title: string; channel: string; length: string };

const form = (o: Record<string, string | number>) =>
  Object.entries(o).map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v))).join('&');

const post = (url: string, body: Record<string, string | number>) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form(body) });

// Busca pelo mesmo serviço que o site do YouTube usa (sem conta, sem chave pessoal).
export async function searchVideos(query: string): Promise<Video[]> {
  const r = await fetch('https://www.youtube.com/youtubei/v1/search?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context: { client: { clientName: 'WEB', clientVersion: '2.20240726.00.00', hl: 'pt-BR', gl: 'BR' } }, query }),
  });
  if (!r.ok) throw new Error('busca ' + r.status);
  const d = await r.json();
  const out: Video[] = [];
  const walk = (o: any) => {
    if (Array.isArray(o)) { o.forEach(walk); return; }
    if (!o || typeof o !== 'object') return;
    const v = o.videoRenderer;
    if (v?.videoId) {
      out.push({
        id: v.videoId,
        title: (v.title?.runs ?? []).map((x: any) => x.text).join(''),
        channel: v.ownerText?.runs?.[0]?.text ?? '',
        length: v.lengthText?.simpleText ?? '',
      });
    }
    Object.values(o).forEach(walk);
  };
  walk(d);
  return out;
}

// Liga o app à TV pelo código que o YouTube da TV mostra (só uma vez).
export async function pairCode(code: string): Promise<{ id: string; name: string }> {
  const r = await post(API + '/pairing/get_screen', { pairing_code: code.replace(/\D/g, '') });
  if (!r.ok) throw new Error('código recusado');
  const j = await r.json();
  const s = j.screen;
  if (!s?.screenId) throw new Error('código inválido');
  return { id: s.screenId, name: s.name ?? 'TV' };
}

async function loungeToken(id: string): Promise<string> {
  const r = await post(API + '/pairing/get_lounge_token_batch', { screen_ids: id });
  if (!r.ok) throw new Error('token ' + r.status);
  const j = await r.json();
  const t = j.screens?.[0]?.loungeToken;
  if (!t) throw new Error('sem token');
  return t;
}

// O YouTube da TV precisa estar aberto para receber o vídeo.
export async function isOnline(id: string): Promise<boolean> {
  try {
    const tok = await loungeToken(id);
    const r = await post(API + '/pairing/get_screen_availability', { lounge_token: tok });
    const j = await r.json();
    return j.screens?.[0]?.status === 'online';
  } catch {
    return false;
  }
}

// Resposta do servidor: blocos "tamanho\n[[id,[tipo,...]],...]".
function parse(text: string): { sid?: string; gsession?: string; last?: number } {
  const lines = text.split('\n');
  let sid: string | undefined, gsession: string | undefined, last: number | undefined;
  let remaining = 0;
  let cur = '';
  for (const line of lines) {
    if (remaining <= 0) { remaining = parseInt(line, 10) || 0; cur = ''; continue; }
    cur += line;
    remaining -= line.length + 1;
    if (remaining <= 0) {
      try {
        const evs: any[] = JSON.parse(cur);
        for (const [n, ev] of evs) {
          if (ev[0] === 'c') sid = ev[1];
          if (ev[0] === 'S') gsession = ev[1];
          last = n;
        }
      } catch {}
    }
  }
  return { sid, gsession, last };
}

// Manda o vídeo para a TV. Devolve true se a TV aceitou.
export async function playVideo(screenId: string, videoId: string): Promise<boolean> {
  const tok = await loungeToken(screenId);
  const c = await post(API + '/bc/bind?RID=1&VER=8&CVER=1&auth_failure_option=send_error', {
    app: 'web', 'mdx-version': '3', name: NAME, id: screenId, device: 'REMOTE_CONTROL',
    capabilities: 'que,dsdtr,atp,vsp', magnaKey: 'cloudPairedDevice', ui: 'false',
    deviceContext: 'user_agent=dunno&window_width_points=&window_height_points=&os_name=android&ms=',
    theme: 'cl', loungeIdToken: tok,
  });
  if (!c.ok) return false;
  const { sid, gsession, last } = parse(await c.text());
  if (!sid || !gsession) return false;
  const q = form({
    name: NAME, loungeIdToken: tok, SID: sid, AID: last ?? 0, gsessionid: gsession,
    device: 'REMOTE_CONTROL', app: 'youtube-desktop', VER: 8, v: 2, RID: 2,
  });
  const r = await post(API + '/bc/bind?' + q, { count: 1, ofs: 1, req0__sc: 'setPlaylist', req0_videoId: videoId });
  return r.ok;
}
