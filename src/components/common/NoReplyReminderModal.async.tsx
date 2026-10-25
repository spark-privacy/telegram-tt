import type { OwnProps } from './NoReplyReminderModal';

import { Bundles } from '../../util/moduleLoader';

import useModuleLoader from '../../hooks/useModuleLoader';

const NoReplyReminderModalAsync = (props: OwnProps) => {
  const { isOpen } = props;
  const NoReplyReminderModal = useModuleLoader(Bundles.Extra, 'NoReplyReminderModal', !isOpen);

  return NoReplyReminderModal ? <NoReplyReminderModal {...props} /> : undefined;
};

export default NoReplyReminderModalAsync;
