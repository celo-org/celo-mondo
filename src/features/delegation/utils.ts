import { accountsABI } from '@celo/abis';
import { App, Octokit } from 'octokit';
import path from 'path';
import { fornoRpcUrl } from 'src/config/config';
import { Addresses } from 'src/config/contracts';
import {
  delegateeRegistrationRequestToMetadata,
  metadataToJSONString,
} from 'src/features/delegation/delegateeMetadata';
import { RegisterDelegateRequest } from 'src/features/delegation/types';
import { createPublicClient, http } from 'viem';
import { celo } from 'viem/chains';

export async function isAddressAnAccount(address: HexString) {
  const client = createPublicClient({ chain: celo, transport: http(fornoRpcUrl) });

  return await client.readContract({
    address: Addresses.Accounts,
    abi: accountsABI,
    functionName: 'isAccount',
    args: [address],
  });
}

const fetchFileShaIfExists = async (
  octokit: Octokit,
  repoOwner: string,
  repoName: string,
  branchRef: string,
  filePath: string,
): Promise<string | null> => {
  try {
    const file = await octokit.rest.repos.getContent({
      owner: repoOwner,
      repo: repoName,
      path: filePath,
      ref: branchRef,
    });

    return file.data.sha;
  } catch (err) {
    const notFound = err instanceof Error && 'status' in err && err.status === 404;

    if (!notFound) {
      throw err;
    }
  }

  return null;
};

export async function createDelegationPR(request: RegisterDelegateRequest) {
  const GITHUB_APP_ID = process.env['GITHUB_APP_ID'] as string;
  const GITHUB_PRIVATE_KEY = process.env['GITHUB_PRIVATE_KEY'] as string;
  const GITHUB_INSTALLATION_ID = parseInt(process.env['GITHUB_INSTALLATION_ID'] as string);

  const app = new App({
    appId: GITHUB_APP_ID,
    privateKey: GITHUB_PRIVATE_KEY,
  });

  const GITHUB_REPO_OWNER = process.env['GITHUB_REPO_OWNER'] as string;
  const GITHUB_REPO_NAME = process.env['GITHUB_REPO_NAME'] as string;
  const octokit = await app.getInstallationOctokit(GITHUB_INSTALLATION_ID);

  const mainBranch = await octokit.rest.repos.getBranch({
    owner: GITHUB_REPO_OWNER,
    repo: GITHUB_REPO_NAME,
    branch: 'main',
  });

  const branchName = `delegatee/${request.address}-${Date.now()}`;
  const metadataPath = `src/config/delegatees/${request.address}.json`;
  const imagePath = `public/logos/delegatees/${request.address}${path.extname(request.image!.name)}`;
  const delegateeMetadata = delegateeRegistrationRequestToMetadata(request, new Date());

  const newRefResponse = await octokit.rest.git.createRef({
    owner: GITHUB_REPO_OWNER,
    repo: GITHUB_REPO_NAME,
    ref: `refs/heads/${branchName}`,
    sha: mainBranch.data.commit.sha,
  });

  const [metadataFileSha, imageFileSha] = await Promise.all([
    fetchFileShaIfExists(
      octokit,
      GITHUB_REPO_OWNER,
      GITHUB_REPO_NAME,
      newRefResponse.data.ref,
      metadataPath,
    ),
    fetchFileShaIfExists(
      octokit,
      GITHUB_REPO_OWNER,
      GITHUB_REPO_NAME,
      newRefResponse.data.ref,
      imagePath,
    ),
  ]);

  await Promise.all([
    octokit.rest.repos.createOrUpdateFileContents({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      path: metadataPath,
      message: `Adding delegatee ${request.address} metadata`,
      content: Buffer.from(metadataToJSONString(delegateeMetadata)).toString('base64'),
      sha: metadataFileSha || undefined,
      branch: branchName,
    }),
    octokit.rest.repos.createOrUpdateFileContents({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      path: imagePath,
      message: `Adding delegatee ${request.address} image`,
      content: Buffer.from(await request.image!.arrayBuffer()).toString('base64'),
      sha: imageFileSha || undefined,
      branch: branchName,
    }),
  ]);

  const createPRResponse = await octokit.rest.pulls.create({
    owner: GITHUB_REPO_OWNER,
    repo: GITHUB_REPO_NAME,
    head: branchName,
    base: 'main',
    title: `Adding delegate ${request.name}`,
    body: `Adding delegate \`${request.name}\` with address [${request.address}](https://celoscan.io/address/${request.address}).
      
[Verification](${request.verificationUrl}) (\`${request.verificationUrl}\`)`,
  });

  return createPRResponse.data.html_url;
}
