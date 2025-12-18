import { sendAlertToSlack } from '../config/slackbot';

async function main() {
  const environment = process.argv[2]; // 'production' or 'staging'
  const dbStatus = process.argv[3]; // step outcome
  const approvalsStatus = process.argv[4]; // step outcome

  if (dbStatus !== 'failure' && approvalsStatus !== 'failure') {
    console.log('No failures to report');
    return;
  }

  const envLabel = environment === 'production' ? 'Production' : 'Staging';
  let message = `⚠️ *${envLabel} Backfill Failures*\n\n`;

  if (dbStatus === 'failure') {
    message += '• backfill-db failed\n';
  }
  if (approvalsStatus === 'failure') {
    message += '• backfill-approvals failed\n';
  }

  message += `\nEnvironment: ${environment}`;

  try {
    await sendAlertToSlack(message);
    console.log('Slack alert sent successfully');
  } catch (error) {
    console.error('Failed to send Slack alert:', error);
    process.exit(1);
  }
}

main();
