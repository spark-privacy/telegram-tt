import type { GlobalState } from '../types';

// Date of the oldest message in the chat whose "no reply" reminder has already gone off
export function selectDueNoReplyReminderSince<T extends GlobalState>(global: T, chatId: string) {
  const chatReminders = global.noReplyReminders[chatId];
  if (!chatReminders) return undefined;

  return Object.values(chatReminders).reduce<number | undefined>((oldest, reminder) => {
    if (!reminder.isDue) return oldest;

    return oldest === undefined || reminder.since < oldest ? reminder.since : oldest;
  }, undefined);
}
