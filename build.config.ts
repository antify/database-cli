import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  declaration: true,
  rollup: {
    inlineDependencies: true,
    resolve: {
      exportConditions: ['production', 'node'] as any,
    },
  },
  failOnWarn: false, // TODO:: fix "potential missing package.json" and remove this line
  entries: ['src/cli', 'src/index'],
  externals: [
    '@nuxt/kit',
    '@nuxt/schema',
    '@nuxt/test-utils',
    'fsevents',
    // TODO: Fix rollup/unbuild issue
    'node:url',
    'node:buffer',
    'node:path',
    'node:child_process',
    'node:process',
    'node:path',
    'node:os',
  ],
});
