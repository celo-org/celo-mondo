import fs from 'fs';
import path from 'path';
import { EIP712Delegatee, RegisterDelegateRequest } from 'src/features/delegation/types';
import { createWalletClient, http, sha256 } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo } from 'viem/chains';

const TEST_ACCOUNT_PRIVATE_KEY =
  '0x8019ff07bebef2b77813d6ea4327f01ff64cdaf1718dab588e3460a0e4140f4d';
const TEST_ACCOUNT_ADDRESS = '0x6A5DD51Da29914e8659b9CC354B414f30c7692c4';

export const getValidRequest = async (): Promise<RegisterDelegateRequest> => {
  const name = 'Delegatee name';
  const description = 'Delegatee description';
  const interests = 'blockchain, NFTs';
  const twitterUrl = 'https://example.com/x';
  const websiteUrl = 'https://example.com';
  const verificationUrl = 'https://example.com/verification';
  const imageFile = fs.readFileSync(
    path.join(__dirname, '../../public/logos/validators/clabs.jpg'),
  );

  const account = privateKeyToAccount(TEST_ACCOUNT_PRIVATE_KEY);
  const walletClient = createWalletClient({
    account,
    chain: celo,
    transport: http(),
  });

  const requestWithoutSignature = {
    address: TEST_ACCOUNT_ADDRESS as Address,
    description,
    image: new File([imageFile], 'clabs.jpg', { type: 'image/jpeg' }),
    interests,
    name,
    twitterUrl,
    verificationUrl,
    websiteUrl: websiteUrl as string,
  } as RegisterDelegateRequest;

  const signature = await walletClient.signTypedData({
    ...EIP712Delegatee,
    message: {
      ...requestWithoutSignature,
      imageSha: sha256(new Uint8Array(imageFile)),
      websiteUrl: requestWithoutSignature.websiteUrl || '',
      twitterUrl: requestWithoutSignature.twitterUrl || '',
    },
  });

  return {
    address: TEST_ACCOUNT_ADDRESS,
    description,
    image: new File([imageFile], 'clabs.jpg', { type: 'image/jpeg' }),
    interests,
    name,
    twitterUrl,
    verificationUrl,
    websiteUrl,
    signature,
  };
};
