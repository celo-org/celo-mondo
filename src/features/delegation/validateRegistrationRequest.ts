import {
  EIP712Delegatee,
  RegisterDelegateFormValuesSchema,
  RegisterDelegateRequest,
} from 'src/features/delegation/types';
import { isAddressAnAccount } from 'src/features/delegation/utils';
import { isAddress, verifyTypedData } from 'viem';

export const validateRegistrationRequest = async (
  request: RegisterDelegateRequest,
  verifySignature = false,
) => {
  const values = toSchemaConformantValues(request);

  const parseResult = RegisterDelegateFormValuesSchema.safeParse(values);
  let errors: Record<string, string> = {};

  if (!parseResult.success) {
    errors = {
      ...errors,
      ...Object.fromEntries(parseResult.error.errors.map((e) => [e.path.join('.'), e.message])),
    };

    if (errors['links.twitter']) {
      errors.twitterUrl = errors['links.twitter'];

      delete errors['links.twitter'];
    }

    if (errors['links.website']) {
      errors.websiteUrl = errors['links.website'];

      delete errors['links.website'];
    }
  }

  if (!request.image) {
    errors.image = 'Image required';
  } else {
    if (!request.image.type.startsWith('image')) {
      errors.image = 'Invalid image';
    }
  }

  if (!values.twitterUrl && !values.websiteUrl) {
    errors = {
      ...errors,
      twitterUrl: 'At least one link required',
      websiteUrl: 'At least one link required',
    };
  }

  if (verifySignature) {
    if (!request.signature) {
      errors.signature = 'Signature required';
    } else {
      if (!(await verifySigner(request))) {
        errors.signature = 'Invalid signature';
      }
    }
  }

  if (!isAddress(request.address)) {
    errors.address = 'Invalid address';
  } else {
    if (!(await isAddressAnAccount(request.address))) {
      errors.address = 'Address is not an account';
    }
  }

  return errors;
};

function toSchemaConformantValues(request: RegisterDelegateRequest) {
  const values = {
    ...request,
    interests: request.interests
      .split(',')
      .map((i) => i.trim())
      .filter((i) => i),
    links: {} as Record<string, string>,
  };

  if (request.twitterUrl) {
    values.links.twitter = request.twitterUrl;
  }

  if (request.websiteUrl) {
    values.links.website = request.websiteUrl;
  }

  return values;
}

function verifySigner(request: RegisterDelegateRequest) {
  if (!request.signature) {
    throw new Error('Signature required');
  }

  return verifyTypedData({
    ...EIP712Delegatee,
    address: request.address,
    signature: request.signature,
    message: {
      // TODO add remaining fields
      address: request.address,
      name: request.name,
      verificationUrl: request.verificationUrl,
    },
  });
}
