import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import {
  ArrowUUpLeft, GearSix, House, Keyboard, MagnifyingGlass, Microphone, Minus, Pencil, Plus, Power, SpeakerSlash, X,
} from 'phosphor-react-native';
import { C, F } from './theme';
import { Btn, Label, Sheet, Touchpad, buzz, setVibrate, useHold } from './ui';
import { CAT } from './apps';
import { DEMO, KEY, tv } from './tv';
import { interpret, Action } from './voice';
import { Settings, SavedTv } from './store';
import YtSheet from './YtSheet';
import { LAYOUTS, plan } from './ytkeys';
import { checkUpdate, currentVersion, downloadAndInstall, Release } from './update';

const useTv = () => useSyncExternalStore((cb) => tv.subscribe(cb), () => tv.status + '|' + tv.detail);

export default function Remote({ s, setS, onChangeTv }: { s: Settings; setS: (f: (p: Settings) => Settings) => void; onChangeTv: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  useTv();
  const [toastMsg, setToastMsg] = useState('');
  const toastT = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toast = useCallback((m: string) => {
    setToastMsg(m);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setToastMsg(''), 1800);
  }, []);
  const [kb, setKb] = useState(false);
  const [voice, setVoice] = useState(false);
  const [cfg, setCfg] = useState(false);
  const [pick, setPick] = useState(false);
  const [ytOpen, setYtOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [upd, setUpd] = useState<Release | null>(null);
  const [updMsg, setUpdMsg] = useState('');
  const [prog, setProg] = useState(-1);
  useEffect(() => { checkUpdate().then(setUpd).catch(() => {}); }, []);

  const doCheck = () => {
    setUpdMsg('Verificando…');
    checkUpdate().then((r) => { setUpd(r); setUpdMsg(r ? 'Nova versão ' + r.version : 'Você está na versão mais recente'); }).catch(() => setUpdMsg('Não consegui verificar agora'));
  };
  const doInstall = () => {
    if (!upd || prog >= 0) return;
    setProg(0);
    downloadAndInstall(upd, setProg).then(() => setProg(-1)).catch(() => { setProg(-1); setUpdMsg('O download falhou. Tente de novo.'); });
  };

  useEffect(() => { setVibrate(s.vib); }, [s.vib]);
  useEffect(() => { if (DEMO) tv.sent = (w) => toast('Demo → ' + w); }, [toast]);

  const offMsg = 'TV desligada ou fora do ar. Estou tentando reconectar…';
  const key = (k: string) => { if (!tv.key(k)) toast(tv.status === 'on' ? 'Não enviou' : offMsg); };


  const [launching, setLaunching] = useState('');
  const openApp = (k: string) => {
    if (launching) return;
    setLaunching(k);
    toast('Abrindo ' + CAT[k].name + '…');
    tv.launch(k).then((r) => {
      if (r === 'missing') toast(CAT[k].name + ' não está instalado na TV');
      else if (r === 'fail') toast('A TV não respondeu. Está ligada?');
      else toast(CAT[k].name + ' aberto');
    }).finally(() => setLaunching(''));
  };
  const run = (a: Action) => {
    if (a.type === 'key') {
      const n = a.repeat ?? 1;
      for (let i = 0; i < n; i++) setTimeout(() => tv.key(a.key), i * 110);
    } else if (a.type === 'app') {
      openApp(a.app);
    } else if (!tv.text(a.text)) toast('TV desconectada');
    toast('Enviado: ' + a.label);
  };

  const status = tv.status;
  const dot = status === 'on' ? C.ok : status === 'error' ? C.accent : C.warn;
  const statusTxt = status === 'on' ? 'Conectada' : status === 'error' ? 'Toque pra reconectar' : status === 'off' ? 'TV desligada ou fora do ar' : 'Conectando…';
  const tileW = Math.floor((width - 32 - 30) / 4);
  const stage = Math.min(width - 56, height * 0.33, 320);
  const tvSaved = s.tv as SavedTv;

  const volUp = useHold(() => key(KEY.volUp));
  const volDown = useHold(() => key(KEY.volDown));
  const chUp = useHold(() => key(KEY.chUp));
  const chDown = useHold(() => key(KEY.chDown));

  const Bar = ({ left, right, mid }: { left: any; right: any; mid: React.ReactNode }) => (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderRadius: 20, height: 58, overflow: 'hidden' }}>
      <Btn bg="transparent" edge="transparent" label="menos" style={{ width: 56, height: 58 }} {...left}><Minus size={20} color={C.ink} /></Btn>
      <View style={{ flex: 1, alignItems: 'center' }}>{mid}</View>
      <Btn bg="transparent" edge="transparent" label="mais" style={{ width: 56, height: 58 }} {...right}><Plus size={20} color={C.ink} /></Btn>
    </View>
  );
  const volBar = <Bar left={volDown} right={volUp} mid={<Pressable onPress={() => { buzz(); key(KEY.mute); }} hitSlop={12} accessibilityLabel="Mudo"><SpeakerSlash size={20} color={C.mute} /></Pressable>} />;
  const chBar = <Bar left={chDown} right={chUp} mid={<Text style={{ fontFamily: F.displayBold, fontSize: 13, letterSpacing: 3, color: C.mute }}>CANAL</Text>} />;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 10, paddingHorizontal: 16 }}>
      <ScrollView contentContainerStyle={{ gap: 16, flexGrow: 1 }} showsVerticalScrollIndicator={false} bounces={false}>
        {upd && (
          <Pressable onPress={doInstall} style={{ backgroundColor: C.accent, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontFamily: F.monoMed, fontSize: 12, color: '#fff' }}>Nova versão {upd.version}</Text>
            <Text style={{ fontFamily: F.mono, fontSize: 11, color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>{prog >= 0 ? `Baixando ${Math.round(prog * 100)}%` : 'Atualizar'}</Text>
          </Pressable>
        )}
        {/* topo */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={() => tv.reconnect()}>
            <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: dot }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.monoMed, fontSize: 12, letterSpacing: 0.8, color: C.ink }} numberOfLines={1}>{(tvSaved?.name || 'TV').toUpperCase()}</Text>
              <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.mute, marginTop: 2, textTransform: 'uppercase' }} numberOfLines={1}>{statusTxt}{DEMO ? ' · demo' : ''}</Text>
            </View>
          </Pressable>
          <Btn label="Configurações" onPress={() => setCfg(true)} style={{ width: 42, height: 42, borderRadius: 13 }}><GearSix size={20} color={C.mute} /></Btn>
          <Btn label="Ligar ou desligar" bg={C.accent} edge={C.accentEdge} onPress={() => { tv.power(tvSaved?.mac); toast('Enviado: Ligar / desligar'); }} style={{ width: 42, height: 42, borderRadius: 21 }}>
            <Power size={20} color="#fff" weight="bold" />
          </Btn>
        </View>

        <View style={{ alignItems: 'center' }}><Touchpad size={stage} onKey={key} /></View>

        {/* navegação | entrada */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={pill}>
            <Btn label="Voltar" onPressIn={() => key(KEY.back)} style={round}><ArrowUUpLeft size={26} color={C.ink} /></Btn>
            <Btn label="Início" onPressIn={() => key(KEY.home)} style={round}><House size={26} color={C.ink} /></Btn>
          </View>
          <View style={pill}>
            <Btn label="Teclado" onPress={() => setKb(true)} style={round}><Keyboard size={26} color={C.ink} /></Btn>
            <Btn label="Falar" bg={C.accent} edge={C.accentEdge} onPress={() => setVoice(true)} style={{ width: 72, height: 72, borderRadius: 36 }}>
              <Microphone size={32} color="#fff" weight="fill" />
            </Btn>
          </View>
        </View>

        {/* volume e canal */}
        <View style={{ flexDirection: s.flip ? 'row-reverse' : 'row', gap: 10 }}>{volBar}{chBar}</View>

        {/* apps */}
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label>Apps</Label>
            {!editing && (
              <Pressable onPress={() => setYtOpen(true)} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MagnifyingGlass size={13} color={C.accent} weight="bold" />
                <Label style={{ color: C.accent }}>Buscar no YouTube</Label>
              </Pressable>
            )}
            {editing && <Pressable onPress={() => setEditing(false)} hitSlop={10}><Label style={{ color: C.accent }}>Pronto ✓</Label></Pressable>}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {s.apps.map((k) => {
              const a = CAT[k];
              if (!a) return null;
              return (
                <View key={k} style={{ width: tileW }}>
                  <Btn label={a.name} onPressIn={() => openApp(k)} style={{ height: 64, borderRadius: 15, gap: 5 }}>
                    {launching === k ? <ActivityIndicator size={26} color={a.color} /> : <a.Icon size={26} color={a.color} />}
                    <Text style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: 0.8, color: launching === k ? C.ink : C.mute, textTransform: 'uppercase' }} numberOfLines={1}>{launching === k ? 'Abrindo…' : a.name}</Text>
                  </Btn>
                  {editing && (
                    <Pressable onPress={() => setS((p) => ({ ...p, apps: p.apps.filter((x) => x !== k) }))} hitSlop={8}
                      style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
                      <X size={12} color="#fff" weight="bold" />
                    </Pressable>
                  )}
                </View>
              );
            })}
            {editing && s.apps.length < 8 && (
              <View style={{ width: tileW }}>
                <Pressable onPress={() => setPick(true)} style={{ height: 64, borderRadius: 15, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.keyHi, alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={22} color={C.mute} />
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {toastMsg !== '' && (
        <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 6, alignSelf: 'center', backgroundColor: C.ink, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, maxWidth: '90%' }}>
          <Text style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 0.6, color: C.bg }} numberOfLines={2}>{toastMsg}</Text>
        </View>
      )}

      <KeyboardSheet open={kb} onClose={() => setKb(false)} toast={toast} />
      <YtSheet open={ytOpen} onClose={() => setYtOpen(false)} s={s} setS={setS} toast={toast} />
      <VoiceSheet open={voice} onClose={() => setVoice(false)} run={run} />

      <Sheet open={pick} onClose={() => setPick(false)} title="Adicionar app">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {Object.values(CAT).filter((a) => !s.apps.includes(a.key)).map((a) => (
            <View key={a.key} style={{ width: tileW }}>
              <Btn onPress={() => { setS((p) => ({ ...p, apps: [...p.apps, a.key] })); setPick(false); }} style={{ height: 64, borderRadius: 15, gap: 5 }}>
                <a.Icon size={26} color={a.color} />
                <Text style={{ fontFamily: F.mono, fontSize: 9, letterSpacing: 0.8, color: C.mute, textTransform: 'uppercase' }} numberOfLines={1}>{a.name}</Text>
              </Btn>
            </View>
          ))}
        </View>
      </Sheet>

      <Sheet open={cfg} onClose={() => setCfg(false)} title="Configurações">
        <Row label="Editar apps" onPress={() => { setEditing(true); setCfg(false); }} right={<Pencil size={18} color={C.mute} />} />
        <Row label="Vibrar ao tocar" right={<Switch value={s.vib} onValueChange={(v) => setS((p) => ({ ...p, vib: v }))} trackColor={{ true: C.accent, false: C.keyHi }} thumbColor="#fff" />} />
        <Row label="Trocar lado de volume e canal" right={<Switch value={s.flip} onValueChange={(v) => setS((p) => ({ ...p, flip: v }))} trackColor={{ true: C.accent, false: C.keyHi }} thumbColor="#fff" />} />
        <Row label={`Versão ${currentVersion()}`} sub={prog >= 0 ? `Baixando ${Math.round(prog * 100)}%` : updMsg || (upd ? 'Nova versão ' + upd.version : '')} onPress={upd ? doInstall : doCheck}
          right={<Label style={{ color: C.accent }}>{upd ? 'Atualizar' : 'Verificar'}</Label>} />
        <Row label={`TV · ${tvSaved?.name ?? ''}`} sub={`${tvSaved?.ip ?? ''}${tvSaved?.model ? ' · ' + tvSaved.model : ''}`} onPress={() => { setCfg(false); onChangeTv(); }} right={<Label style={{ color: C.accent }}>Trocar</Label>} />
      </Sheet>
    </View>
  );
}

