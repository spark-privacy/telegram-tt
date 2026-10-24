import { addCallback } from '../lib/teact/teactn';

import type { NoReplyReminder } from '../types';
import type { GlobalState } from './types';

import { getActions, getGlobal } from '.';

// Reminders live only on this device, so they are checked here with a single timer
// pointed at the nearest one
let timer: number | undefined;
let prevReminders: GlobalState['noReplyReminders'] | undefined;

addCallback((global: GlobalState) => {
  if (global.noReplyReminders === prevReminders) return;

  prevReminders = global.noReplyReminders;
  scheduleNextReminder(global);
});

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
