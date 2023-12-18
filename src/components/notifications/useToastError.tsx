import { useEffect } from 'react';
import { toast } from 'react-toastify';
import { logger } from 'src/utils/logger';
import { errorToString } from 'src/utils/strings';

export function useToastError(error: any, errorMsg?: string) {
  useEffect(() => {
    if (!error) return;
    logger.error(error);
    toast.error(errorMsg || errorToString(error));
  }, [error, errorMsg]);
}
