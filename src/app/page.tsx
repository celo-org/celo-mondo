import { HomePage } from 'src/features/validators/components/HomePage';
import { getServerSideValidatorGroups } from 'src/features/validators/serverSideValidatorGroups';
import { serializeBigints } from 'src/utils/objects';

// Serve a cached page and refresh it in the background at most every 5 minutes
export const revalidate = 300;

export default async function Page() {
  const initialData = await getServerSideValidatorGroups();
  return <HomePage initialData={initialData ? serializeBigints(initialData) : undefined} />;
}
