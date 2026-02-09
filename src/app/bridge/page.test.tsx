import { fireEvent, render, screen } from '@testing-library/react';
import { BRIDGES } from 'src/config/bridges';
import * as useTrackEventModule from 'src/utils/useTrackEvent';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import Page from './page';

vi.mock('src/utils/useTrackEvent');
const mockTrackEvent = vi.fn();
const mockUseTrackEvent = vi.mocked(useTrackEventModule.useTrackEvent);

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

// Mock the bridge logos
vi.mock('src/images/logos/portal-bridge.jpg', () => ({ default: '/mock-portal-logo.jpg' }));
vi.mock('src/images/logos/squid-router.jpg', () => ({ default: '/mock-squid-logo.jpg' }));
vi.mock('src/images/logos/usdt0.webp', () => ({ default: '/mock-usdt0-logo.webp' }));

describe('Bridge Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTrackEvent.mockReturnValue(mockTrackEvent);
  });

  test('should render all bridge options', () => {
    render(<Page />);

    for (const bridge of BRIDGES) {
      expect(screen.getByText(bridge.name)).toBeInTheDocument();
    }
  });

  test('should track different bridge clicks correctly', () => {
    render(<Page />);

    const firstBridgeButton = screen.getByTestId(BRIDGES[0].id);
    fireEvent.click(firstBridgeButton);

    expect(mockTrackEvent).toHaveBeenCalledWith('bridge_clicked', {
      bridgeId: BRIDGES[0].id,
    });

    const secondBridgeButton = screen.getByTestId(BRIDGES[1].id);
    fireEvent.click(secondBridgeButton);

    expect(mockTrackEvent).toHaveBeenCalledWith('bridge_clicked', {
      bridgeId: BRIDGES[1].id,
    });
  });
});
