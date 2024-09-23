import { Octokit } from 'octokit';
import path from 'path';
import { DelegateeMetadata, RegisterDelegateRequest } from 'src/features/delegation/types';

export async function createDelegationPR(request: RegisterDelegateRequest) {
  const GITHUB_TOKEN = process.env['GITHUB_TOKEN'] as string;
  const GITHUB_REPO_OWNER = process.env['GITHUB_REPO_OWNER'] as string;
  const GITHUB_REPO_NAME = process.env['GITHUB_REPO_NAME'] as string;

  const octokit = new Octokit({
    auth: GITHUB_TOKEN,
  });

  const mainBranch = await octokit.rest.repos.getBranch({
    owner: GITHUB_REPO_OWNER,
    repo: GITHUB_REPO_NAME,
    branch: 'main',
  });

  const branchName = `json-${request.address}-${Date.now()}`;
  const metadataPath = `delegatees/${request.address}.json`;
  // TODO validate the file first, check for correct mimetype, extension etc
  const imagePath = `public/logos/delegatees/${request.address}${path.extname(request.image!.name)}`;
  const delegateeMetadata: DelegateeMetadata = {
    name: request.name,
    address: request.address,
    logoUri: imagePath,
    date: Date.now().toString(),
    links: {
      website: request.websiteUrl,
      twitter: request.twitterUrl,
    },
    interests: request.interests.split(',').map((i) => i.trim()),
    description: request.description.trim(),
  };

  const newRefResponse = await octokit.rest.git.createRef({
    owner: GITHUB_REPO_OWNER,
    repo: GITHUB_REPO_NAME,
    ref: `refs/heads/${branchName}`,
    sha: mainBranch.data.commit.sha,
  });

  let metadataFileSha: string | undefined = undefined;
  let imageFileSha: string | undefined = undefined;

  try {
    const file = await octokit.rest.repos.getContent({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      path: metadataPath,
      ref: newRefResponse.data.object.sha,
    });

    metadataFileSha = file.data.sha;
  } catch (err) {
    // @ts-ignore TODO check the status code in type safe way
    if (err.status !== 404) {
      throw err;
    }
  }

  try {
    const file = await octokit.rest.repos.getContent({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      path: imagePath,
      ref: newRefResponse.data.object.sha,
    });

    imageFileSha = file.data.sha;
  } catch (err) {
    // @ts-ignore TODO check the status code in type safe way
    if (err.status !== 404) {
      throw err;
    }
  }

  await octokit.rest.repos.createOrUpdateFileContents({
    owner: GITHUB_REPO_OWNER,
    repo: GITHUB_REPO_NAME,
    path: metadataPath,
    message: `Adding delegatee ${request.address} metadata`,
    content: Buffer.from(JSON.stringify(delegateeMetadata, null, 4)).toString('base64'),
    sha: metadataFileSha,
    branch: branchName,
  });

  await octokit.rest.repos.createOrUpdateFileContents({
    owner: GITHUB_REPO_OWNER,
    repo: GITHUB_REPO_NAME,
    path: imagePath,
    message: `Adding delegatee ${request.address} image`,
    content: Buffer.from(await request.image!.arrayBuffer()).toString('base64'),
    sha: imageFileSha,
    branch: branchName,
  });

  const createPRResponse = await octokit.rest.pulls.create({
    owner: GITHUB_REPO_OWNER,
    repo: GITHUB_REPO_NAME,
    head: branchName,
    base: 'main',
    // TODO escape the name
    title: `Adding delegate ${request.name}`,
    body: `Adding delegate \`${request.name}\` with address [${request.address}](https://celoscan.io/address/${request.address}).
      
[Verification](${request.verificationUrl}) (\`${request.verificationUrl}\`)`,
  });

  return createPRResponse.data.html_url;
}
