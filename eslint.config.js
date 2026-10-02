import {
  createConfigForNuxt,
} from '@nuxt/eslint-config/flat';

export default createConfigForNuxt()
  .append({
    ignores: [
      'dist',
      'docker',
      'node_modules',
      'coverage',
    ],
  })
  .append({
    rules: {
      'no-extra-semi': 0,
      'vue/html-self-closing': 0,
      'vue/singleline-html-element-content-newline': 0,
    },
  });
