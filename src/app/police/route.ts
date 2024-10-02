import { headers } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { logger } from 'src/utils/logger';

export function GET(request: NextRequest) {
  const headerList = headers();

  const country = request.geo?.country || (headerList.get('x-vercel-ip-country') as string);
  const region = request.geo?.region || (headerList.get('x-vercel-ip-country-region') as string);

  logger.info('country', country, region);

  if (isForbiddenLand(country, region)) {
    return new NextResponse(null, { status: 451 });
  }

  return new NextResponse(null, { status: 202 });
}
const RESTRICTED_COUNTRIES = new Set(['KP', 'IR', 'CU', 'SY']);

// https://www.iso.org/obp/ui/#iso:code:3166:UA although listed with UA prefix. the header/api recieved that and just used the number
const crimea = '43';
const luhansk = '09';
const donetska = '14';
//https://en.wikipedia.org/wiki/Russian-occupied_territories_of_Ukraine
const RESTRICED_SUBREGION: Record<string, Set<string>> = {
  UA: new Set([crimea, luhansk, donetska]),
};

function isForbiddenLand(iso3166Country: string, iso3166Region: string) {
  const iso3166CountryUppercase = iso3166Country?.toUpperCase();
  return (
    RESTRICTED_COUNTRIES.has(iso3166CountryUppercase) ||
    RESTRICED_SUBREGION[iso3166CountryUppercase]?.has(iso3166Region)
  );
}
