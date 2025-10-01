import {
  delegateeRegistrationRequestToMetadata,
  getDelegateeMetadata,
  metadataToJSONString,
} from 'src/features/delegation/delegateeMetadata';
import { getValidRequest } from 'src/test/delegatee-registration-utils';
import { describe, expect, it } from 'vitest';

describe('delegateeRegistrationRequestToMetadata()', () => {
  it('converts registration request to valid metadata', async () => {
    const request = await getValidRequest();
    const date = new Date(1727882822000);

    expect(delegateeRegistrationRequestToMetadata(request, date)).toMatchInlineSnapshot(`
      {
        "address": "0x6A5DD51Da29914e8659b9CC354B414f30c7692c4",
        "date": "2024-10-02",
        "description": "Delegatee description",
        "interests": [
          "blockchain",
          "NFTs",
        ],
        "links": {
          "twitter": "https://example.com/x",
          "website": "https://example.com",
        },
        "logoUri": "/logos/delegatees/0x6A5DD51Da29914e8659b9CC354B414f30c7692c4.jpg",
        "name": "Delegatee name",
      }
    `);
  });

  it('converts registration request without website to valid metadata', async () => {
    const request = await getValidRequest();
    const date = new Date(1727882822000);

    delete request.websiteUrl;

    expect(delegateeRegistrationRequestToMetadata(request, date)).toMatchInlineSnapshot(`
      {
        "address": "0x6A5DD51Da29914e8659b9CC354B414f30c7692c4",
        "date": "2024-10-02",
        "description": "Delegatee description",
        "interests": [
          "blockchain",
          "NFTs",
        ],
        "links": {
          "twitter": "https://example.com/x",
        },
        "logoUri": "/logos/delegatees/0x6A5DD51Da29914e8659b9CC354B414f30c7692c4.jpg",
        "name": "Delegatee name",
      }
    `);
  });
});

describe('metadataToJSONString()', () => {
  it('converts metadata to JSON string', async () => {
    const request = await getValidRequest();
    const date = new Date(1727967003000);
    const metadata = delegateeRegistrationRequestToMetadata(request, date);

    expect(metadataToJSONString(metadata)).toMatchInlineSnapshot(`
      "{
        "name": "Delegatee name",
        "address": "0x6A5DD51Da29914e8659b9CC354B414f30c7692c4",
        "logoUri": "/logos/delegatees/0x6A5DD51Da29914e8659b9CC354B414f30c7692c4.jpg",
        "date": "2024-10-03",
        "links": {
          "website": "https://example.com",
          "twitter": "https://example.com/x"
        },
        "interests": [
          "blockchain",
          "NFTs"
        ],
        "description": "Delegatee description"
      }
      "
    `);
  });
});

describe('e2e', () => {
  it('doesnt crash', async () => {
    expect(() => getDelegateeMetadata()).not.toThrow();
  });
});
