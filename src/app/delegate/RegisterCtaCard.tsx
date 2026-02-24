'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { CtaCard } from 'src/components/layout/CtaCard';
import { useTrackEvent } from 'src/utils/useTrackEvent';

export function RegisterCtaCard() {
  const trackEvent = useTrackEvent();

  const handleRegisterClick = useCallback(() => {
    trackEvent('register_delegatee_clicked', {});
  }, [trackEvent]);

  return (
    <CtaCard>
      <h3 className="col-[1/3] row-[1/2] font-serif text-xl sm:text-2xl md:col-[1/2] md:row-[1/2]">
        Passionate about Celo governance?
      </h3>
      <p className="col-[1/2] row-[2/3] text-sm sm:text-base md:col-[1/2] md:row-[2/3]">
        If you would like to be included in this list, fill out{' '}
        <Link
          href="/delegate/register"
          className={'text-blue-500 hover:underline'}
          onClick={handleRegisterClick}
        >
          the registration form
        </Link>
        .
      </p>
      <div className="col-[2/3] row-[2/3] flex self-center justify-self-center md:col-[2/3] md:row-[1/3]">
        <Link
          href="/delegate/register"
          className="btn btn-primary rounded-full border-taupe-300"
          onClick={handleRegisterClick}
        >
          Register as a delegatee
        </Link>
      </div>
    </CtaCard>
  );
}
