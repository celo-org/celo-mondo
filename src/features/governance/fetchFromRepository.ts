import DOMPurify from 'isomorphic-dompurify';
import { micromark } from 'micromark';
import { gfmTable, gfmTableHtml } from 'micromark-extension-gfm-table';
import {
  MetadataStatusToStage,
  ProposalMetadata,
  RawProposalMetadataSchema,
} from 'src/features/governance/types';
import { logger } from 'src/utils/logger';
import { objLength } from 'src/utils/objects';
import { isNullish } from 'src/utils/typeof';
import { parse as parseYaml } from 'yaml';

const GITHUB_OWNER = 'celo-org';
const GITHUB_REPO = 'governance';
const GITHUB_DIRECTORY_PATH = 'CGPs';
const GITHUB_BRANCH = 'main';
const CGP_FILENAME_REGEX = /^cgp-(\d+)\.md$/;

export async function fetchProposalsFromRepo(
  cache: ProposalMetadata[],
  validateMarkdown: boolean,
): Promise<ProposalMetadata[]> {
  let files: GithubFile[];
  try {
    files = await fetchGithubDirectory(
      GITHUB_OWNER,
      GITHUB_REPO,
      GITHUB_DIRECTORY_PATH,
      GITHUB_BRANCH,
      CGP_FILENAME_REGEX,
    );
  } catch (error: unknown) {
    // Gracefully handle rate-limitations and use the cache
    if ((error as Error).message.includes('403 rate limit exceeded')) {
      files = cache.map(
        (cachedProposal) =>
          ({
            name: `cgp-${cachedProposal.cgp}.md`,
          }) as GithubFile,
      );
    } else {
      throw error;
    }
  }
  const errorUrls = [];
  const validProposals: ProposalMetadata[] = [];
  for (const file of files) {
    // First extract cgp number and check cache
    const cgpString = CGP_FILENAME_REGEX.exec(file.name)?.[1];
    if (!cgpString) {
      logger.error('Failed to extract CGP number from file name', file.name);
      errorUrls.push(file.download_url);
      continue;
    }
    const cgpNumber = parseInt(cgpString, 10);

    // If it's in the cache, use it
    const cachedProposal = cache.find((p) => p.cgp === cgpNumber);
    if (cachedProposal) {
      validProposals.push(cachedProposal);
      continue;
    }

    // If it's not in the cache, fetch the file and parse it
    const content = await fetchGithubFile(file.download_url);
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

    const proposalMetadata = parseFontMatter(frontMatter, file);
    const bodyValid = validateMarkdown ? !isNullish(markdownToHtml(body)) : true;
    if (!proposalMetadata || !bodyValid) {
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

export async function fetchProposalContent(cgpNumber: number) {
  const response = await fetch(`/governance/${cgpNumber}/markdown-api`);
  const { yaml } = await response.json();
  if (!yaml) throw new Error('Failed to fetch proposal content');
  const fileParts = separateYamlFrontMatter(yaml);
  if (!fileParts) throw new Error('Failed to parse proposal content');
  const markup = markdownToHtml(fileParts.body);
  if (isNullish(markup)) throw new Error('Failed to convert markdown to html');
  if (!markup) {
    logger.warn('Content is empty for:', cgpNumber);
    return '';
  }
  // return markup;
  return DOMPurify.sanitize(markup);
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
    throw new Error(`Error fetching github directory ${(error as Error).message}`);
  }
}

async function fetchGithubFile(url: string): Promise<string | null> {
  try {
    logger.debug('Fetching github file', url);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    return await response.text();
  } catch (error) {
    logger.error('Error fetching github file', url, error);
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

function parseFontMatter(data: Record<string, string>, file: GithubFile): ProposalMetadata | null {
  try {
    const parsed = RawProposalMetadataSchema.parse(data);
    return {
      cgp: parsed.cgp,
      cgpUrl: file.html_url,
      cgpUrlRaw: file.download_url,
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

function markdownToHtml(body: string) {
  try {
    // Attempt conversion from markdown to html
    return micromark(body, {
      extensions: [gfmTable()],
      htmlExtensions: [gfmTableHtml()],
    });
  } catch (error) {
    logger.error('Error converting markdown', error);
    return null;
  }
}
