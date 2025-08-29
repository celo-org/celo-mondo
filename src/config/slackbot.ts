import { WebClient } from '@slack/web-api';

const token = process.env.SLACK_TOKEN;
const web = new WebClient(token);
const SLACK_CHANNEL_ID = 'C07EHRV9370'; // #eng-celo-mondo

export async function sendAlertToSlack(markdown_text: string) {
  if (process.env.NODE_ENV !== 'production') return;

  const { ok, error } = await web.chat.postMessage({
    channel: SLACK_CHANNEL_ID,
    markdown_text,
  });

  if (!ok) {
    throw error;
  }
}
