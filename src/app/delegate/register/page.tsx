'use client';

import { BackLink } from 'src/components/buttons/BackLink';
import { Section } from 'src/components/layout/Section';
import { H1 } from 'src/components/text/headers';
import { AccountConnectForm } from 'src/features/account/AccountConnectForm';
import { AccountRegisterForm } from 'src/features/account/AccountRegisterForm';
import { useAccountDetails } from 'src/features/account/hooks';
import { DelegateRegistrationForm } from 'src/features/delegation/DelegateRegistrationForm';
import { RegisterDelegateFormValues } from 'src/features/delegation/types';
import { useConnection } from 'wagmi';

const initialValues: RegisterDelegateFormValues = {
  name: '',
  address: '0x',
  description: '',
  websiteUrl: '',
  twitterUrl: '',
  interests: '',
  verificationUrl: '',
  image: null,
};

export default function Page() {
  const { address, isConnected } = useConnection();
  const { isRegistered, refetch: refetchAccountDetails } = useAccountDetails(address);

  return (
    <>
      <Section className="mt-4" containerClassName="space-y-4">
        <BackLink href="/delegate">Browse delegates</BackLink>
        <H1>Register delegatee</H1>
        <p className="max-w-prose">
          Registering is only needed if you want other CELO holders to delegate their voting power
          to you. You can vote with your own locked CELO without registering, and you never need to
          delegate to yourself. To give your voting power to someone else, pick a delegate from the
          list instead.
        </p>
        {(() => {
          if (!(address && isConnected)) {
            return <AccountConnectForm />;
          }

          if (!isRegistered) {
            return <AccountRegisterForm refetchAccountDetails={refetchAccountDetails} />;
          }

          return (
            <DelegateRegistrationForm defaultFormValues={{ ...initialValues, address: address }} />
          );
        })()}
      </Section>
    </>
  );
}
