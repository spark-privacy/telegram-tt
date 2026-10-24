// Name of the `BroadcastChannel` that connects the demo console helper in the page
// with the mocked client running inside the API worker
export const DEMO_BROADCAST_CHANNEL = 'telegram-tt-demo';

export const DEMO_PEER_IDS = {
  anna: '101',
  igor: '102',
  mama: '103',
  pavel: '104',
  group: '301',
} as const;

export type DemoPeerName = keyof typeof DEMO_PEER_IDS;

export type DemoRequest = {
  action: 'message';
  chatId: string;
  text?: string;
} | {
  action: 'posts';
  count?: number;
  delayMs?: number;
};
