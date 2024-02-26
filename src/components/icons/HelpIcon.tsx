import { memo } from 'react';
import { toast } from 'react-toastify';

import Icon from '../../images/icons/info-circle.svg';
import { IconButton } from '../buttons/IconButton';

function _HelpIcon({ text, size = 12 }: { text: string; size?: number }) {
  const onClick = () => {
    toast.info(text, { autoClose: 8000 });
  };

  return <IconButton imgSrc={Icon} title="Help" width={size} height={size} onClick={onClick} />;
}

export const HelpIcon = memo(_HelpIcon);
