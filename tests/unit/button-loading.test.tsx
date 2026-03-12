import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button } from '../../components/ui/button';

test('button shows loading text and disables while loading', () => {
  const html = renderToStaticMarkup(
    <Button isLoading loadingText="Saving settings...">
      Save settings
    </Button>
  );

  assert.match(html, /Saving settings\.\.\./);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /disabled/);
  assert.doesNotMatch(html, />Save settings</);
});

test('button renders default content when not loading', () => {
  const html = renderToStaticMarkup(
    <Button>Save settings</Button>
  );

  assert.match(html, />Save settings</);
  assert.match(html, /aria-busy="false"/);
});
