import type { DealTerms } from '../../../util/dealTerms';
import type { ActionReturnType } from '../../types';
import { MAIN_THREAD_ID } from '../../../api/types';

import { buildDealTermsText, parseDealTerms } from '../../../util/dealTerms';
import { getCurrentTabId } from '../../../util/establishMultitabRole';
import { isLocalMessageId } from '../../../util/keys/messageKey';
import { pause } from '../../../util/schedulers';
import { getServerTime } from '../../../util/serverTime';
import { addActionHandler, getGlobal } from '../..';
import { updateTabState } from '../../reducers/tabs';
import { selectChatLastMessage, selectChatMessage } from '../../selectors';

// How long to wait for the sent card to come back from the server before pinning it
const PIN_ATTEMPTS = 20;
const PIN_ATTEMPT_PAUSE_MS = 300;

addActionHandler('openDealTermsModal', (global, actions, payload): ActionReturnType => {
  const { chatId, terms, tabId = getCurrentTabId() } = payload;

  return updateTabState(global, {
    dealTermsModal: { chatId, terms },
  }, tabId);
});

addActionHandler('closeDealTermsModal', (global, actions, payload): ActionReturnType => {
  const { tabId = getCurrentTabId() } = payload || {};

  return updateTabState(global, {
    dealTermsModal: undefined,
  }, tabId);
});

addActionHandler('sendDealTerms', (global, actions, payload): ActionReturnType => {
  const { chatId, terms, tabId = getCurrentTabId() } = payload;

  actions.sendMessage({
    messageList: { chatId, threadId: MAIN_THREAD_ID, type: 'thread' },
    text: buildDealTermsText(terms),
    tabId,
  });

  return undefined;
});

addActionHandler('agreeDealTerms', async (global, actions, payload): Promise<void> => {
  const { chatId, messageId, tabId = getCurrentTabId() } = payload;

  const message = selectChatMessage(global, chatId, messageId);
  const terms = parseDealTerms(message?.content.text?.text);
  if (!terms) return;

  const agreedTerms: DealTerms = { ...terms, status: 'agreed', agreedAt: getServerTime() };

  actions.sendMessage({
    messageList: { chatId, threadId: MAIN_THREAD_ID, type: 'thread' },
    text: buildDealTermsText(agreedTerms),
    tabId,
  });

  // An agreed card pins itself. The message has to reach the server first, so this waits
  // for the sent card to come back with a real id. A dedicated message type on the server
  // would make this a single call
  for (let i = 0; i < PIN_ATTEMPTS; i++) {
    await pause(PIN_ATTEMPT_PAUSE_MS);

    global = getGlobal();

    const lastMessage = selectChatLastMessage(global, chatId);
    if (!lastMessage || isLocalMessageId(lastMessage.id)) continue;

    const lastTerms = parseDealTerms(lastMessage.content.text?.text);
    if (lastTerms?.id !== agreedTerms.id || lastTerms.status !== 'agreed') continue;

    actions.pinMessage({ chatId, messageId: lastMessage.id, isUnpin: false });
    return;
  }
});
