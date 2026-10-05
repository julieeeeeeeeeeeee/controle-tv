import React from 'react';
import {
  Popcorn, YoutubeLogo, PlayCircle, CastleTurret, FilmSlate, AppleLogo, SpotifyLogo,
  TwitchLogo, Sword, Mountains, Planet, GlobeHemisphereWest,
} from 'phosphor-react-native';

export type AppDef = {
  key: string; name: string; color: string;
  Icon: React.ComponentType<{ size?: number; color?: string; weight?: any }>;
  match: string[]; // pedaços do nome que a TV usa na lista de apps instalados (quando ela responde)
  ids: string[];   // códigos do app na TV, em ordem. O app testa cada um e usa o que existir nessa TV
};

export const CAT: Record<string, AppDef> = {
  netflix: { key: 'netflix', name: 'Netflix', color: '#E50914', Icon: Popcorn, match: ['netflix'], ids: ['3201907018807', '11101200001'] },
  youtube: { key: 'youtube', name: 'YouTube', color: '#FF0000', Icon: YoutubeLogo, match: ['youtube'], ids: ['111299001912'] },
  primevideo: { key: 'primevideo', name: 'Prime', color: '#00A8E1', Icon: PlayCircle, match: ['prime video', 'amazon'], ids: ['3201910019365', '3201512006785'] },
  disneyplus: { key: 'disneyplus', name: 'Disney+', color: '#4D7CFF', Icon: CastleTurret, match: ['disney'], ids: ['3201901017640'] },
  hbomax: { key: 'hbomax', name: 'Max', color: '#7C5CFF', Icon: FilmSlate, match: ['hbo', 'max'], ids: ['3202301029760', '3201601007230'] },
  appletv: { key: 'appletv', name: 'Apple TV', color: '#F1ECE2', Icon: AppleLogo, match: ['apple tv'], ids: ['3201807016597'] },
  spotify: { key: 'spotify', name: 'Spotify', color: '#1DB954', Icon: SpotifyLogo, match: ['spotify'], ids: ['3201606009684'] },
  twitch: { key: 'twitch', name: 'Twitch', color: '#9146FF', Icon: TwitchLogo, match: ['twitch'], ids: ['3202203026841'] },
  crunchyroll: { key: 'crunchyroll', name: 'Crunchyroll', color: '#F47521', Icon: Sword, match: ['crunchyroll'], ids: ['3202302030097'] },
  paramountplus: { key: 'paramountplus', name: 'Paramount+', color: '#3D8BFF', Icon: Mountains, match: ['paramount'], ids: ['3202110025305', '3201710014981'] },
  plutotv: { key: 'plutotv', name: 'Pluto', color: '#FFE600', Icon: Planet, match: ['pluto'], ids: ['3201808016802'] },
  globoplay: { key: 'globoplay', name: 'Globoplay', color: '#FF4A4A', Icon: GlobeHemisphereWest, match: ['globoplay', 'globo'], ids: ['3201908019022'] },
};

export const DEFAULT_APPS = ['netflix', 'youtube', 'primevideo', 'disneyplus', 'hbomax', 'globoplay', 'spotify'];
