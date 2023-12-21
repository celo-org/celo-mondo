import { fetchWithTimeout, retryAsync } from 'src/utils/async';
import { ExplorerResponse } from './types';

export async function queryCeloscan<R>(url: string) {
  const result = await retryAsync(() => executeQuery<R>(url));
  return result;
}

async function executeQuery<R>(url: string) {
  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    throw new Error(`Fetch response not okay: ${response.status}`);
  }
  const json = (await response.json()) as ExplorerResponse<R>;

  if (!json.result) {
    const responseText = await response.text();
    throw new Error(`Invalid result format: ${responseText}`);
  }

  return json.result;
}
