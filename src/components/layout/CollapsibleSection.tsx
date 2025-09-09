'use client';

import { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  children?: React.ReactNode;
  defaultExpanded?: boolean;
}

export function CollapsibleSection({
  title,
  children,
  defaultExpanded = false,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border-t border-taupe-300 pt-4">
      <button
        disabled={!children}
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <h3 className="font-serif text-lg font-medium">{title}</h3>
        <span className="text-taupe-600">{!children ? '' : isExpanded ? '-' : '+'}</span>
      </button>
      {isExpanded && <div className="mt-4">{children}</div>}
    </div>
  );
}
