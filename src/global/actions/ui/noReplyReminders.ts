import type { ActionReturnType } from '../../types';

import { getCurrentTabId } from '../../../util/establishMultitabRole';
import { addActionHandler } from '../..';
import { isAnswered } from '../../noReplyReminderTimer';
import {
  removeNoReplyReminder, removeNoReplyRemindersInChat, updateNoReplyReminder,
} from '../../reducers/noReplyReminders';
import { updateTabState } from '../../reducers/tabs';
import { selectChat, selectChatMessage } from '../../selectors';

addActionHandler('setNoReplyReminder', (global, actions, payload): ActionReturnType => {
  const { chatId, messageId, dueAt } = payload;

  const message = selectChatMessage(global, chatId, messageId);
  if (!message) return global;

  return updateNoReplyReminder(global, chatId, messageId, {
    chatId,
    messageId,
    since: message.date,
    dueAt,
  });
});

addActionHandler('cancelNoReplyReminder', (global, actions, payload): ActionReturnType => {
  const { chatId, messageId } = payload;

  return removeNoReplyReminder(global, chatId, messageId);
});

addActionHandler('cancelNoReplyRemindersInChat', (global, actions, payload): ActionReturnType => {
  const { chatId } = payload;

  return removeNoReplyRemindersInChat(global, chatId);
});

addActionHandler('openNoReplyReminderModal', (global, actions, payload): ActionReturnType => {
  const { chatId, messageId, tabId = getCurrentTabId() } = payload;

  return updateTabState(global, {
    noReplyReminderModal: { chatId, messageId },
  }, tabId);
});

addActionHandler('closeNoReplyReminderModal', (global, actions, payload): ActionReturnType => {
  const { tabId = getCurrentTabId() } = payload || {};

  return updateTabState(global, {
    noReplyReminderModal: undefined,
  }, tabId);
});

addActionHandler('markNoReplyReminderDue', (global, actions, payload): ActionReturnType => {
  const { chatId, messageId, tabId = getCurrentTabId() } = payload;

  const reminder = global.noReplyReminders[chatId]?.[messageId];
  if (!reminder || reminder.isDue) return global;

  // The answer may have arrived before this reminder was even set
  if (isAnswered(global, reminder)) {
    return removeNoReplyReminder(global, chatId, messageId);
  }

  global = updateNoReplyReminder(global, chatId, messageId, { ...reminder, isDue: true });

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
