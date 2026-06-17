import { expect, test } from '@playwright/test';

test.describe('Bridge Analytics', () => {
  test('should trigger analytics event when bridge button is clicked', async ({ page }) => {
    // Track network requests to catch server action calls
    const serverActionRequests: any[] = [];

    page.on('request', (request) => {
      // Capture server action requests (typically POST requests to the current page or specific endpoints)
      if (request.method() === 'POST') {
        serverActionRequests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData(),
          headers: request.headers(),
        });
      }
    });

    // Navigate to the bridge page
    await page.goto('/bridge');

    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');

    // Verify the bridge page loaded correctly
    await expect(page.locator('h1')).toContainText('Bridge to Celo');

    // Find the first bridge button (Superbridge)
    const firstBridgeButton = page.getByTestId('superbridge');
    await expect(firstBridgeButton).toBeVisible();

    // Click the bridge button
    await firstBridgeButton.click();

    // Wait a moment for any server action calls
    await page.waitForTimeout(1000);

    // Verify that a server action request was made
    const analyticsCall = serverActionRequests.find(
      (req) => req.postData?.includes('bridge_clicked') || req.postData?.includes('superbridge'),
    );

    expect(analyticsCall, 'Analytics server action should have been called').toBeDefined();

    // If we found the server action call, verify it contains the expected data
    if (analyticsCall?.postData) {
      expect(analyticsCall.postData).toContain('bridge_clicked');
      expect(analyticsCall.postData).toContain('superbridge');
    }
  });
});
