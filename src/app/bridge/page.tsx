'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { SkeletonBlock, SkeletonCircle, SkeletonText } from 'src/components/animation/Skeleton';
import { A_Blank } from 'src/components/buttons/A_Blank';
import { SolidButton } from 'src/components/buttons/SolidButton';
import { ChevronIcon } from 'src/components/icons/Chevron';
import { Section } from 'src/components/layout/Section';
import { H1 } from 'src/components/text/headers';
import { BRIDGES } from 'src/config/bridges';
import { Bridge } from 'src/types/bridge';
import { useTrackEvent } from 'src/utils/useTrackEvent';
import { getBridgeClickedCounts } from '../actions';

type BridgeWithCount = Bridge & { clickCount: number };

export default function Page() {
  const [sortedBridges, setSortedBridges] = useState<BridgeWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBridgeData() {
      try {
        const bridgeClickCounts = await getBridgeClickedCounts();

        const bridgesWithCounts = BRIDGES.map((bridge) => {
          const clickData = bridgeClickCounts.find((count) => count.bridgeId === bridge.id);
          return {
            ...bridge,
            clickCount: clickData?.count || 0,
          };
        });

        const sorted = bridgesWithCounts.sort((a, b) => {
          // First sort by click count (descending)
          if (b.clickCount !== a.clickCount) {
            return b.clickCount - a.clickCount;
          }
          // Then sort by name (ascending)
          return a.name.localeCompare(b.name);
        });
        setSortedBridges(sorted);
      } catch (error) {
        setSortedBridges(BRIDGES.map((bridge) => ({ ...bridge, clickCount: 0 })));
      } finally {
        setLoading(false);
      }
    }

    loadBridgeData();
  }, []);

  if (loading) {
    return (
      <Section className="mt-6" containerClassName="space-y-6 max-w-screen-md">
        <H1>Bridge to Celo</H1>
        <BridgeCardsSkeleton />
      </Section>
    );
  }

  return (
    <Section className="mt-6" containerClassName="space-y-6 max-w-screen-md">
      <H1>Bridge to Celo</H1>
      {sortedBridges.map((bridge) => (
        <BridgeLink key={bridge.id} {...bridge} />
      ))}
      <p className="text-center text-sm text-taupe-600">
        These bridges are independent, third-party service providers.
        <br />
        Celo assumes no responsibility for their operation.
      </p>
    </Section>
  );
}

function BridgeCardsSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between border border-taupe-300 bg-white p-4 sm:p-5"
        >
          <div className="flex items-center space-x-4">
            <SkeletonCircle size={60} />
            <div className="flex flex-col gap-1">
              <SkeletonBlock className="h-6 w-32" />
              <SkeletonText className="w-20" />
              <SkeletonText className="w-48" />
            </div>
          </div>
          <SkeletonBlock className="h-11 w-24 rounded-full" />
        </div>
      ))}
    </>
  );
}

function BridgeLink({ id, name, operator, href, logo, description }: Bridge) {
  const trackEvent = useTrackEvent();

  const handleBridgeClick = () => {
    trackEvent('bridge_clicked', { bridgeId: id });
  };

  return (
    <div className="flex items-center justify-between border border-taupe-300 bg-white p-4 sm:p-5">
      <div className="flex items-center space-x-4">
        <Image src={logo} width={60} height={60} alt="" className="rounded-full" />
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-xl">{name}</h2>
          <h3 className="text-sm">{`By ${operator}`}</h3>
          <p className="max-w-xs text-xs">{description}</p>
        </div>
      </div>
      <SolidButton className="bg-primary text-primary-content all:p-0">
        <A_Blank
          className="flex items-center space-x-2 px-5 py-3.5"
          href={href}
          onClick={handleBridgeClick}
          data-testid={id}
        >
          <span>Bridge</span>
          <ChevronIcon direction="e" width={12} height={12} />
        </A_Blank>
      </SolidButton>
    </div>
  );
}
