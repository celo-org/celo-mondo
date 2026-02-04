import { ST_CELO_API_URL } from 'src/config/consts';

type ActionType =
  | 'activate'
  | 'withdraw'
  | 'claim'
  | ['rebalanceDefault', 'rebalance', 'revoke', 'activate']; // must be this order

export const useAPI = () => {
  const sendRequest = async (action: ActionType, address?: string) => {
    await fetch(ST_CELO_API_URL, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ beneficiary: address, type: action }),
    });
  };

  const afterDeposit = async () => {
    await sendRequest(['rebalanceDefault', 'rebalance', 'revoke', 'activate']);
  };

  const activate = () => sendRequest('activate');
  const withdraw = (address: string) => sendRequest('withdraw', address);
  const claim = (address: string) => sendRequest('claim', address);

  return {
    activate,
    withdraw,
    claim,
    afterDeposit,
  };
};
