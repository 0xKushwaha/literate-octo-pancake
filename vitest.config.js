import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Most of the suite is pure logic with no DOM. The file that needs one opts
    // in with a `@vitest-environment jsdom` docblock, which keeps the common
    // case fast and dependency-free.
    environment: 'node',
    include: ['tests/**/*.test.js'],
    // Nothing here touches the network. A test that hangs is a bug in the test.
    testTimeout: 5000,
  },
});
