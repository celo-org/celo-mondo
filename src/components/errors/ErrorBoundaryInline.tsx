'use client';
import Image from 'next/image';
import { Component } from 'react';

import { links } from 'src/config/links';
import ErrorIcon from 'src/images/icons/error-circle.svg';
import { logger } from 'src/utils/logger';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundaryInline extends Component<any, ErrorBoundaryState> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    logger.error('Error caught by inline error boundary', '\n', error, '\n', errorInfo);
  }

  render() {
    const errorInfo = this.state.hasError;
    if (errorInfo) {
      return (
        <div className="flex max-w-sm flex-col items-center">
          <Image src={ErrorIcon} width={30} height={30} alt="" />
          <h1 className="mt-2 text-lg">Error Rendering</h1>
          <pre className="mt-3 text-sm">{this.props.children?.type?.name}</pre>
          <a href={links.github} target="_blank" rel="noopener noreferrer" className="mt-5 text-sm">
            For support, visit the{' '}
            <span className="underline underline-offset-2">Celo Mondo Github</span>{' '}
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}
