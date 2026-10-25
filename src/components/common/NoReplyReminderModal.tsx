import { memo } from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import { selectTabState } from '../../global/selectors';

import useLang from '../../hooks/useLang';
import useLastCallback from '../../hooks/useLastCallback';

import CalendarModal from './CalendarModal.async';

export type OwnProps = {
  isOpen: boolean;
};

type StateProps = {
  chatId?: string;
  messageId?: number;
};

// A reminder can be picked from a submenu, and a submenu closes the whole message menu with it,
// so the time picker lives on its own instead of inside that menu
const NoReplyReminderModal = ({ isOpen, chatId, messageId }: OwnProps & StateProps) => {
  const { setNoReplyReminder, closeNoReplyReminderModal, showNotification } = getActions();

  const lang = useLang();

  const handleSubmit = useLastCallback((date: Date) => {
    if (chatId && messageId) {
      setNoReplyReminder({ chatId, messageId, dueAt: date.getTime() });
      showNotification({ message: { key: 'NoReplyReminderSet' } });
    }

    closeNoReplyReminderModal();
  });

  const handleClose = useLastCallback(() => {
    closeNoReplyReminderModal();
  });

  return (
    <CalendarModal
      isOpen={isOpen}
      isFutureMode
      withTimePicker
      submitButtonLabel={lang('NoReplyReminderPickTimeSubmit')}
      onClose={handleClose}
      onSubmit={handleSubmit}
    />
  );
};

export default memo(withGlobal<OwnProps>(
  (global): Complete<StateProps> => {
    const { noReplyReminderModal } = selectTabState(global);

    return {
      chatId: noReplyReminderModal?.chatId,
      messageId: noReplyReminderModal?.messageId,
    };
  },
)(NoReplyReminderModal));
