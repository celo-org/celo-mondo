import path from 'path';
import DelegateeJsonData from 'src/config/delegates.json';
import AccountABI from 'src/config/stcelo/AccountABI';
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
    cachedMetadata[AccountABI.address] = {
      address: AccountABI.address,
      date: '2022-08-17',
      description:
        'StakedCelo is a Celo-native open source liquid staking protocol developed by cLabs to encourage the active participation of users in the protocol. It allows anyone to stake CELO, thus supporting the network and receiving the Epoch Rewards associated with staking, and at the same time to keep these assets liquid so that they can be used to participate in and engage across other applications in the ecosystem. ',
      interests: ['Liquid Staking', 'StakedCelo'],
      links: {
        website: 'https://docs.stcelo.xyz/',
      },
      logoUri: '/logos/stCELO.png',
      name: 'stCELO',
      stCELO: true,
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
