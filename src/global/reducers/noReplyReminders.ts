import type { NoReplyReminder } from '../../types';
import type { GlobalState } from '../types';

export function updateNoReplyReminder<T extends GlobalState>(
  global: T, chatId: string, messageId: number, reminder: NoReplyReminder,
): T {
  return replaceChatReminders(global, chatId, {
    ...global.noReplyReminders[chatId],
    [messageId]: reminder,
  });
}

export function removeNoReplyReminder<T extends GlobalState>(global: T, chatId: string, messageId: number): T {
  const chatReminders = global.noReplyReminders[chatId];
  if (!chatReminders?.[messageId]) return global;

  const { [messageId]: removedReminder, ...rest } = chatReminders;

  return replaceChatReminders(global, chatId, rest);
}

// Any message from the other side counts as an answer, so the whole chat is cleared at once
export function removeNoReplyRemindersInChat<T extends GlobalState>(global: T, chatId: string): T {
  if (!global.noReplyReminders[chatId]) return global;

  return replaceChatReminders(global, chatId, {});
}

function replaceChatReminders<T extends GlobalState>(
  global: T, chatId: string, chatReminders: Record<number, NoReplyReminder>,
): T {
  const { [chatId]: currentChatReminders, ...rest } = global.noReplyReminders;

  return {
    ...global,
    noReplyReminders: Object.keys(chatReminders).length ? { ...rest, [chatId]: chatReminders } : rest,
  };
}
