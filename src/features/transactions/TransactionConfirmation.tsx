import { A_Blank } from 'src/components/buttons/A_Blank';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { Checkmark } from 'src/components/icons/Checkmark';
import { Amount } from 'src/components/numbers/Amount';
import { config } from 'src/config/config';
import { ConfirmationDetails } from 'src/features/transactions/types';
import { getTxExplorerUrl } from 'src/features/transactions/utils';
import { toTitleCase } from 'src/utils/strings';

export function TransactionConfirmation({
  confirmation,
  closeModal,
}: {
  confirmation: ConfirmationDetails;
  closeModal: () => void;
}) {
  return (
    <div className="mt-3 flex flex-1 flex-col justify-between">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col items-center space-y-1">
          <div className="rounded-full border border-taupe-300 p-4">
            <Checkmark width={40} height={40} />
          </div>
          <h2 className="text-sm">{toTitleCase(confirmation.message)}</h2>
          {!!confirmation.amount && <Amount value={confirmation.amount} className="text-2xl" />}
        </div>
        <div className="space-y-2 px-2">
          {confirmation.properties.map(({ label, value }) => (
            <div key={label} className="flex flex-row justify-between">
              <div className="text-sm font-medium">{label}</div>
              <div className="text-sm font-medium">{value}</div>
            </div>
          ))}
          <div className="flex flex-row justify-between border-t border-taupe-300 pt-2">
            <div className="text-sm font-medium">Transaction</div>
            <A_Blank
              href={getTxExplorerUrl(confirmation.receipt.transactionHash, config.chainId)}
              className="text-sm font-medium text-blue-500"
            >
              View in explorer
            </A_Blank>
          </div>
        </div>
      </div>
      <SolidButton onClick={closeModal}>Close</SolidButton>
    </div>
  );
}
