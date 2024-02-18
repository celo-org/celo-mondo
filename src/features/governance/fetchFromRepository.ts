import { micromark } from 'micromark';
import {
  MetadataStatusToStage,
  ProposalMetadata,
  RawProposalMetadataSchema,
} from 'src/features/governance/repoTypes';
import { logger } from 'src/utils/logger';
import { objLength } from 'src/utils/objects';
import { parse as parseYaml } from 'yaml';

// TODO use official repo when fixes are merged
// const GITHUB_OWNER = 'celo-org';
const GITHUB_OWNER = 'jmrossy';
const GITHUB_REPO = 'governance';
const GITHUB_DIRECTORY_PATH = 'CGPs';
// const GITHUB_BRANCH = 'main';
const GITHUB_BRANCH = 'missing-proposal-ids';
const GITHUB_NAME_REGEX = /^cgp-(\d+)\.md$/;

export async function fetchProposalsFromRepo(
  cache: ProposalMetadata[] = [],
): Promise<ProposalMetadata[]> {
  const files = await fetchGithubDirectory(
    GITHUB_OWNER,
    GITHUB_REPO,
    GITHUB_DIRECTORY_PATH,
    GITHUB_BRANCH,
    GITHUB_NAME_REGEX,
  );
  const errorUrls = [];
  const validProposals: ProposalMetadata[] = [];
  for (const file of files) {
    // First extract cgp number and check cache
    const cgpString = GITHUB_NAME_REGEX.exec(file.name)?.[1];
    if (!cgpString) {
      logger.error('Failed to extract CGP number from file name', file.name);
      errorUrls.push(file.download_url);
      continue;
    }
    const cgpNumber = parseInt(cgpString, 10);
    const cachedProposal = cache.find((p) => p.cgp === cgpNumber);
    if (cachedProposal) {
      validProposals.push(cachedProposal);
      continue;
    }

    // If it's not in the cache, fetch the file and parse it
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

    const proposalMetadata = parseFontMatter(frontMatter);
    if (!proposalMetadata || !isValidBody(body)) {
      errorUrls.push(file.download_url);
      continue;
    }
    validProposals.push(proposalMetadata);
  }

  if (errorUrls.length) {
    logger.error(`Failed to fetch or parse from ${errorUrls.length} URLs:`, errorUrls);
  }

  return validProposals;
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

function parseFontMatter(data: Record<string, string>): ProposalMetadata | null {
  try {
    const parsed = RawProposalMetadataSchema.parse(data);
    return {
      cgp: parsed.cgp,
      title: parsed.title,
      author: parsed.author,
      stage: MetadataStatusToStage[parsed.status],
      id: parsed['governance-proposal-id'] || undefined,
      url: parsed['discussions-to'] || undefined,
      timestamp: parsed['date-created'] ? new Date(parsed['date-created']).getTime() : undefined,
      timestampExecuted: parsed['date-executed']
        ? new Date(parsed['date-executed']).getTime()
        : undefined,
    };
  } catch (error) {
    logger.error('Error validating front matter', error);
    return null;
  }
}

function isValidBody(body: string) {
  try {
    // Attempt conversion from markdown to html
    micromark(body);
    return true;
  } catch (error) {
    logger.error('Error converting markdown', error);
    return null;
  }
}
