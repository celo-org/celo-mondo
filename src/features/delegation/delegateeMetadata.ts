import DelegateeJsonData from 'src/config/delegates.json';
import { DelegateeMetadata, DelegateeMetadataMapSchema } from 'src/features/delegation/types';
import { logger } from 'src/utils/logger';

let cachedMetadata: AddressTo<DelegateeMetadata>;

export function getDelegateeMetadata(): AddressTo<DelegateeMetadata> {
  if (!cachedMetadata) {
    cachedMetadata = parseDelegateeMetadata();
  }
  return cachedMetadata;
}

function parseDelegateeMetadata(): AddressTo<DelegateeMetadata> {
  try {
    return DelegateeMetadataMapSchema.parse(DelegateeJsonData);
  } catch (error) {
    logger.error('Error parsing delegatee metadata', error);
    throw new Error('Invalid delegatee metadata');
  }
}
