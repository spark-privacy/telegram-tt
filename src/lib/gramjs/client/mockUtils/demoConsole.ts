/* eslint-disable no-console */
import type { DemoPeerName, DemoRequest } from './demoChannel';

import { DEMO_BROADCAST_CHANNEL, DEMO_PEER_IDS } from './demoChannel';

// Console helper for the mocked demo: `window.demo` sends fake incoming messages
// to the mocked client, so the chat list can be shown reacting to real updates
function initDemoConsole() {
  if (typeof BroadcastChannel === 'undefined') return;

  const channel = new BroadcastChannel(DEMO_BROADCAST_CHANNEL);
  const send = (request: DemoRequest) => channel.postMessage(request);

  const demo = {
    from: (who: DemoPeerName, text?: string) => {
      send({ action: 'message', chatId: DEMO_PEER_IDS[who], text });
      return `сообщение от «${who}» отправлено`;
    },
    anna: (text?: string) => demo.from('anna', text),
    igor: (text?: string) => demo.from('igor', text),
    mama: (text?: string) => demo.from('mama', text),
    posts: (count = 5, delayMs = 700) => {
      send({ action: 'posts', count, delayMs });
      return `${count} постов в каналы`;
    },
    help: () => {
      console.log(
        '%cДемо «непрочитанные личные чаты наверху»',
        'font-weight: bold',
        '\n  demo.anna("текст")  — сообщение от Анны (текст можно не указывать)',
        '\n  demo.igor("текст")  — сообщение от Игоря',
        '\n  demo.mama("текст")  — сообщение от Мамы',
        '\n  demo.posts(5)       — 5 постов подряд в каналы',
        '\n  demo.from("pavel")  — сообщение от Павла (чат без звука)',
      );
    },
  };

  (window as any).demo = demo;
  demo.help();
}

initDemoConsole();
