import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_APPS } from './apps';

export type SavedTv = { ip: string; name: string; model: string; mac: string; token?: string };
export type Settings = { tv?: SavedTv; apps: string[]; vib: boolean; flip: boolean };

const KEY = 'controle-tv:v1';
export const DEFAULTS: Settings = { apps: DEFAULT_APPS, vib: true, flip: true };

export async function load(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export async function save(s: Settings) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}
