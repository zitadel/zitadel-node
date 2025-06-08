import mridangPlugin from '@mridang/eslint-defaults';

export default [
  ...mridangPlugin.configs.recommended,  // Spread if it's an array
  {
    ignores: ['src/apis/*', 'src/models/*'],
  },
];