const pill = { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: C.panel, borderRadius: 44, height: 88, paddingHorizontal: 10, gap: 12 };
const round = { width: 64, height: 64, borderRadius: 32 };

function Row({ label, sub, right, onPress }: { label: string; sub?: string; right?: React.ReactNode; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.key, gap: 12 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.mono, fontSize: 12, letterSpacing: 0.4, color: C.ink }}>{label}</Text>
        {sub ? <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.mute, marginTop: 2 }}>{sub}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

function KeyboardSheet({ open, onClose, toast }: { open: boolean; onClose: () => void; toast: (m: string) => void }) {
  const [t, setT] = useState('');
  const [prog, setProg] = useState<[number, number] | null>(null);
  const [go, setGo] = useState(true);
  const [layKey, setLayKey] = useState(LAYOUTS[0].key);
  const lay = LAYOUTS.find((l) => l.key === layKey) ?? LAYOUTS[0];
  const stop = useRef(false);
  const send = () => {
    if (!t) return;
    toast(tv.text(t) ? 'Enviado à TV: ' + t : 'TV desconectada');
    setT('');
  };
  // Teclado desenhado pelo app da TV (YouTube): navega com as setas, letra por letra.
  const typeApp = async () => {
    if (!t.trim() || prog) return;
    const { keys, skipped } = plan(lay, t, go);
    if (!keys.length) { toast('Nada pra digitar'); return; }
    stop.current = false;
    setProg([0, keys.length]);
    const done = await tv.typeKeys(keys, (n) => setProg([n, keys.length]), () => stop.current);
    setProg(null);
    if (done) { toast(skipped.length ? 'Pronto. Ignorei: ' + skipped.join(' ') : 'Pronto'); setT(''); }
    else toast(stop.current ? 'Parei. O foco na TV ficou onde estava' : 'A TV não respondeu');
  };
  useEffect(() => { if (!open) stop.current = true; }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title="Teclado">
      <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.mute, lineHeight: 17 }}>
        Caixa de texto comum da TV: abra a busca, digite aqui e toque em Enviar. Teclado desenhado pelo app: escolha o app abaixo. {lay.hint}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {LAYOUTS.map((l) => (
          <Pressable key={l.key} onPress={() => setLayKey(l.key)} style={{ paddingHorizontal: 14, height: 34, borderRadius: 17, justifyContent: 'center', backgroundColor: l.key === layKey ? C.accent : C.key }}>
            <Text style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 0.8, color: l.key === layKey ? '#fff' : C.mute, textTransform: 'uppercase' }}>{l.name}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TextInput
          value={t} onChangeText={setT} autoFocus={open} placeholder="Digite aqui…" placeholderTextColor={C.mute}
          returnKeyType="send" onSubmitEditing={send} autoCorrect={false}
          style={{ flex: 1, height: 52, borderRadius: 14, borderWidth: 1, borderColor: C.keyHi, backgroundColor: C.bg, color: C.ink, fontFamily: F.mono, fontSize: 15, paddingHorizontal: 14 }}
        />
        <Btn onPress={send} bg={C.accent} edge={C.accentEdge} style={{ height: 52, paddingHorizontal: 20, borderRadius: 14 }}>
          <Text style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 1.2, color: '#fff', textTransform: 'uppercase' }}>Enviar</Text>
        </Btn>
      </View>
      <Btn onPress={prog ? () => { stop.current = true; } : typeApp} style={{ height: 48, borderRadius: 14 }}>
        <Label style={{ color: C.ink }}>{prog ? `Digitando ${prog[0]}/${prog[1]} · toque pra parar` : `Digitar no ${lay.name} (setas)`}</Label>
      </Btn>
      {lay.search && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.mute }}>Apertar Pesquisar no fim</Text>
          <Switch value={go} onValueChange={setGo} trackColor={{ true: C.accent, false: C.keyHi }} thumbColor="#fff" />
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Btn onPress={() => tv.key(KEY.ok)} style={{ flex: 1, height: 44, borderRadius: 13 }}><Label style={{ color: C.ink }}>Enter na TV</Label></Btn>
        <Btn onPress={() => tv.key(KEY.back)} style={{ flex: 1, height: 44, borderRadius: 13 }}><Label style={{ color: C.ink }}>Voltar</Label></Btn>
      </View>
    </Sheet>
  );
}

