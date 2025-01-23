import { accountsABI } from '@celo/abis';
import Image from 'next/image';
import { SolidButtonWithSpinner } from 'src/components/buttons/SolidButtonWithSpinner';
import { config } from 'src/config/config';
import { Addresses } from 'src/config/contracts';
import { useWriteContractWithReceipt } from 'src/features/transactions/useWriteContractWithReceipt';
import CeloCube from 'src/images/logos/celo-cube.webp';

export function AccountRegisterForm({
  refetchAccountDetails,
}: {
  refetchAccountDetails: () => any;
}) {
  const { writeContract, isLoading } = useWriteContractWithReceipt(
    'account registration',
    () => refetchAccountDetails,
  );

  const onClickCreate = () => {
    writeContract({
      address: Addresses.Accounts,
      abi: accountsABI,
      functionName: 'createAccount',
      chainId: config.chain.id,
    });
  };

  return (
    <div className="flex flex-1 flex-col justify-between" data-testid="register-form">
      <div className="flex flex-col items-center space-y-4 py-16">
        <div className="bounce-and-spin flex items-center justify-center">
          <Image className="" src={CeloCube} alt="Loading..." width={80} height={80} />
        </div>
        <h2 className="font-medium">Welcome to Celo Mondo</h2>
        <p className="max-w-xs text-center text-sm">
          Before you can lock, stake, or govern, you must first register with the Celo Accounts
          contract.
        </p>
      </div>
      <SolidButtonWithSpinner
        onClick={onClickCreate}
        isLoading={isLoading}
        loadingText="Creating Account"
      >
        Create Account
      </SolidButtonWithSpinner>
    </div>
  );
}
