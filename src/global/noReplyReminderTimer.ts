import { addCallback } from '../lib/teact/teactn';

import type { NoReplyReminder } from '../types';
import type { GlobalState } from './types';

import { selectChatLastMessage } from './selectors';
import { getActions, getGlobal } from '.';

// Reminders live only on this device, so they are checked here: one timer pointed at the
// nearest one, and a look at every chat that waits for an answer whenever the state changes
let timer: number | undefined;
let prevReminders: GlobalState['noReplyReminders'] | undefined;

addCallback((global: GlobalState) => {
  // An answer changes the chat, not the reminders, so this is checked on every update
  cancelAnsweredReminders(global);

  if (global.noReplyReminders === prevReminders) return;

  prevReminders = global.noReplyReminders;
  scheduleNextReminder(global);
});

// An answer is anything the other side writes after the message that is being waited on.
// Reading it from the chat itself keeps this working no matter which update brought the
// message in, and also covers an answer that arrived while the app was closed
function cancelAnsweredReminders(global: GlobalState) {
  if (!Object.keys(global.noReplyReminders).length) return;

  const actions = getActions();

  forEachReminder(global, (reminder) => {
    if (!isAnswered(global, reminder)) return;

    actions.cancelNoReplyReminder({ chatId: reminder.chatId, messageId: reminder.messageId });
  });
}

export function isAnswered(global: GlobalState, reminder: NoReplyReminder) {
  const lastMessage = selectChatLastMessage(global, reminder.chatId);

  return Boolean(lastMessage && !lastMessage.isOutgoing && lastMessage.date >= reminder.since);
}

function scheduleNextReminder(global: GlobalState) {
  clearTimeout(timer);
  timer = undefined;

  let nextDueAt: number | undefined;
  forEachReminder(global, (reminder) => {
    if (reminder.isDue) return;
    if (nextDueAt === undefined || reminder.dueAt < nextDueAt) {
      nextDueAt = reminder.dueAt;
    }
  });

  if (nextDueAt === undefined) return;

  timer = window.setTimeout(fireDueReminders, Math.max(nextDueAt - Date.now(), 0));
}

// Every open tab runs this timer, but only the first one to report a reminder creates a
// notification: the action is a no-op once the reminder is already marked as due
function fireDueReminders() {
  timer = undefined;

  const global = getGlobal();
  const actions = getActions();
  const now = Date.now();

  forEachReminder(global, (reminder) => {
    if (reminder.isDue || reminder.dueAt > now) return;

    actions.markNoReplyReminderDue({ chatId: reminder.chatId, messageId: reminder.messageId });
  });

  const nextGlobal = getGlobal();
  scheduleNextReminder(nextGlobal);
}

function forEachReminder(global: GlobalState, callback: (reminder: NoReplyReminder) => void) {
  Object.values(global.noReplyReminders).forEach((chatReminders) => {
    Object.values(chatReminders).forEach(callback);
  });
}
