import { fireEvent, render, screen } from '@testing-library/react';
import { BRIDGES } from 'src/config/bridges';
import * as useTrackEventModule from 'src/utils/useTrackEvent';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import Page from './page';

vi.mock('src/utils/useTrackEvent');
const mockTrackEvent = vi.fn();
const mockUseTrackEvent = vi.mocked(useTrackEventModule.useTrackEvent);

vi.mock('../actions', () => ({
  getBridgeClickedCounts: vi.fn().mockResolvedValue([]),
}));

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

  test('should render all bridge options', async () => {
    render(<Page />);

    // Wait for the loading to complete and bridges to render
    await screen.findByText('Jumper');

    for (const bridge of BRIDGES) {
      expect(screen.getByText(bridge.name)).toBeInTheDocument();
    }
  });

  test('should track different bridge clicks correctly', async () => {
    render(<Page />);

    // Wait for the component to load and render bridges
    await screen.findByText('Jumper');

    // Bridges are sorted alphabetically when click counts are equal (all 0)
    // Order should be: Jumper, Portal Bridge, Squid Router, Superbridge, USDT0
    const jumperButton = screen.getByTestId('jumper');
    fireEvent.click(jumperButton);

    expect(mockTrackEvent).toHaveBeenCalledWith('bridge_clicked', {
      bridgeId: 'jumper',
    });

    const portalBridgeButton = screen.getByTestId('portal-bridge');
    fireEvent.click(portalBridgeButton);

    expect(mockTrackEvent).toHaveBeenCalledWith('bridge_clicked', {
      bridgeId: 'portal-bridge',
    });
  });
});
