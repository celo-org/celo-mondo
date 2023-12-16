'use client';
import Image from 'next/image';
import { Component } from 'react';

import { links } from 'src/config/links';
import ErrorIcon from 'src/images/icons/error-circle.svg';
import { logger } from 'src/utils/logger';

interface ErrorBoundaryState {
  error: any;
  errorInfo: any;
}

export class ErrorBoundary extends Component<any, ErrorBoundaryState> {
  constructor(props: any) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  componentDidCatch(error: any, errorInfo: any) {
    this.setState({
      error,
      errorInfo,
    });
    logger.error('Error caught by error boundary', error, errorInfo);
  }

  render() {
    const errorInfo = this.state.error || this.state.errorInfo;
    if (errorInfo) {
      const details = errorInfo.message || JSON.stringify(errorInfo);
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center">
            <Image src={ErrorIcon} width={80} height={80} alt="" />
            <h1 className="text-lg mt-5">Fatal Error Occurred</h1>
            <div className="mt-5 text-sm">{details}</div>
            <a
              href={links.discord}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 text-sm"
            >
              For support, join the{' '}
              <span className="underline underline-offset-2">Celo Discord</span>{' '}
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
