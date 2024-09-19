import { accountsABI } from '@celo/abis';
import { NextResponse } from 'next/server';
import { Octokit } from 'octokit';
import path from 'path';
import { fornoRpcUrl } from 'src/config/config';
import { Addresses } from 'src/config/contracts';
import { DelegateeMetadata, EIP712Delegatee } from 'src/features/delegation/types';
import { logger } from 'src/utils/logger';
import { Hex, createPublicClient, http, verifyTypedData } from 'viem';
import { celo } from 'viem/chains';

type RegisterDelegateRequest = {
  name: string;
  address: Address;
  image: File;
  websiteUrl: string;
  twitterUrl: string;
  verificationUrl: string;
  interests: string;
  description: string;
  signature: Hex;
};

function verifySigner(req: RegisterDelegateRequest) {
  return verifyTypedData({
    // domain: EIP712Domain,
    ...EIP712Delegatee,
    address: req.address,
    signature: req.signature,
    message: {
      address: req.address,
      name: req.name,
      verificationUrl: req.verificationUrl,
    },
  });
}

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: RegisterDelegateRequest;

  logger.debug('Request received');
  try {
    // TODO add validation based on the schema as on the client side
    // (move logic to a separate function and reuse it here)
    const data = await request.formData();

    const address = data.get('address') as Address;
    const signature = data.get('signature') as Hex;
    const name = data.get('name') as string;
    const websiteUrl = data.get('websiteUrl') as string;
    const twitterUrl = data.get('twitterUrl') as string;
    const verificationUrl = data.get('verificationUrl') as string;
    const interests = data.get('interests') as string;
    const description = data.get('description') as string;
    const image = data.get('image') as File;

    body = {
      address,
      image,
      name,
      websiteUrl,
      twitterUrl,
      verificationUrl,
      interests,
      description,
      signature,
    };

    if (!(await isAddressAnAccount(address))) {
      return new Response('Address is not an account', {
        status: 400,
      });
    }
    const sigverification = await verifySigner(body);
    if (!sigverification) {
      return new Response('Signature does not match data', {
        status: 401,
      });
    }
  } catch (error) {
    logger.warn('Request validation error', error);
    return new Response('Invalid delegatee registration request', {
      status: 400,
    });
  }

  try {
    // @ts-ignore TODO fix the type
    const url = await createPR(body);

    return NextResponse.json({
      url,
    });
  } catch (err) {
    logger.error('Error creating PR', err);

    return new Response('Error creating PR', {
      status: 500,
    });
  }
}

// TODO introduce Request type for it like for activation
async function isAddressAnAccount(address: HexString) {
  const client = createPublicClient({ chain: celo, transport: http(fornoRpcUrl) });

  return await client.readContract({
    address: Addresses.Accounts,
    abi: accountsABI,
    functionName: 'isAccount',
    args: [address],
  });
}

// TODO move to a separate file
async function createPR(request: RegisterDelegateRequest) {
  const GITHUB_TOKEN = process.env['GITHUB_TOKEN'] as string;
  const GITHUB_REPO_OWNER = process.env['GITHUB_REPO_OWNER'] as string;
  const GITHUB_REPO_NAME = process.env['GITHUB_REPO_NAME'] as string;

  console.log('Creating octokit instance');

  const octokit = new Octokit({
    auth: GITHUB_TOKEN,
  });

  console.log('Getting main branch');

  const mainBranch = await octokit.rest.repos.getBranch({
    owner: GITHUB_REPO_OWNER,
    repo: GITHUB_REPO_NAME,
    branch: 'main',
  });

  const branchName = `json-${request.address}-${Date.now()}`;
  const metadataPath = `delegatees/${request.address}.json`;
  // TODO validate the file first, check for correct mimetype, extension etc
  const imagePath = `public/logos/delegatees/${request.address}${path.extname(request.image.name)}`;
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

    metadataFileSha = file.data.sha;
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
    content: Buffer.from(await request.image.arrayBuffer()).toString('base64'),
    sha: imageFileSha,
    branch: branchName,
  });

  console.log('Creating a pull request');

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

  console.log(createPRResponse);

  return createPRResponse.data.html_url;
}
