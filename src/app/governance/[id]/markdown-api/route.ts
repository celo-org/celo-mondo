export const revalidate = 60 * 3;

const URL_BASE = 'https://raw.githubusercontent.com/celo-org/governance/main/CGPs/cgp-';

// TODO consider doing more parsing of yaml / markdown here instead of in browser
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = URL_BASE + zeroPad(id) + '.md';
  console.info('Fetching markdown for proposal', url);
  const data = await fetch(url);
  const yaml = await data.text();
  return Response.json({ yaml });
}

function zeroPad(cgpDashid: string) {
  return cgpDashid.padStart(4, '0');
}
