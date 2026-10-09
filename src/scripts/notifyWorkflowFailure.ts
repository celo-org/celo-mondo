/* eslint-disable no-console */
import { sendAlertToSlack } from '../config/slackbot';

// Usage: tsx notifyWorkflowFailure.ts "<workflow name>" "<run url>"
async function main() {
  const [workflow, runUrl] = process.argv.slice(2);
  await sendAlertToSlack(`⚠️ *${workflow} failed*\n\n${runUrl}`);
  console.log('Slack alert sent successfully');
}

main().catch((error) => {
  console.error('Failed to send Slack alert:', error);
  process.exit(1);
});
