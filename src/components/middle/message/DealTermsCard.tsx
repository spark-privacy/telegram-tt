import { memo } from '../../../lib/teact/teact';
import { getActions, withGlobal } from '../../../global';

import type { ApiMessage } from '../../../api/types';
import type { DealTerms } from '../../../util/dealTerms';

import { selectChatMessages } from '../../../global/selectors';
import buildClassName from '../../../util/buildClassName';
import { parseDealTerms } from '../../../util/dealTerms';
import { formatDateTime } from '../../../util/localization/dateFormat';

import useLang from '../../../hooks/useLang';
import useLastCallback from '../../../hooks/useLastCallback';

import Button from '../../ui/Button';

import styles from './DealTermsCard.module.scss';

export type OwnProps = {
  message: ApiMessage;
  terms: DealTerms;
};

type StateProps = {
  replacedByVersion?: number;
  // Set when this very version has already been agreed, by this card or by another one
  agreedAt?: number;
};

const DealTermsCard = ({
  message, terms, replacedByVersion, agreedAt,
}: OwnProps & StateProps) => {
  const { agreeDealTerms, openDealTermsModal } = getActions();

  const lang = useLang();

  const isAgreed = Boolean(agreedAt);
  const isReplaced = Boolean(replacedByVersion);
  const canAct = !isAgreed && !isReplaced;

  const handleAgree = useLastCallback(() => {
    agreeDealTerms({ chatId: message.chatId, messageId: message.id });
  });

  const handleProposeChange = useLastCallback(() => {
    openDealTermsModal({ chatId: message.chatId, terms });
  });

  function renderRow(labelKey: Parameters<typeof lang>[0], value?: string) {
    if (!value) return undefined;

    return (
      <div className={styles.row}>
        <span className={styles.label}>{lang(labelKey)}</span>
        <span className={styles.value}>{value}</span>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.title}>
        {`${lang('DealTermsTitle')} · ${lang('DealTermsVersion', { version: terms.version })}`}
      </div>

      {renderRow('DealTermsWhat', terms.what)}
      {renderRow('DealTermsPrice', terms.price)}
      {renderRow('DealTermsDue', terms.due)}
      {renderRow('DealTermsIncludes', terms.includes)}
      {renderRow('DealTermsExcludes', terms.excludes)}

      <div className={buildClassName(styles.status, isAgreed && !isReplaced && styles.agreed)}>
        {isReplaced
          ? lang('DealTermsReplaced', { version: replacedByVersion })
          : isAgreed
            ? lang('DealTermsStatusAgreed', {
              date: formatDateTime(lang, new Date(agreedAt * 1000), {
                date: 'long', time: 'short',
              }),
            })
            : message.isOutgoing ? lang('DealTermsWaitingForOther') : lang('DealTermsStatusPending')}
      </div>

      {canAct && (
        <div className={styles.actions}>
          {!message.isOutgoing && (
            <Button className={styles.action} size="tiny" pill noForcedUpperCase onClick={handleAgree}>
              {lang('DealTermsAgree')}
            </Button>
          )}
          <Button className={styles.action} size="tiny" pill isText noForcedUpperCase onClick={handleProposeChange}>
            {lang('DealTermsProposeChange')}
          </Button>
        </div>
      )}

      <div className={styles.disclaimer}>{lang('DealTermsDisclaimer')}</div>
    </div>
  );
};

export default memo(withGlobal<OwnProps>(
  (global, { message, terms }): Complete<StateProps> => {
    // The versions of one card are just the messages that carry the same deal in the chat
    const chatMessages = selectChatMessages(global, message.chatId);
    let replacedByVersion: number | undefined;
    let agreedAt: number | undefined = terms.status === 'agreed' ? terms.agreedAt || message.date : undefined;

    Object.values(chatMessages || {}).forEach((chatMessage) => {
      const otherTerms = parseDealTerms(chatMessage.content.text?.text);
      if (otherTerms?.id !== terms.id) return;

      if (otherTerms.version > terms.version) {
        if (!replacedByVersion || otherTerms.version > replacedByVersion) {
          replacedByVersion = otherTerms.version;
        }

        return;
      }

      // The agreement of the other side is a card of its own, so this version is settled too
      if (otherTerms.version === terms.version && otherTerms.status === 'agreed' && !agreedAt) {
        agreedAt = otherTerms.agreedAt || chatMessage.date;
      }
    });

    return { replacedByVersion, agreedAt };
  },
)(DealTermsCard));
