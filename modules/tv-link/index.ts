import { requireOptionalNativeModule } from 'expo';

export type Found = { ip: string; name: string; model: string; mac: string; power: string };
type Sub = { remove: () => void };

type Native = {
  connect(url: string): void;
  send(text: string): boolean;
  close(): void;
  discover(): Promise<Found[]>;
  wake(mac: string): Promise<boolean>;
  info(ip: string): Promise<Found | null>;
  addListener(event: 'onOpen' | 'onMessage' | 'onClose' | 'onError', cb: (e: any) => void): Sub;
};

// null no navegador/web (sem o módulo nativo): o app entra em modo demonstração.
export const TvLink = requireOptionalNativeModule<Native>('TvLink');
