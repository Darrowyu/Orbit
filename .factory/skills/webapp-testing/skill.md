---
name: webapp-testing
description: Toolkit for interacting with and testing local web applications using Playwright. Supports verifying frontend functionality, debugging UI behavior, capturing browser screenshots, and viewing browser logs.
---

## Web Application Testing

Comprehensive toolkit for testing web applications with Playwright.

### When to Use This Skill

- Testing frontend functionality
- Debugging UI behavior
- Capturing screenshots
- E2E testing
- Visual regression testing

### Playwright Setup

```bash
# Install Playwright
npm install -D @playwright/test
npx playwright install
```

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/login');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible();
    await expect(page.getByPlaceholder('name@company.com')).toBeVisible();
    await expect(page.getByRole('button', { name: '立即登录' })).toBeVisible();
  });

  test('should login successfully', async ({ page }) => {
    await page.fill('[placeholder="name@company.com"]', 'admin');
    await page.fill('[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.fill('[placeholder="name@company.com"]', 'wrong');
    await page.fill('[type="password"]', 'wrong');
    await page.click('button[type="submit"]');
    
    await expect(page.getByText('登录失败')).toBeVisible();
  });
});
```

### Common Patterns

#### Wait for API Response
```typescript
test('should load data', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Wait for API
  await page.waitForResponse(resp => 
    resp.url().includes('/api/kpis') && resp.status() === 200
  );
  
  await expect(page.getByTestId('kpi-list')).toBeVisible();
});
```

#### Screenshot Capture
```typescript
test('visual regression', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  
  // Full page screenshot
  await page.screenshot({ 
    path: 'screenshots/dashboard.png',
    fullPage: true 
  });
  
  // Element screenshot
  await page.locator('.kpi-card').first().screenshot({
    path: 'screenshots/kpi-card.png'
  });
});
```

#### Form Testing
```typescript
test('should submit form', async ({ page }) => {
  await page.goto('/kpi/create');
  
  await page.fill('#name', 'Sales Growth');
  await page.fill('#target', '100');
  await page.selectOption('#department', 'sales');
  await page.click('button[type="submit"]');
  
  await expect(page.getByText('创建成功')).toBeVisible();
});
```

#### Table Testing
```typescript
test('should display table data', async ({ page }) => {
  await page.goto('/employees');
  
  const rows = page.locator('table tbody tr');
  await expect(rows).toHaveCount(10);
  
  // Check first row
  const firstRow = rows.first();
  await expect(firstRow.locator('td').nth(0)).toContainText('张三');
});
```

### Debugging

```typescript
// Slow down execution
test.use({ launchOptions: { slowMo: 500 } });

// Pause for debugging
await page.pause();

// Console logs
page.on('console', msg => console.log(msg.text()));

// Network logs
page.on('request', req => console.log('>>', req.method(), req.url()));
page.on('response', res => console.log('<<', res.status(), res.url()));
```

### Configuration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 2,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
  ],
});
```

### Best Practices

1. Use data-testid for reliable selectors
2. Avoid hard-coded waits, use proper assertions
3. Isolate tests with fresh state
4. Use page object pattern for complex apps
5. Run tests in parallel for speed
6. Capture screenshots on failure
