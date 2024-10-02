import { delegateeRegistrationRequestToMetadata } from 'src/features/delegation/delegateeMetadata';
import { getValidRequest } from 'src/test/delegatee-registration-utils';
import { expect, it } from 'vitest';

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
