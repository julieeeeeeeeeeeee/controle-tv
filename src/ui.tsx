import React, { useEffect, useMemo, useRef } from 'react';
import { Modal, PanResponder, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle, KeyboardAvoidingView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ArrowsLeftRight, CaretDown, CaretLeft, CaretRight, CaretUp, DotOutline } from 'phosphor-react-native';
import { C, F } from './theme';
import { KEY } from './keys';

let vibrate = true;
export const setVibrate = (v: boolean) => { vibrate = v; };
export const buzz = () => { if (vibrate) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); };

// Propriedades de tamanho/posição ficam na caixa de fora; o resto (cor, borda, alinhamento) vai no botão.
const OUTER = ['width', 'height', 'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'margin', 'marginTop', 'marginBottom',
  'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical', 'minWidth', 'maxWidth'];

// Botão com relevo: uma "base" escura fica parada atrás e o botão afunda 3px quando apertado.
export function Btn({ children, onPress, style, bg = C.key, edge = C.edge, onPressIn, onPressOut, label }: {
  children: React.ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; bg?: string; edge?: string;
  onPressIn?: () => void; onPressOut?: () => void; label?: string;
}) {
  const flat: any = StyleSheet.flatten(style) || {};
  const outer: any = {};
  const face: any = {};
  for (const k of Object.keys(flat)) (OUTER.includes(k) ? outer : face)[k] = flat[k];
  if (outer.height != null) face.height = '100%';
  if (outer.width != null) face.width = '100%';
  if (outer.flex != null) face.flex = 1;
  const flatBtn = bg === 'transparent';
  return (
    <View style={outer}>
      {!flatBtn && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 3, bottom: -3, borderRadius: face.borderRadius ?? 0, backgroundColor: edge }} />
      )}
      <Pressable
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={() => { buzz(); onPressIn?.(); }}
        onPressOut={onPressOut}
        style={({ pressed }) => [
          { backgroundColor: flatBtn && pressed ? C.key : bg, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: pressed && !flatBtn ? 3 : 0 }] },
          face,
        ]}
      >
        {children}
      </Pressable>
    </View>
  );
}

// Segurar repete (volume, canal).
export function useHold(fn: () => void) {
  const f = useRef(fn);
  f.current = fn;
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const i = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const stop = () => { clearTimeout(t.current); clearInterval(i.current); };
  useEffect(() => stop, []);
  return {
    onPressIn: () => { f.current(); stop(); t.current = setTimeout(() => { i.current = setInterval(() => f.current(), 170); }, 420); },
    onPressOut: stop,
  };
}

export function Label({ children, style }: { children: React.ReactNode; style?: any }) {
  return <Text style={[{ fontFamily: F.mono, fontSize: 10, letterSpacing: 1.4, color: C.mute, textTransform: 'uppercase' }, style]}>{children}</Text>;
}

export function Sheet({ open, onClose, title, children, right }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: 'rgba(10,9,8,.72)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={{ backgroundColor: C.panel, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18, paddingBottom: 28, gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label>{title}</Label>
            {right ?? (
              <Pressable onPress={onClose} hitSlop={10}><Label>Fechar</Label></Pressable>
            )}
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Área de deslizar: arrasta = setas, toque = OK (na hora, sem esperar).
export function Touchpad({ size, onKey }: { size: number; onKey: (k: string) => void }) {
  const cb = useRef(onKey);
  cb.current = onKey;
  const st = useRef({ x: 0, y: 0, moved: false, t: 0 });

  const pan = useMemo(() => {
    const STEP = 36;
    const dir = (dx: number, dy: number) => (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? KEY.right : KEY.left) : (dy > 0 ? KEY.down : KEY.up));
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { st.current = { x: 0, y: 0, moved: false, t: Date.now() }; },
      onPanResponderMove: (_, g) => {
        const s = st.current;
        const dx = g.dx - s.x;
        const dy = g.dy - s.y;
        if (Math.abs(dx) >= STEP || Math.abs(dy) >= STEP) {
          cb.current(dir(dx, dy));
          buzz();
          s.x = g.dx; s.y = g.dy; s.moved = true;
        }
      },
      onPanResponderRelease: (_, g) => {
        const s = st.current;
        const dist = Math.hypot(g.dx, g.dy);
        if (!s.moved && dist >= 14) { cb.current(dir(g.dx, g.dy)); buzz(); return; }
        if (!s.moved && dist < 10 && Date.now() - s.t < 350) { cb.current(KEY.ok); buzz(); }
      },
    });
  }, []);

  const edge = { position: 'absolute' as const };
  const legend: [React.ReactNode, string][] = [
    [<ArrowsLeftRight key="a" size={11} color={C.mute} />, 'deslize · navega'],
    [<DotOutline key="b" size={11} color={C.mute} />, 'toque · OK'],
  ];
  return (
    <View {...pan.panHandlers} style={{ width: size, height: size, borderRadius: 32, backgroundColor: C.panel, borderWidth: 1, borderColor: '#17150f' }}>
      <CaretUp size={26} color={C.keyHi} weight="bold" style={{ ...edge, top: 14, left: size / 2 - 13 }} />
      <CaretDown size={26} color={C.keyHi} weight="bold" style={{ ...edge, bottom: 14, left: size / 2 - 13 }} />
      <CaretLeft size={26} color={C.keyHi} weight="bold" style={{ ...edge, left: 14, top: size / 2 - 13 }} />
      <CaretRight size={26} color={C.keyHi} weight="bold" style={{ ...edge, right: 14, top: size / 2 - 13 }} />
      <View style={{ ...edge, top: size / 2 - 42, left: size / 2 - 42, width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: C.keyHi, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: F.display, fontSize: 24, color: C.keyHi, letterSpacing: 1.5 }}>OK</Text>
      </View>
      <View pointerEvents="none" style={{ ...edge, left: 16, bottom: 14, gap: 4 }}>
        {legend.map(([icon, txt], i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.85 }}>
            {icon}
            <Text style={{ fontFamily: F.mono, fontSize: 8.5, letterSpacing: 0.8, color: C.mute, textTransform: 'uppercase' }}>{txt}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
