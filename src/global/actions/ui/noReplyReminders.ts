import type { NoReplyReminder } from '../../../types';
import type { ActionReturnType, GlobalState } from '../../types';

import { getCurrentTabId } from '../../../util/establishMultitabRole';
import { addActionHandler } from '../..';
import { selectChat, selectChatMessage } from '../../selectors';

const SNOOZE_MS = 24 * 60 * 60 * 1000;

addActionHandler('setNoReplyReminder', (global, actions, payload): ActionReturnType => {
  const { chatId, messageId, dueAt } = payload;

  const message = selectChatMessage(global, chatId, messageId);
  if (!message) return global;

  return replaceChatReminders(global, chatId, {
    ...global.noReplyReminders[chatId],
    [messageId]: {
      chatId,
      messageId,
      since: message.date,
      dueAt,
    },
  });
});

addActionHandler('cancelNoReplyReminder', (global, actions, payload): ActionReturnType => {
  const { chatId, messageId } = payload;

  const chatReminders = global.noReplyReminders[chatId];
  if (!chatReminders?.[messageId]) return global;

  const { [messageId]: removedReminder, ...rest } = chatReminders;

  return replaceChatReminders(global, chatId, rest);
});

// Any message from the other side counts as an answer, so the whole chat is cleared at once
addActionHandler('cancelNoReplyRemindersInChat', (global, actions, payload): ActionReturnType => {
  const { chatId } = payload;
  if (!global.noReplyReminders[chatId]) return global;

  return replaceChatReminders(global, chatId, {});
});

addActionHandler('markNoReplyReminderDue', (global, actions, payload): ActionReturnType => {
  const { chatId, messageId, tabId = getCurrentTabId() } = payload;

  const reminder = global.noReplyReminders[chatId]?.[messageId];
  if (!reminder || reminder.isDue) return global;

  global = replaceChatReminders(global, chatId, {
    ...global.noReplyReminders[chatId],
    [messageId]: { ...reminder, isDue: true },
  });

  const chat = selectChat(global, chatId);
  if (chat) {
    actions.showNotification({
      icon: 'schedule',
      title: { key: 'NoReplyReminderTitle' },
      message: { key: 'NoReplyReminderDescription', variables: { name: chat.title } },
      actionText: { key: 'NoReplyReminderOpenChat' },
      action: {
        action: 'openChat',
        payload: { id: chatId, shouldReplaceHistory: true, tabId },
      },
      tabId,
    });
  }

  return global;
});

addActionHandler('snoozeNoReplyReminder', (global, actions, payload): ActionReturnType => {
  const { chatId, messageId } = payload;

  const reminder = global.noReplyReminders[chatId]?.[messageId];
  if (!reminder) return global;

  return replaceChatReminders(global, chatId, {
    ...global.noReplyReminders[chatId],
    [messageId]: { ...reminder, dueAt: Date.now() + SNOOZE_MS, isDue: undefined },
  });
});

function replaceChatReminders<T extends GlobalState>(
  global: T,
  chatId: string,
  chatReminders: Record<number, NoReplyReminder>,
): T {
  const { [chatId]: currentChatReminders, ...rest } = global.noReplyReminders;

  return {
    ...global,
    noReplyReminders: Object.keys(chatReminders).length ? { ...rest, [chatId]: chatReminders } : rest,
  };
}
