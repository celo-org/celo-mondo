import { RegisterDelegateRequest } from 'src/features/delegation/types';
import * as utils from 'src/features/delegation/utils';
import { validateRegistrationRequest } from 'src/features/delegation/validateRegistrationRequest';
import { getValidRequest } from 'src/test/delegatee-registration-utils';
import { vi } from 'vitest';

it('validates successfully', async () => {
  const request = await getValidRequest();
  const isAddressAnAccountMock = vi.spyOn(utils, 'isAddressAnAccount');

  isAddressAnAccountMock.mockResolvedValueOnce(true);

  expect(await validateRegistrationRequest(request)).toEqual({});
});

it('validates empty request', async () => {
  const request: RegisterDelegateRequest = {
    address: '' as Address,
    description: '',
    image: null,
    interests: '',
    name: '',
    signature: '' as HexString,
    twitterUrl: '',
    verificationUrl: '',
    websiteUrl: '',
  };

  const isAddressAnAccountMock = vi.spyOn(utils, 'isAddressAnAccount');

  isAddressAnAccountMock.mockResolvedValueOnce(true);

  expect(await validateRegistrationRequest(request, true)).toMatchInlineSnapshot(`
    {
      "address": "Invalid address",
      "description": "String must contain at least 1 character(s)",
      "image": "Image required",
      "interests": "Array must contain at least 1 element(s)",
      "name": "String must contain at least 1 character(s)",
      "signature": "Signature required",
      "twitterUrl": "At least one link required",
      "verificationUrl": "Invalid url",
      "websiteUrl": "At least one link required",
    }
  `);
});

it('validates address not being an account', async () => {
  const request = await getValidRequest();

  const isAddressAnAccountMock = vi.spyOn(utils, 'isAddressAnAccount');

  isAddressAnAccountMock.mockResolvedValueOnce(false);

  expect(await validateRegistrationRequest(request, true)).toMatchInlineSnapshot(`
    {
      "address": "Address is not an account",
    }
  `);
});

it('validates wrong signature', async () => {
  const request = await getValidRequest();

  // Change address to a new one, but leave original signature
  request.address = '0x29cFc9F0bCAE2Dd233183Db3817c24257E177D00';

  const isAddressAnAccountMock = vi.spyOn(utils, 'isAddressAnAccount');

  isAddressAnAccountMock.mockResolvedValueOnce(true);

  expect(await validateRegistrationRequest(request, true)).toMatchInlineSnapshot(`
    {
      "signature": "Invalid signature",
    }
  `);
});

it('validates wrong URLs', async () => {
  const request = await getValidRequest();

  request.twitterUrl = 'invalid-url-1';
  request.websiteUrl = 'invalid-url-2';

  const isAddressAnAccountMock = vi.spyOn(utils, 'isAddressAnAccount');

  isAddressAnAccountMock.mockResolvedValueOnce(true);

  expect(await validateRegistrationRequest(request, true)).toMatchInlineSnapshot(`
    {
      "twitterUrl": "Invalid url",
      "websiteUrl": "Invalid url",
    }
  `);
});

it('validates invalid image', async () => {
  const request = await getValidRequest();

  request.image = new File([], 'file.txt', { type: 'text/plain' });

  const isAddressAnAccountMock = vi.spyOn(utils, 'isAddressAnAccount');

  isAddressAnAccountMock.mockResolvedValueOnce(true);

  expect(await validateRegistrationRequest(request, true)).toMatchInlineSnapshot(`
    {
      "image": "Invalid image",
    }
  `);
});
