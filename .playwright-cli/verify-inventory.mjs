import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createServer } from '../frontend/node_modules/vite/dist/node/index.js';
import React from '../frontend/node_modules/react/index.js';
import { renderToStaticMarkup } from '../frontend/node_modules/react-dom/server.node.js';

const server = await createServer({
  root: fileURLToPath(new URL('../frontend', import.meta.url)),
  server: { middlewareMode: true, watch: null },
});

try {
  const { exampleInventory, mapPublicVehicleCard } = await server.ssrLoadModule('/src/services/inventoryPreview.ts');
  const { InventoryPreview } = await server.ssrLoadModule('/src/sections/InventoryPreview.tsx');
  const { LanguageProvider } = await server.ssrLoadModule('/src/i18n/LanguageProvider.tsx');
  const require = createRequire(new URL('../frontend/package.json', import.meta.url));
  const { MemoryRouter } = require('react-router-dom');
  const { inventoryCopy } = await server.ssrLoadModule('/src/i18n/inventoryCopy.ts');

  function render(props) {
    return renderToStaticMarkup(React.createElement(MemoryRouter, null,
      React.createElement(LanguageProvider, null, React.createElement(InventoryPreview, props))));
  }

  assert.equal(exampleInventory.length, 4);
  assert.ok(exampleInventory.every(item => item.source === 'example' && !('priceEur' in item) && !('slug' in item)));
  const fixture = { slug: 'test-slug', make: 'Test', model: 'Fixture', variant: null, year: 2024, month: null, priceEur: 12345, images: ['/api/public/test/card'] };
  const mapped = mapPublicVehicleCard(fixture);
  assert.equal(mapped.image.src, fixture.images[0]);
  assert.equal(mapped.source, 'published');
  assert.equal(mapPublicVehicleCard({ ...fixture, images: [] }).image.temporary, true);
  assert.ok(render({ vehicles: [], status: 'ready' }).includes(inventoryCopy.es.empty));
  assert.ok(render({ status: 'loading' }).includes(inventoryCopy.es.loading));
  assert.ok(render({ status: 'error' }).includes(inventoryCopy.es.error));
  const html = render({ vehicles: [mapped] });
  assert.ok(html.includes('intent=vehicle') && html.includes('vehicle=test-slug'));
  assert.ok(html.includes('€') && !html.includes('USD'));
  assert.ok(render({}).includes('intent=search'));
  console.log('Inventory: 11 assertions passed (adapter, honest examples, empty/loading/error, contextual CTA, EUR).');
} finally {
  await server.close();
}
