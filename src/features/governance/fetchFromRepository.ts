import { micromark } from 'micromark';
import { GovernanceProposal } from 'src/features/governance/types';
import { logger } from 'src/utils/logger';
import { objLength } from 'src/utils/objects';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

// const GITHUB_OWNER = 'celo-org';
const GITHUB_OWNER = 'jmrossy';
const GITHUB_REPO = 'governance';
const GITHUB_DIRECTORY_PATH = 'CGPs';
// const GITHUB_BRANCH = 'main';
const GITHUB_BRANCH = 'metadata-fixes';
const GITHUB_NAME_REGEX = /^cgp-\d+\.md$/;

export async function fetchGovernanceProposalsFromRepo(): Promise<GovernanceProposal[]> {
  const files = await fetchGithubDirectory(
    GITHUB_OWNER,
    GITHUB_REPO,
    GITHUB_DIRECTORY_PATH,
    GITHUB_BRANCH,
    GITHUB_NAME_REGEX,
  );
  const errorUrls = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const content = await fetchGithubFile(file);
    if (!content) {
      errorUrls.push(file.download_url);
      continue;
    }

    const fileParts = separateYamlFrontMatter(content);
    if (!fileParts) {
      errorUrls.push(file.download_url);
      continue;
    }

    const { frontMatter, body } = fileParts;
    logger.debug('Front matter size', objLength(frontMatter), 'body size', body.length);

    const isValidBody = validateBody(body);
    const validatedFrontMatter = validateFontMatter(frontMatter);
    if (!validatedFrontMatter || !isValidBody) {
      errorUrls.push(file.download_url);
      continue;
    }
  }

  if (errorUrls.length) {
    logger.error(`Failed to fetch or parse from ${errorUrls.length} URLs:`, errorUrls);
  }

  //TODO
  return [];
}

interface GithubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
}

async function fetchGithubDirectory(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  nameFilter: RegExp,
): Promise<GithubFile[]> {
  try {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    logger.debug('Fetching github directory', apiUrl);

    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);

    const data = await response.json();

    if (!data || !Array.isArray(data)) throw new Error('Invalid response format');

    // Filter out files with names not matching the specified format
    const files = data.filter(
      (item: GithubFile) => item.type === 'file' && nameFilter.test(item.name),
    );
    logger.debug(`Found ${files.length} matching files in github directory`);
    return files;
  } catch (error) {
    logger.error('Error fetching github directory', path, error);
    throw new Error('Error fetching github directory');
  }
}

async function fetchGithubFile(file: GithubFile): Promise<string | null> {
  try {
    logger.debug('Fetching github file', file.download_url);
    const response = await fetch(file.download_url);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    return await response.text();
  } catch (error) {
    logger.error('Error fetching github file', file.name, error);
    return null;
  }
}

function separateYamlFrontMatter(content: string) {
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = content.match(frontMatterRegex);
  if (!match) throw new Error('No YAML front matter found');

  try {
    const frontMatterString = match[1];
    const frontMatter = parseYaml(frontMatterString);
    const body = content.slice(match[0].length);
    return { frontMatter, body };
  } catch (error) {
    logger.error('Error parsing YAML front matter', error);
    return null;
  }
}

enum ProposalStatus {
  DRAFT = 'DRAFT',
  PROPOSED = 'PROPOSED',
  EXECUTED = 'EXECUTED',
  EXPIRED = 'EXPIRED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

// cgp: '001 - <to be assigned>'
// title: 'Proposal 1 Title - <CGP title>'
// date-created: '0000-00-00 - <date created on, in ISO 8601 (yyyy-mm-dd) format>'
// author: 'Celo User(@celouser) - <a list of the authors or authors name(s) and/or username(s), or name(s) and email(s), e.g. (use with the parentheses or triangular brackets): FirstName LastName (@GitHubUsername), FirstName LastName <foo@bar.com>, FirstName (@GitHubUsername) and GitHubUsername (@GitHubUsername)>'
// status: 'DRAFT - <DRAFT | PROPOSED | EXECUTED | EXPIRED | WITHDRAWN>'
// discussions-to: 'https://forum.link <link to discussion on forum.celo.org> // Only link not in MD format - https://forum.link NOT [link](https://forum.link)'
// governance-proposal-id: '001 - [if submitted]'
// date-executed: '0000-00-00 -  <date created on, in ISO 8601 (yyyy-mm-dd) format>'

const FrontMatterSchemaObject = z.object({
  cgp: z.number().min(1),
  title: z.string().min(1),
  author: z.string(),
  status: z.preprocess((v) => String(v).toUpperCase(), z.nativeEnum(ProposalStatus)),
  'date-created': z.string().optional().or(z.null()),
  'discussions-to': z.string().url().optional().or(z.null()),
  'governance-proposal-id': z.number().optional().or(z.null()),
  'date-executed': z.string().optional().or(z.null()),
});

function validateFontMatter(data: Record<string, string>) {
  try {
    const parsed = FrontMatterSchemaObject.parse(data);
    return parsed;
  } catch (error) {
    logger.error('Error validating front matter', error);
    return null;
  }
}

function validateBody(body: string) {
  try {
    // Attempt conversion from markdown to html
    micromark(body);
    return true;
  } catch (error) {
    logger.error('Error converting markdown', error);
    return null;
  }
}
