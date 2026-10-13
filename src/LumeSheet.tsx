import React, { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { Microphone, Bell } from 'phosphor-react-native';
import { C, F } from './theme';
import { Btn, Sheet } from './ui';
import { DEMO } from './tv';
import { LumeCfg, chamar, loadLume, pedir, saveLume } from './lume';

// Falar com a Lume de qualquer lugar: o celular transcreve (reconhecimento do próprio Android) e manda o texto pro tablet.
export default function LumeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [cfg, setCfg] = useState<LumeCfg>({ canal: '', nome: '' });
  const [fase, setFase] = useState<'idle' | 'ouvindo' | 'enviando' | 'ok' | 'falha'>('idle');
  const [said, setSaid] = useState('');
  const [msg, setMsg] = useState('');
  const got = useRef(false);

  useEffect(() => {
    if (open) { loadLume().then(setCfg); setFase('idle'); setSaid(''); setMsg(''); }
    else { try { ExpoSpeechRecognitionModule.abort(); } catch {} }
  }, [open]);

  const pronto = cfg.canal.trim().length > 10;
  const mudar = (p: Partial<LumeCfg>) => { const n = { ...cfg, ...p }; setCfg(n); saveLume(n); };

  const enviar = async (texto: string) => {
    got.current = true; setSaid(texto); setFase('enviando'); setMsg('Mandando pra Lume…');
    try {
      const fala = await pedir(cfg, texto);
      if (fala) { setFase('ok'); setMsg(fala); } else { setFase('falha'); setMsg('A Lume não respondeu. O tablet está ligado e com internet?'); }
    } catch { setFase('falha'); setMsg('Não consegui falar com a Lume. Confira o canal e a internet.'); }
  };

  useSpeechRecognitionEvent('result', (e) => {
    if (fase !== 'ouvindo') return;
    const tx = e.results?.[0]?.transcript ?? '';
    if (!tx) return;
    setSaid(tx);
    if (e.isFinal) enviar(tx);
  });
  useSpeechRecognitionEvent('end', () => { if (!got.current) setFase((p) => (p === 'ouvindo' ? 'falha' : p)); });
  useSpeechRecognitionEvent('error', () => { if (!got.current) { setFase('falha'); setMsg('Não consegui ouvir. Toque no microfone e tente de novo.'); } });

  const falar = async () => {
    if (!pronto || DEMO) return;
    got.current = false; setSaid(''); setMsg('');
    const p = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!p.granted) { setFase('falha'); setMsg('Preciso da permissão do microfone.'); return; }
    setFase('ouvindo');
    ExpoSpeechRecognitionModule.start({ lang: 'pt-BR', interimResults: true, continuous: false });
  };

  const chamarSala = async () => {
    if (!pronto) return;
    setFase('enviando'); setSaid(''); setMsg('Chamando… (espero até 1 minuto o "Estou aqui")');
    try {
      const viu = await chamar(cfg, 'Atende o telefone!');
      setFase(viu ? 'ok' : 'falha'); setMsg(viu ? 'Viram o seu chamado.' : 'Chamei, mas ninguém tocou em "Estou aqui".');
    } catch { setFase('falha'); setMsg('Não consegui chamar. Confira o canal e a internet.'); }
  };

  const campo = { fontFamily: F.mono, fontSize: 12, color: C.ink, backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'stretch' } as const;
  const texto = fase === 'ouvindo' ? (said || 'Ouvindo…') : said ? `“${said}”` : 'Toque no microfone e fale com a Lume';

  return (
    <Sheet open={open} onClose={onClose} title="Lume">
      <View style={{ alignItems: 'center', gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <Btn onPress={falar} bg={C.accent} edge={C.accentEdge} label="Falar com a Lume" style={{ width: 96, height: 96, borderRadius: 48, opacity: !pronto || fase === 'ouvindo' ? 0.7 : 1 }}>
            <Microphone size={40} color="#fff" weight="fill" />
          </Btn>
          <Btn onPress={chamarSala} label="Chamar a sala" style={{ width: 64, height: 64, borderRadius: 32 }}>
            <Bell size={28} color={C.ink} />
          </Btn>
        </View>
        <Text style={{ fontFamily: F.mono, fontSize: 15, color: C.ink, textAlign: 'center' }}>{texto}</Text>
        {!!msg && <Text style={{ fontFamily: F.mono, fontSize: 14, color: fase === 'falha' ? C.mute : C.accent, textAlign: 'center', minHeight: 40 }}>{msg}</Text>}
        {!pronto && <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.mute, textAlign: 'center' }}>Cole abaixo o canal da Lume (ele fica só no seu celular).</Text>}
        <TextInput value={cfg.canal} onChangeText={(t) => mudar({ canal: t })} placeholder="canal da Lume" placeholderTextColor={C.mute} autoCapitalize="none" autoCorrect={false} style={campo} />
        <TextInput value={cfg.nome} onChangeText={(t) => mudar({ nome: t })} placeholder="seu nome (a Lume diz quem chamou)" placeholderTextColor={C.mute} style={campo} />
      </View>
    </Sheet>
  );
}
