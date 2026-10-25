/* eslint-disable no-console */
import { getActions, getGlobal } from '../../../../global';

import type { DemoPeerName, DemoRequest } from './demoChannel';

import { MAIN_IDB_STORE } from '../../../../util/browser/idb';
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
    fireReminders: () => {
      const global = getGlobal();
      const actions = getActions();
      let count = 0;

      Object.values(global.noReplyReminders).forEach((chatReminders) => {
        Object.values(chatReminders).forEach(({ chatId, messageId }) => {
          count++;
          actions.markNoReplyReminderDue({ chatId, messageId });
        });
      });

      return count ? `напоминаний сработало: ${count}` : 'активных напоминаний нет';
    },
    reset: async () => {
      // Reminders and everything else the demo produced live in the cached state, while the
      // chats themselves come from the scenario again on every load
      await MAIN_IDB_STORE.clear();
      window.location.reload();

      return 'демо сброшено';
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
        '\n  demo.fireReminders() — все поставленные напоминания срабатывают сразу',
        '\n  demo.reset()        — вернуть демо к исходному состоянию',
      );
    },
  };

  (window as any).demo = demo;
  demo.help();
}

initDemoConsole();
