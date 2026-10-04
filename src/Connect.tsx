import React, { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, PermissionsAndroid, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowClockwise, Television } from 'phosphor-react-native';
import { C, F } from './theme';
import { Btn, Label } from './ui';
import { discover, tv } from './tv';
import { SavedTv } from './store';

type Found = { ip: string; name: string; model: string; mac: string };

export default function Connect({ onDone, current }: { onDone: (t: SavedTv) => void; current?: SavedTv }) {
  const insets = useSafeAreaInsets();
  const st = useSyncExternalStore((cb) => tv.subscribe(cb), () => tv.status + '|' + tv.detail);
  const [status, detail] = st.split('|');
  const [list, setList] = useState<Found[]>([]);
  const [scanning, setScanning] = useState(false);
  const [ip, setIp] = useState(current?.ip ?? '');
  const [target, setTarget] = useState<Found | null>(null);

  const scan = useCallback(async () => {
    setScanning(true);
    // Android 17+: acessar aparelhos da rede de casa pede permissão ("Dispositivos por perto")
    if (Platform.OS === 'android' && Number(Platform.Version) >= 37) {
      try { await PermissionsAndroid.request('android.permission.ACCESS_LOCAL_NETWORK' as any); } catch {}
    }
    setList(await discover());
    setScanning(false);
  }, []);
  useEffect(() => { scan(); }, [scan]);

  const go = (f: Found) => {
    setTarget(f);
    tv.disconnect();
    tv.connect({ ip: f.ip, token: current?.ip === f.ip ? current.token : undefined });
  };

  // quando a TV aceita, guarda e segue
  useEffect(() => {
    if (status === 'on' && target) {
      onDone({ ip: target.ip, name: target.name || 'TV Samsung', model: target.model, mac: target.mac, token: tv.token });
    }
  }, [status, target]);

  const busy = !!target && (status === 'connecting' || status === 'pairing');

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16, paddingHorizontal: 20 }}>
      <ScrollView contentContainerStyle={{ gap: 18 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: F.display, fontSize: 40, color: C.ink, letterSpacing: 0.5 }}>CONECTAR À TV</Text>
          <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.mute, lineHeight: 18 }}>
            Ligue a TV e deixe o celular no mesmo Wi-Fi dela.
          </Text>
        </View>

        {busy ? (
          <View style={{ backgroundColor: C.panel, borderRadius: 20, padding: 22, gap: 12, alignItems: 'center' }}>
            <ActivityIndicator color={C.accent} />
            <Text style={{ fontFamily: F.monoMed, fontSize: 14, color: C.ink, textAlign: 'center' }}>
              {status === 'pairing' ? 'Olhe a TV e aperte Permitir' : 'Conectando…'}
            </Text>
            <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.mute, textAlign: 'center' }}>
              Na primeira vez a TV mostra um aviso na tela. Use o controle original pra aceitar.
            </Text>
            <Pressable onPress={() => { tv.disconnect(); setTarget(null); }}><Label style={{ color: C.accent }}>Cancelar</Label></Pressable>
          </View>
        ) : (
          <>
            {status === 'error' && target && (
              <View style={{ backgroundColor: C.panel, borderRadius: 14, padding: 14 }}>
                <Text style={{ fontFamily: F.mono, fontSize: 12, color: C.accent, lineHeight: 18 }}>{detail || 'Não consegui conectar.'}</Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Label>{scanning ? 'Procurando na rede…' : list.length ? 'TVs encontradas' : 'Nenhuma TV encontrada'}</Label>
              <Pressable onPress={scan} hitSlop={10} disabled={scanning} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', opacity: scanning ? 0.4 : 1 }}>
                <ArrowClockwise size={14} color={C.mute} /><Label>Procurar de novo</Label>
              </Pressable>
            </View>

            {scanning && list.length === 0 && <ActivityIndicator color={C.accent} style={{ alignSelf: 'flex-start' }} />}

            {list.map((f) => (
              <Btn key={f.ip} onPress={() => go(f)} style={{ borderRadius: 18, padding: 16, alignItems: 'flex-start' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, alignSelf: 'stretch' }}>
                  <Television size={28} color={C.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.monoMed, fontSize: 14, color: C.ink }} numberOfLines={1}>{f.name || 'TV Samsung'}</Text>
                    <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.mute, marginTop: 3 }}>{f.ip}{f.model ? ' · ' + f.model : ''}</Text>
                  </View>
                </View>
              </Btn>
            ))}

            <View style={{ gap: 10, marginTop: 6 }}>
              <Label>Ou digite o endereço da TV</Label>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  value={ip} onChangeText={setIp} placeholder="192.168.0.14" placeholderTextColor={C.mute}
                  keyboardType="numbers-and-punctuation" autoCorrect={false}
                  style={{ flex: 1, height: 52, borderRadius: 14, borderWidth: 1, borderColor: C.keyHi, backgroundColor: C.panel, color: C.ink, fontFamily: F.mono, fontSize: 15, paddingHorizontal: 14 }}
                />
                <Btn bg={C.accent} edge={C.accentEdge} onPress={() => /^\d+\.\d+\.\d+\.\d+$/.test(ip.trim()) && go({ ip: ip.trim(), name: 'TV Samsung', model: '', mac: '' })} style={{ height: 52, paddingHorizontal: 20, borderRadius: 14 }}>
                  <Text style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: 1.2, color: '#fff', textTransform: 'uppercase' }}>Conectar</Text>
                </Btn>
              </View>
              <Text style={{ fontFamily: F.mono, fontSize: 10, color: C.mute, lineHeight: 16 }}>
                Na TV: Configurações → Geral → Rede → Status da rede. O endereço aparece como IP.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
