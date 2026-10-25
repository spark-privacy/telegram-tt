import { memo, useEffect, useState } from '../../../lib/teact/teact';
import { getActions } from '../../../global';

import type { TabState } from '../../../global/types/tabState';

import { buildNextDealTermsVersion, generateDealTermsId } from '../../../util/dealTerms';

import useCurrentOrPrev from '../../../hooks/useCurrentOrPrev';
import useLang from '../../../hooks/useLang';
import useLastCallback from '../../../hooks/useLastCallback';

import Button from '../../ui/Button';
import InputText from '../../ui/InputText';
import Island, { IslandDescription } from '@gili/layout/Island';
import Modal, {
  ModalCloseButton,
  ModalHeader,
  ModalHeaderAction,
  ModalTitle,
} from '@gili/modal/Modal';

export type OwnProps = {
  modal: TabState['dealTermsModal'];
};

const DealTermsModal = ({ modal }: OwnProps) => {
  const { sendDealTerms, closeDealTermsModal } = getActions();

  const lang = useLang();
  const isOpen = Boolean(modal);
  const renderingModal = useCurrentOrPrev(modal);

  const [what, setWhat] = useState('');
  const [price, setPrice] = useState('');
  const [due, setDue] = useState('');
  const [includes, setIncludes] = useState('');
  const [excludes, setExcludes] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const terms = modal?.terms;
    setWhat(terms?.what || '');
    setPrice(terms?.price || '');
    setDue(terms?.due || '');
    setIncludes(terms?.includes || '');
    setExcludes(terms?.excludes || '');
  }, [isOpen, modal]);

  const handleSubmit = useLastCallback(() => {
    if (!renderingModal || !what.trim()) return;

    const fields = {
      what: what.trim(),
      price: price.trim() || undefined,
      due: due.trim() || undefined,
      includes: includes.trim() || undefined,
      excludes: excludes.trim() || undefined,
    };

    // Changing agreed terms is not an edit, it is the next version waiting for a new confirmation
    const terms = renderingModal.terms
      ? buildNextDealTermsVersion(renderingModal.terms, fields)
      : {
        id: generateDealTermsId(),
        version: 1,
        status: 'pending' as const,
        ...fields,
      };

    sendDealTerms({ chatId: renderingModal.chatId, terms });
    closeDealTermsModal();
  });

  const handleClose = useLastCallback(() => {
    closeDealTermsModal();
  });

  const header = (
    <ModalHeader>
      <ModalCloseButton />
      <ModalTitle noAutoFocus>{lang('DealTermsTitle')}</ModalTitle>
      <ModalHeaderAction>
        <Button
          color="primary"
          pill
          size="smaller"
          noForcedUpperCase
          disabled={!what.trim()}
          onClick={handleSubmit}
        >
          {lang('DealTermsSend')}
        </Button>
      </ModalHeaderAction>
    </ModalHeader>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      header={header}
      ariaLabel={lang('DealTermsTitle')}
      width="slim"
    >
      <Island>
        <InputText
          label={lang('DealTermsWhat')}
          placeholder={lang('DealTermsWhatPlaceholder')}
          value={what}
          autoFocus
          onChange={(e) => setWhat(e.currentTarget.value)}
        />
        <InputText
          label={lang('DealTermsPrice')}
          placeholder={lang('DealTermsPricePlaceholder')}
          value={price}
          onChange={(e) => setPrice(e.currentTarget.value)}
        />
        <InputText
          label={lang('DealTermsDue')}
          placeholder={lang('DealTermsDuePlaceholder')}
          value={due}
          onChange={(e) => setDue(e.currentTarget.value)}
        />
        <InputText
          label={lang('DealTermsIncludes')}
          placeholder={lang('DealTermsIncludesPlaceholder')}
          value={includes}
          onChange={(e) => setIncludes(e.currentTarget.value)}
        />
        <InputText
          label={lang('DealTermsExcludes')}
          placeholder={lang('DealTermsExcludesPlaceholder')}
          value={excludes}
          onChange={(e) => setExcludes(e.currentTarget.value)}
        />
      </Island>
      <IslandDescription>{lang('DealTermsDisclaimer')}</IslandDescription>
    </Modal>
  );
};

export default memo(DealTermsModal);
