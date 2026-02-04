import { ST_CELO_API_URL } from 'src/config/consts';

type ActionType =
  | 'activate'
  | 'withdraw'
  | 'claim'
  | ['rebalanceDefault', 'rebalance', 'revoke', 'activate']; // must be this order

async function sendRequest(action: ActionType, address?: string) {
  await fetch(ST_CELO_API_URL, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ beneficiary: address, type: action }),
  });
}

export const afterDeposit = () =>
  sendRequest(['rebalanceDefault', 'rebalance', 'revoke', 'activate']);
export const activate = () => sendRequest('activate');
export const withdraw = (address: string) => sendRequest('withdraw', address);
export const claim = (address: string) => sendRequest('claim', address);
