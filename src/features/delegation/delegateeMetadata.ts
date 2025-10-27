import path from 'path';
import DelegateeJsonData from 'src/config/delegates.json';
import ManagerABI from 'src/config/stcelo/ManagerABI';
import { SocialLinks } from 'src/config/types';
import {
  DelegateeMetadata,
  DelegateeMetadataMapSchema,
  RegisterDelegateRequest,
} from 'src/features/delegation/types';
import { logger } from 'src/utils/logger';

let cachedMetadata: AddressTo<DelegateeMetadata>;

export function getDelegateeMetadata(): AddressTo<DelegateeMetadata> {
  if (!cachedMetadata) {
    cachedMetadata = parseDelegateeMetadata();
    cachedMetadata[ManagerABI.address] = {
      address: ManagerABI.address,
      date: 'test',
      description: 'https://app.stcelo.xyz',
      interests: ['test'],
      links: {},
      logoUri: '/logos/stCELO.png',
      name: 'stCELO',
    };
  }
  return cachedMetadata;
}

export function delegateeRegistrationRequestToMetadata(
  request: RegisterDelegateRequest,
  date: Date,
): DelegateeMetadata {
  const logoUri = `/logos/delegatees/${request.address}${path.extname(request.image!.name)}`;
  const links: SocialLinks = {};

  if (request.websiteUrl) {
    links['website'] = request.websiteUrl;
  }

  if (request.twitterUrl) {
    links['twitter'] = request.twitterUrl;
  }

  return {
    name: request.name,
    address: request.address,
    logoUri,
    date: date.toISOString().split('T')[0],
    links,
    interests: request.interests.split(',').map((i) => i.trim()),
    description: request.description.trim(),
  };
}

export function metadataToJSONString(metadata: DelegateeMetadata): string {
  return JSON.stringify(metadata, null, 2) + '\n';
}

function parseDelegateeMetadata(): AddressTo<DelegateeMetadata> {
  try {
    return DelegateeMetadataMapSchema.parse(DelegateeJsonData);
  } catch (error) {
    logger.error('Error parsing delegatee metadata', error);
    throw new Error('Invalid delegatee metadata');
  }
}
