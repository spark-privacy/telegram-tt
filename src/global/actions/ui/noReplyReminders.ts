import type { ActionReturnType } from '../../types';

import { getCurrentTabId } from '../../../util/establishMultitabRole';
import { addActionHandler } from '../..';
import {
  removeNoReplyReminder, removeNoReplyRemindersInChat, updateNoReplyReminder,
} from '../../reducers/noReplyReminders';
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

addActionHandler('markNoReplyReminderDue', (global, actions, payload): ActionReturnType => {
  const { chatId, messageId, tabId = getCurrentTabId() } = payload;

  const reminder = global.noReplyReminders[chatId]?.[messageId];
  if (!reminder || reminder.isDue) return global;

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
