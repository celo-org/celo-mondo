import { loadEnvConfig } from '@next/env';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

loadEnvConfig(__dirname, true, { info: () => null, error: console.error });
