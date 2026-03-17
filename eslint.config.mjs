import mridangPlugin from '@mridang/eslint-defaults';

export default [
  ...mridangPlugin.configs.recommended,
  {
    ignores: ['src/apis/*', 'src/models/*', 'README.md', 'build/**', 'etc/**'],
  },
];
