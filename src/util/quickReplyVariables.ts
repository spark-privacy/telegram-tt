import type { GlobalState } from '../global/types';
import type { LangFn } from './localization';

import { getUserFirstOrLastName } from '../global/helpers/users';
import { selectUser } from '../global/selectors';
import { formatDateTime } from './localization/dateFormat';
import { getTranslationFn } from './localization';

export const QUICK_REPLY_VARIABLES = ['name', 'date', 'tomorrow', 'my_name'] as const;

type QuickReplyVariable = typeof QUICK_REPLY_VARIABLES[number];

const VARIABLE_PATTERN = /\{(name|date|tomorrow|my_name)\}/g;
const HAS_VARIABLE_PATTERN = /\{(?:name|date|tomorrow|my_name)\}/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function hasQuickReplyVariables(text?: string) {
  return Boolean(text) && HAS_VARIABLE_PATTERN.test(text);
}

// Replaces `{name}`, `{date}`, `{tomorrow}` and `{my_name}` with the data of the current chat.
// Dates follow the language of the app, and a variable with nothing to put in it disappears
// without leaving a dangling comma behind
export function buildQuickReplyText<T extends GlobalState>(global: T, chatId: string, text: string) {
  if (!hasQuickReplyVariables(text)) {
    return text;
  }

  const lang = getTranslationFn();
  const now = new Date();
  // Quick replies are only offered in chats with a person, so the recipient is the chat itself
  const recipient = selectUser(global, chatId);
  const values: Record<QuickReplyVariable, string | undefined> = {
    name: getUserFirstOrLastName(lang, recipient),
    my_name: getUserFirstOrLastName(lang, global.currentUserId ? selectUser(global, global.currentUserId) : undefined),
    date: formatVariableDate(lang, now, now),
    tomorrow: formatVariableDate(lang, new Date(now.getTime() + DAY_MS), now),
  };

  let hasEmptyValue = false;
  const result = text.replace(VARIABLE_PATTERN, (_match, name: QuickReplyVariable) => {
    const value = values[name];
    if (!value) {
      hasEmptyValue = true;
      return '';
    }

    return value;
  });

  return hasEmptyValue ? removePunctuationGaps(result) : result;
}

// The year is only spelled out when the date is not in the current one, the way dates
// are written elsewhere in the app
function formatVariableDate(lang: LangFn, date: Date, now: Date) {
  return formatDateTime(lang, date, {
    date: 'long',
    includeYear: date.getFullYear() !== now.getFullYear(),
  });
}

function removePunctuationGaps(text: string) {
  return text
    // A comma left in front of other punctuation: "Hello, !" becomes "Hello!"
    .replace(/[^\S\n]*,[^\S\n]*(?=[.,!?;:])/g, '')
    .replace(/[^\S\n]*,[^\S\n]*$/gm, '')
    .replace(/^[^\S\n]*,[^\S\n]*/gm, '')
    .replace(/[^\S\n]+(?=[.,!?;:])/g, '')
    .replace(/[^\S\n]{2,}/g, ' ')
    .trim();
}
