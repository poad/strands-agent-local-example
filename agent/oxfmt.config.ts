import { defineConfig } from 'oxfmt';

export default defineConfig({
  singleQuote: true,
  sortImports: {
    groups: ['internal', 'builtin', ['sibling', 'parent'], 'index', 'import'],
  },
  ignorePatterns: ['.agents', '.github/workflows'],
});
