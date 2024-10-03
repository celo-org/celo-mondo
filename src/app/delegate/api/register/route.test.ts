import fs from 'fs';
import path from 'path';
import * as utils from 'src/features/delegation/utils';
import { getValidRequest } from 'src/test/delegatee-registration-utils';
import { expect, it, vi } from 'vitest';
import { POST } from './route';

const getRequest = (formData: FormData): Request => {
  return {
    formData: () => formData,
  } as any as Request;
};

const getValidFormData = async () => {
  const request = await getValidRequest();
  const data = new FormData();
  const imageBuffer = fs.readFileSync(
    path.join(__dirname, '../../../../../public/logos/validators/clabs.jpg'),
  );

  data.append('image', new Blob([imageBuffer], { type: 'image/jpeg' }), 'clabs.jpg');
  data.append('name', request.name);
  data.append('interests', request.interests);
  data.append('description', request.description);
  data.append('signature', request.signature as HexString);
  data.append('twitterUrl', request.twitterUrl as string);
  data.append('websiteUrl', request.websiteUrl as string);
  data.append('verificationUrl', request.verificationUrl as string);
  data.append('address', request.address);

  return data;
};

it('successfuly calls PR creation', async () => {
  const createDelegationPRMock = vi.spyOn(utils, 'createDelegationPR');
  const isAddressAnAccountMock = vi.spyOn(utils, 'isAddressAnAccount');

  createDelegationPRMock.mockResolvedValueOnce('http://example.com/pull-request');
  isAddressAnAccountMock.mockResolvedValueOnce(true);

  const response = await POST(getRequest(await getValidFormData()));

  expect(response.status).toBe(200);

  const body = await response.json();

  expect(body).toMatchInlineSnapshot(`
    {
      "pullRequestUrl": "http://example.com/pull-request",
      "status": "success",
    }
  `);
  expect(isAddressAnAccountMock).toHaveBeenCalledTimes(1);
  expect(createDelegationPRMock).toHaveBeenCalledTimes(1);
  expect(createDelegationPRMock.mock.lastCall).toMatchInlineSnapshot(`
    [
      {
        "address": "0x6A5DD51Da29914e8659b9CC354B414f30c7692c4",
        "description": "Delegatee description",
        "image": File {
          Symbol(kHandle): Blob {},
          Symbol(kLength): 3801,
          Symbol(kType): "image/jpeg",
        },
        "interests": "blockchain, NFTs",
        "name": "Delegatee name",
        "signature": "0x52a3c23ef6c6817691872b77615ef30927453d641acd8c607de458d39e581bcd5411f723102640897af151644086abf4f3a9baf216d684d784194aef2c6730be1c",
        "twitterUrl": "https://example.com/x",
        "verificationUrl": "https://example.com/verification",
        "websiteUrl": "https://example.com",
      },
    ]
  `);
});

it('handles validation errors', async () => {
  const createDelegationPRMock = vi.spyOn(utils, 'createDelegationPR');
  const isAddressAnAccountMock = vi.spyOn(utils, 'isAddressAnAccount');

  isAddressAnAccountMock.mockResolvedValueOnce(false);

  const response = await POST(getRequest(await getValidFormData()));

  expect(response.status).toBe(400);

  const body = await response.json();

  expect(body).toMatchInlineSnapshot(`
    {
      "errors": {
        "address": "Address is not an account",
      },
      "message": "Invalid delegatee registration request",
      "status": "error",
    }
  `);
  expect(isAddressAnAccountMock).toHaveBeenCalledTimes(1);
  expect(createDelegationPRMock).not.toHaveBeenCalled();
});

it('handles PR creation error', async () => {
  const createDelegationPRMock = vi.spyOn(utils, 'createDelegationPR');
  const isAddressAnAccountMock = vi.spyOn(utils, 'isAddressAnAccount');

  createDelegationPRMock.mockRejectedValueOnce(new Error('Mock PR creation error'));

  isAddressAnAccountMock.mockResolvedValueOnce(true);

  const response = await POST(getRequest(await getValidFormData()));

  expect(response.status).toBe(500);

  const body = await response.json();

  expect(body).toMatchInlineSnapshot(`
    {
      "message": "Error creating PR",
      "status": "error",
    }
  `);
  expect(isAddressAnAccountMock).toHaveBeenCalledTimes(1);
  expect(createDelegationPRMock).toHaveBeenCalledTimes(1);
});

it('handles generic error', async () => {
  const createDelegationPRMock = vi.spyOn(utils, 'createDelegationPR');
  const isAddressAnAccountMock = vi.spyOn(utils, 'isAddressAnAccount');

  isAddressAnAccountMock.mockResolvedValueOnce(true);

  const response = await POST({
    formData: () => {
      throw new Error('Mock error');
    },
  } as any as Request);

  expect(response.status).toBe(400);

  const body = await response.json();

  expect(body).toMatchInlineSnapshot(`
    {
      "message": "Error parsing request",
      "status": "error",
    }
  `);
  expect(isAddressAnAccountMock).not.toHaveBeenCalled();
  expect(createDelegationPRMock).not.toHaveBeenCalled();
});
