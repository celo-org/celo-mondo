import { accountsABI } from '@celo/abis';
import Image from 'next/image';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { Addresses } from 'src/config/contracts';
import { useWriteContractWithReceipt } from 'src/features/transactions/hooks';
import CeloCube from 'src/images/logos/celo-cube.webp';

export function AccountRegisterForm() {
  const { writeContract, isLoading } = useWriteContractWithReceipt('account registration');

  const onClickCreate = () => {
    writeContract({
      address: Addresses.Accounts,
      abi: accountsABI,
      functionName: 'createAccount',
    });
  };

  return (
    <div>
      <div className="flex flex-col items-center space-y-4 py-16">
        <div className="bounce-and-spin flex items-center justify-center">
          <Image className="" src={CeloCube} alt="Loading..." width={80} height={80} />
        </div>
        <h2>Welcome to Celo Station</h2>
        <p>
          Before you can lock, stake, or govern, you must first add a registration to the official
          Celo Accounts contract.
        </p>
      </div>
      <SolidButton onClick={onClickCreate} disabled={isLoading}>
        Create Account
      </SolidButton>
    </div>
  );
}
