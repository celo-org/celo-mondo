import fs from 'fs';
import path from 'path';
import * as utils from 'src/features/delegation/utils';
import { getValidRequest } from 'src/test/delegatee-registration-utils';
import { fileURLToPath } from 'url';
import { expect, it, vi } from 'vitest';
import { POST } from './route';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

const getRequest = (formData: FormData): Request => {
  return {
    formData: () => formData,
  } as any as Request;
};
const imageBuffer = fs.readFileSync(
  path.join(__dirname, '../../../../../public/logos/validators/clabs.jpg'),
);

const getValidFormData = async () => {
  const request = await getValidRequest();
  const data = new FormData();

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

it('successfully calls PR creation', async () => {
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
  const request = createDelegationPRMock.mock.lastCall![0];
  expect(request.address).toBe('0x6A5DD51Da29914e8659b9CC354B414f30c7692c4');
  expect(request.description).toBe('Delegatee description');
  expect(request.image).toBeInstanceOf(File);
  await expect((request.image as File).arrayBuffer()).resolves.toEqual(imageBuffer.buffer);
  expect(request.interests).toBe('blockchain, NFTs');
  expect(request.name).toBe('Delegatee name');
  expect(request.signature).toBe(
    '0x52a3c23ef6c6817691872b77615ef30927453d641acd8c607de458d39e581bcd5411f723102640897af151644086abf4f3a9baf216d684d784194aef2c6730be1c',
  );
  expect(request.twitterUrl).toBe('https://example.com/x');
  expect(request.verificationUrl).toBe('https://example.com/verification');
  expect(request.websiteUrl).toBe('https://example.com');
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
