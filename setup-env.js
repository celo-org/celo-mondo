#!/usr/bin/env node

/**
 * Environment Setup Script for cLabs Vercel Team Members
 * Automates: login check, project linking, env pull, and .env file creation
 */

import { execSync } from 'child_process';
import { copyFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const VERCEL_PROJECT_FILE = join('.vercel', 'project.json');

function run(command, silent = false) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: silent ? 'pipe' : 'inherit',
    });
  } catch (error) {
    return null;
  }
}

function main() {
  console.log('\n🔧 Setting up environment...\n');

  // Step 1: Check login
  console.log('[1/4] Checking Vercel login...');
  const username = run('npx vercel whoami', true);
  if (!username?.trim()) {
    console.log('Not logged in. Opening Vercel login...');
    run('npx vercel login --scope c-labs', false);
    const username = run('npx vercel whoami', true);
    console.log(`✓ Logged in as ${username.trim()}`);
  } else {
    console.log(`✓ Logged in as ${username.trim()}`);
  }

  // Step 2: Check/link project
  console.log('\n[2/4] Checking project link...');
  if (existsSync(VERCEL_PROJECT_FILE)) {
    const config = JSON.parse(readFileSync(VERCEL_PROJECT_FILE, 'utf8'));
    console.log(`✓ Linked to ${config.projectName || config.projectId}`);
  } else {
    console.log('Project not linked. Please follow the prompts to link:\n');
    if (!run('npx vercel link')) {
      console.error('❌ Failed to link project\n');
      process.exit(1);
    }
    console.log('✓ Project linked');
  }

  // Step 3: Pull env vars
  console.log('\n[3/4] Pulling environment variables...');
  run('npx vercel env pull .env.local');
  if (!existsSync('.env.local')) {
    console.error('❌ Failed to pull env vars\n');
    console.log('Make sure you have access to the cLabs Vercel team.\n');
    process.exit(1);
  }
  console.log('✓ Environment variables saved to .env.local');

  // Step 4: Create root .env
  console.log('\n[4/4] Setting up .env file...');
  if (existsSync('.env')) {
    console.log('⚠ .env already exists, skipping (delete it first to recreate)');
  } else {
    copyFileSync('.env.local', '.env');
    console.log('✓ Created .env');
  }

  console.log('\n✅ Setup complete! Run: yarn dev\n');
}

main();
