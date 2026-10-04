import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { BigShouldersDisplay_700Bold, BigShouldersDisplay_900Black } from '@expo-google-fonts/big-shoulders-display';
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import { C } from './src/theme';
import { DEFAULTS, load, save, Settings, SavedTv } from './src/store';
import { tv } from './src/tv';
import Remote from './src/Remote';
import Connect from './src/Connect';

export default function App() {
  const [fontsOk] = useFonts({ BigShouldersDisplay_700Bold, BigShouldersDisplay_900Black, IBMPlexMono_400Regular, IBMPlexMono_500Medium });
  const [s, setSRaw] = useState<Settings | null>(null);
  const [pickingTv, setPickingTv] = useState(false);
  const ref = useRef<Settings>(DEFAULTS);

  const setS = useCallback((f: (p: Settings) => Settings) => {
    const next = f(ref.current);
    ref.current = next;
    setSRaw(next);
    save(next);
  }, []);

  // abre o app: carrega o que foi salvo e reconecta na TV de sempre
  useEffect(() => {
    load().then((l) => {
      ref.current = l;
      setSRaw(l);
      if (l.tv) {
        tv.connect({ ip: l.tv.ip, token: l.tv.token, onToken: (token) => setS((p) => (p.tv ? { ...p, tv: { ...p.tv, token } } : p)) });
      }
    });
  }, [setS]);

  // volta pro app: garante que ainda está conectado
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') tv.reconnect(); });
    return () => sub.remove();
  }, []);

  const connected = useCallback((t: SavedTv) => {
    setS((p) => ({ ...p, tv: t }));
    setPickingTv(false);
  }, [setS]);

  if (!fontsOk || !s) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {!s.tv || pickingTv
        ? <Connect onDone={connected} current={s.tv} />
        : <Remote s={s} setS={setS} onChangeTv={() => { tv.disconnect(); setPickingTv(true); }} />}
    </SafeAreaProvider>
  );
}