function VoiceSheet({ open, onClose, run }: { open: boolean; onClose: () => void; run: (a: Action) => void }) {
  const [phase, setPhase] = useState<'idle' | 'listening' | 'done' | 'fail'>('idle');
  const [said, setSaid] = useState('');
  const [act, setAct] = useState<Action | null>(null);
  const got = useRef(false);

  const finish = (text: string) => {
    got.current = true;
    const a = interpret(text);
    setSaid(text); setAct(a); setPhase('done'); run(a);
  };

  useSpeechRecognitionEvent('result', (e) => {
    const tx = e.results?.[0]?.transcript ?? '';
    if (!tx) return;
    setSaid(tx);
    if (e.isFinal) finish(tx);
  });
  useSpeechRecognitionEvent('end', () => { if (!got.current) setPhase((p) => (p === 'listening' ? 'fail' : p)); });
  useSpeechRecognitionEvent('error', () => setPhase('fail'));

  const start = async () => {
    got.current = false; setSaid(''); setAct(null);
    if (DEMO) { setPhase('fail'); return; }
    const p = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!p.granted) { setPhase('fail'); return; }
    setPhase('listening');
    ExpoSpeechRecognitionModule.start({ lang: 'pt-BR', interimResults: true, continuous: false });
  };

  useEffect(() => {
    if (open) { setPhase('idle'); setSaid(''); setAct(null); got.current = false; if (!DEMO) start(); }
    else { try { ExpoSpeechRecognitionModule.abort(); } catch {} }
  }, [open]);

  const msg = phase === 'listening' ? (said || 'Ouvindo…') : phase === 'done' ? `“${said}”` : phase === 'fail' ? 'Não consegui ouvir. Toque no microfone e tente de novo.' : 'Toque no microfone e fale';
  const demoChips = ['aumenta o volume', 'abre a netflix', 'procura por stranger things', 'muda o canal', 'silencia'];

  return (
    <Sheet open={open} onClose={onClose} title="Voz">
      <View style={{ alignItems: 'center', gap: 14 }}>
        <Btn onPress={start} bg={C.accent} edge={C.accentEdge} label="Falar" style={{ width: 96, height: 96, borderRadius: 48, opacity: phase === 'listening' ? 0.85 : 1 }}>
          <Microphone size={40} color="#fff" weight="fill" />
        </Btn>
        <Text style={{ fontFamily: F.mono, fontSize: phase === 'done' || phase === 'listening' ? 17 : 13, color: phase === 'fail' || phase === 'idle' ? C.mute : C.ink, textAlign: 'center', minHeight: 48 }}>{msg}</Text>
        {act && <View style={{ backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 7 }}><Text style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 1, color: C.accent, textTransform: 'uppercase' }}>→ {act.label}</Text></View>}
        {DEMO && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {demoChips.map((c) => (
              <Btn key={c} onPress={() => finish(c)} style={{ height: 34, paddingHorizontal: 12, borderRadius: 17 }}><Text style={{ fontFamily: F.mono, fontSize: 10, color: C.mute }}>{c}</Text></Btn>
            ))}
          </View>
        )}
      </View>
    </Sheet>
  );
}
