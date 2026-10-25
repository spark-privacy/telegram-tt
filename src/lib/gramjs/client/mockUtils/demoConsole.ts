/* eslint-disable no-console */
import { getGlobal } from '../../../../global';

import type { DealTerms } from '../../../../util/dealTerms';
import type { DemoPeerName, DemoRequest } from './demoChannel';

import { selectChatMessages } from '../../../../global/selectors';
import { MAIN_IDB_STORE } from '../../../../util/browser/idb';
import {
  buildDealTermsText, buildNextDealTermsVersion, parseDealTerms,
} from '../../../../util/dealTerms';
import { DEMO_BROADCAST_CHANNEL, DEMO_PEER_IDS } from './demoChannel';

// Console helper for the mocked demo: `window.demo` sends fake incoming messages
// to the mocked client, so the chat list can be shown reacting to real updates
// The other side acts on the last card in that chat, whoever sent it
function findLastTerms(who: DemoPeerName): DealTerms | undefined {
  const messages = selectChatMessages(getGlobal(), DEMO_PEER_IDS[who]);

  return Object.values(messages || {})
    .sort((left, right) => right.id - left.id)
    .map((message) => parseDealTerms(message.content.text?.text))
    .find(Boolean);
}

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
    agreeTerms: (who: DemoPeerName = 'anna') => {
      const terms = findLastTerms(who);
      if (!terms) return 'в этом чате нет карточки условий';

      send({
        action: 'message',
        chatId: DEMO_PEER_IDS[who],
        text: buildDealTermsText({ ...terms, status: 'agreed', agreedAt: Math.floor(Date.now() / 1000) }),
      });

      return `«${who}» согласен с условиями`;
    },
    proposeTerms: (changes: Partial<DealTerms> = {}, who: DemoPeerName = 'anna') => {
      const terms = findLastTerms(who);
      if (!terms) return 'в этом чате нет карточки условий';

      send({
        action: 'message',
        chatId: DEMO_PEER_IDS[who],
        text: buildDealTermsText(buildNextDealTermsVersion(terms, changes)),
      });

      return `«${who}» предложил правку`;
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
        '\n  demo.agreeTerms()   — собеседник соглашается с последней карточкой условий',
        '\n  demo.proposeTerms({ due: "15 ноября" }) — собеседник предлагает правку',
        '\n  demo.reset()        — вернуть демо к исходному состоянию',
      );
    },
  };

  (window as any).demo = demo;
  demo.help();
}

initDemoConsole();
