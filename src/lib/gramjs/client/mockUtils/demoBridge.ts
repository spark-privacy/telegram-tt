import type TelegramClient from '../MockClient';
import type { DemoRequest } from './demoChannel';
import type { MockDialog, MockTypes } from './MockTypes';

import Api from '../../tl/api';
import createMockedMessage from './createMockedMessage';
import { DEMO_BROADCAST_CHANNEL } from './demoChannel';

import { MOCK_STARTING_PTS } from './MockTypes';

// The client only accepts updates whose `pts` is the next one in a row
let currentPts = MOCK_STARTING_PTS;

export function getNextMockPts() {
  currentPts += 1;

  return currentPts;
}

export function getNextMessageIdFor(mockData: MockTypes) {
  return getNextMessageId(mockData);
}

const DEFAULT_POSTS_COUNT = 5;
const DEFAULT_POSTS_DELAY_MS = 700;

const INCOMING_TEXTS = [
  'Ещё один момент по срокам — когда сможем начать?',
  'Посмотрела, всё хорошо. Жду договор.',
  'Можно уточнить по оплате?',
];

const POST_TEXTS = [
  'Утренняя подборка ссылок.',
  'Разбор: что поменялось за неделю.',
  'Короткая заметка на три минуты.',
  'Новый выпуск уже на сайте.',
  'Цифры недели в одной картинке.',
  'Итоги дня.',
];

// The API is re-initialized on reconnects, and each time it builds a new client,
// so the bridge keeps one channel and always talks to the latest client
let channel: BroadcastChannel | undefined;
let activeClient: TelegramClient | undefined;

export function startDemoBridge(client: TelegramClient) {
  activeClient = client;

  if (channel || typeof BroadcastChannel === 'undefined') {
    return;
  }

  channel = new BroadcastChannel(DEMO_BROADCAST_CHANNEL);
  channel.onmessage = ({ data }: MessageEvent<DemoRequest>) => {
    if (!data || !activeClient) return;

    if (data.action === 'message') {
      sendIncomingMessage(activeClient, data.chatId, data.text);
    } else if (data.action === 'posts') {
      sendChannelPosts(activeClient, data.count, data.delayMs);
    }
  };
}

function sendIncomingMessage(client: TelegramClient, chatId: string, text?: string) {
  const { mockData } = client;
  const dialog = findDialog(mockData, chatId);
  if (!dialog) return;

  const id = getNextMessageId(mockData);
  const isChannel = mockData.channels.some(({ id: mockChannelId }) => mockChannelId === chatId);
  const messages = mockData.messages[chatId] || (mockData.messages[chatId] = []);

  messages.push({
    id,
    message: text || pickText(isChannel ? POST_TEXTS : INCOMING_TEXTS, id),
    date: Math.floor(Date.now() / 1000),
    entities: [],
  });

  dialog.topMessage = id;
  dialog.unreadCount = (dialog.unreadCount || 0) + 1;

  const message = createMockedMessage(chatId, id, mockData);

  // Mocked channels do not get a channel-shaped id, so the client keeps no separate `pts`
  // state for them: posts go through the common queue, like messages from a person
  client.fireUpdate(new Api.UpdateNewMessage({ message, pts: getNextMockPts(), ptsCount: 1 }));
}

function sendChannelPosts(client: TelegramClient, count = DEFAULT_POSTS_COUNT, delayMs = DEFAULT_POSTS_DELAY_MS) {
  const channelIds = client.mockData.channels.map(({ id }) => id);
  if (!channelIds.length) return;

  for (let i = 0; i < count; i++) {
    const chatId = channelIds[i % channelIds.length];
    setTimeout(() => sendIncomingMessage(client, chatId), i * delayMs);
  }
}

function findDialog(mockData: MockTypes, chatId: string): MockDialog | undefined {
  return mockData.dialogs.active.find((dialog) => dialog.id === chatId)
    || mockData.dialogs.archived.find((dialog) => dialog.id === chatId);
}

function getNextMessageId(mockData: MockTypes) {
  return Object.values(mockData.messages).reduce((maxId, messages) => (
    messages.reduce((acc, message) => Math.max(acc, message.id), maxId)
  ), 0) + 1;
}

function pickText(texts: string[], seed: number) {
  return texts[seed % texts.length];
}
