import { expect, test } from '@playwright/test';

test('setup wizard shows completion summaries and allows editing', async ({ page }) => {
  const email = `qa+setup-${Date.now()}-${Math.floor(Math.random() * 10_000)}@example.com`;
  const password = 'testpass1234';

  await page.goto('/sign-up');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/\/dashboard\/setup/);
  await expect(page.getByRole('heading', { name: 'Set up your workspace' })).toBeVisible();

  const businessCard = page.locator('#business-profile');
  await page.fill('#primaryPhone', '4155552671');
  const businessSaveButton = businessCard.getByRole('button', {
    name: /Save business profile|Saving\.\.\./
  });
  await businessSaveButton.click();
  await expect(businessSaveButton).toBeDisabled();
  await expect(page).toHaveURL(/\/dashboard\/setup(?!\?saved=)/);

  await expect(businessCard.getByText('Step completed')).toBeVisible();
  await expect(businessCard.getByRole('button', { name: 'Edit' })).toBeVisible();

  await businessCard.getByRole('button', { name: 'Edit' }).click();
  await expect(businessCard.locator('#name')).toBeVisible();

  const draftingCard = page.locator('#drafting-defaults');
  const draftingSaveButton = draftingCard.getByRole('button', {
    name: /Save safety settings|Saving\.\.\./
  });
  await draftingSaveButton.click();
  await expect(draftingSaveButton).toBeDisabled();
  await expect(page).toHaveURL(/\/dashboard\/setup(?!\?saved=)/);

  await expect(draftingCard.getByText('Step completed')).toBeVisible();
  await expect(draftingCard.getByRole('button', { name: 'Edit' })).toBeVisible();

  await expect(page.getByRole('button', { name: 'Mark setup complete' })).toBeDisabled();
});
