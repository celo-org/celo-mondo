import { NextResponse } from 'next/server';
import { createDelegationPR } from 'src/features/delegation/createDelegationPR';
import {
  RegisterDelegateResponse,
  RegisterDelegateResponseStatus,
} from 'src/features/delegation/types';
import { validateRegistrationRequest } from 'src/features/delegation/validateRegistrationRequest';
import { logger } from 'src/utils/logger';
import { Hex } from 'viem';

type RegisterDelegateRequest = {
  name: string;
  address: Address;
  image: File;
  websiteUrl: string;
  twitterUrl: string;
  verificationUrl: string;
  interests: string;
  description: string;
  signature: Hex;
};

export const dynamic = 'force-dynamic';

export async function POST(httpRequest: Request) {
  let registrationRequest: RegisterDelegateRequest;

  logger.debug('Request received');
  try {
    const data = await httpRequest.formData();

    const address = data.get('address') as Address;
    const signature = data.get('signature') as Hex;
    const name = data.get('name') as string;
    const websiteUrl = data.get('websiteUrl') as string;
    const twitterUrl = data.get('twitterUrl') as string;
    const verificationUrl = data.get('verificationUrl') as string;
    const interests = data.get('interests') as string;
    const description = data.get('description') as string;
    const image = data.get('image') as File;

    registrationRequest = {
      address,
      image,
      name,
      websiteUrl,
      twitterUrl,
      verificationUrl,
      interests,
      description,
      signature,
    };

    const validationResult = await validateRegistrationRequest(registrationRequest);

    if (validationResult.length) {
      return wrapResponseInJson(
        {
          status: RegisterDelegateResponseStatus.Error,
          message: 'Invalid delegatee registration request',
          errors: validationResult,
        },
        400,
      );
    }
  } catch (error) {
    return wrapResponseInJson(
      {
        status: RegisterDelegateResponseStatus.Error,
        message: 'Error parsing request',
      },
      400,
    );
  }

  try {
    const url = await createDelegationPR(registrationRequest);

    return wrapResponseInJson({
      status: RegisterDelegateResponseStatus.Success,
      pullRequestUrl: url,
    });
  } catch (err) {
    logger.error('Error creating PR', err);

    return wrapResponseInJson(
      {
        status: RegisterDelegateResponseStatus.Error,
        message: 'Error creating PR',
      },
      500,
    );
  }
}

function wrapResponseInJson(response: RegisterDelegateResponse, status: number = 200) {
  return NextResponse.json(response, {
    headers: {
      'Content-Type': 'application/json',
    },
    status,
  });
}
