import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { MagnifyingGlass, YoutubeLogo } from 'phosphor-react-native';
import { C, F } from './theme';
import { Btn, Label, Sheet } from './ui';
import { tv } from './tv';
import { Settings } from './store';
import { Video, isOnline, pairCode, playVideo, searchVideos } from './yt';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const input = { flex: 1, height: 52, borderRadius: 14, borderWidth: 1, borderColor: C.keyHi, backgroundColor: C.bg, color: C.ink, fontFamily: F.mono, fontSize: 15, paddingHorizontal: 14 };
const hint = { fontFamily: F.mono, fontSize: 11, color: C.mute, lineHeight: 17 };

// Busca no YouTube pelo celular e manda o vídeo escolhido para a TV.
export default function YtSheet({ open, onClose, s, setS, toast }: {
  open: boolean; onClose: () => void; s: Settings; setS: (f: (p: Settings) => Settings) => void; toast: (m: string) => void;
}) {
  const { height } = useWindowDimensions();
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Video[] | null>(null);
  const [busy, setBusy] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const yt = s.yt;

  const search = async () => {
    const t = q.trim();
    if (!t) return;
    setBusy('search'); setMsg('');
    try {
      const r = await searchVideos(t);
      setRes(r);
      if (!r.length) setMsg('Nada encontrado.');
    } catch { setMsg('Não consegui buscar. Confira a internet do celular.'); }
    setBusy('');
  };

  const pair = async () => {
    setBusy('pair'); setMsg('');
    try {
      const p = await pairCode(code);
      setS((x) => ({ ...x, yt: p }));
      setCode('');
    } catch { setMsg('Código não aceito. Confira os números e se a tela do código ainda está aberta na TV.'); }
    setBusy('');
  };

  const play = async (v: Video) => {
    if (!yt || busy) return;
    setBusy(v.id); setMsg('');
    try {
      if (!(await isOnline(yt.id))) {
        toast('Abrindo o YouTube na TV…');
        if ((await tv.launch('youtube')) === 'fail') throw new Error('tv');
        let ok = false;
        for (let i = 0; i < 10 && !ok; i++) { await sleep(1500); ok = await isOnline(yt.id); }
        if (!ok) throw new Error('tv');
      }
      if (await playVideo(yt.id, v.id)) { toast('Tocando na TV: ' + v.title); onClose(); }
      else setMsg('A TV não aceitou o vídeo. Tente de novo.');
    } catch { setMsg('A TV não respondeu. Veja se está ligada e com o YouTube instalado.'); }
    setBusy('');
  };

  return (
    <Sheet open={open} onClose={onClose} title="YouTube na TV"
      right={yt ? <Pressable onPress={() => { setS((x) => ({ ...x, yt: undefined })); setRes(null); }} hitSlop={10}><Label>Desvincular</Label></Pressable> : undefined}>
      {!yt ? (
        <>
          <Text style={hint}>Só uma vez: na TV, abra o YouTube › Configurações › Vincular com código de TV e digite aqui os números que aparecerem.</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput value={code} onChangeText={setCode} keyboardType="number-pad" placeholder="000 000 000 000" placeholderTextColor={C.mute} style={input} />
            <Btn onPress={pair} bg={C.accent} edge={C.accentEdge} style={{ height: 52, paddingHorizontal: 20, borderRadius: 14 }}>
              {busy === 'pair' ? <ActivityIndicator color="#fff" /> : <Text style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 1.2, color: '#fff', textTransform: 'uppercase' }}>Ligar</Text>}
            </Btn>
          </View>
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput value={q} onChangeText={setQ} autoFocus={open} placeholder="O que quer assistir?" placeholderTextColor={C.mute}
              returnKeyType="search" onSubmitEditing={search} autoCorrect={false} style={input} />
            <Btn onPress={search} bg={C.accent} edge={C.accentEdge} label="Buscar" style={{ height: 52, width: 56, borderRadius: 14 }}>
              {busy === 'search' ? <ActivityIndicator color="#fff" /> : <MagnifyingGlass size={22} color="#fff" weight="bold" />}
            </Btn>
          </View>
          {res && res.length > 0 && (
            <ScrollView style={{ maxHeight: height * 0.45 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {res.map((v) => (
                <Pressable key={v.id} onPress={() => play(v)} style={{ flexDirection: 'row', gap: 12, paddingVertical: 8, alignItems: 'center', opacity: busy && busy !== v.id ? 0.4 : 1 }}>
                  <View>
                    <Image source={{ uri: `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg` }} style={{ width: 112, height: 63, borderRadius: 8, backgroundColor: C.key }} />
                    {v.length !== '' && (
                      <View style={{ position: 'absolute', right: 4, bottom: 4, backgroundColor: 'rgba(0,0,0,.8)', borderRadius: 4, paddingHorizontal: 4 }}>
                        <Text style={{ fontFamily: F.mono, fontSize: 9, color: '#fff' }}>{v.length}</Text>
                      </View>
                    )}
                    {busy === v.id && (
                      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,.55)', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator color="#fff" />
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.monoMed, fontSize: 12, color: C.ink, lineHeight: 16 }} numberOfLines={2}>{v.title}</Text>
                    <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.mute, marginTop: 3 }} numberOfLines={1}>{v.channel}</Text>
                  </View>
                  <YoutubeLogo size={20} color={C.accent} weight="fill" />
                </Pressable>
              ))}
            </ScrollView>
          )}
          {!res && <Text style={hint}>Busque, toque no vídeo e ele abre na TV. Ligado a: {yt.name}.</Text>}
        </>
      )}
      {msg !== '' && <Text style={{ ...hint, color: C.accent }}>{msg}</Text>}
    </Sheet>
  );
}
