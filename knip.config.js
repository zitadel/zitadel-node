module.exports = {
  entry: ['src/index.ts', 'release.config.mjs', 'commitlint.config.mjs'],
  ignoreDependencies: [
    '@semantic-release/.*?',
    '@mridang/semantic-release-peer-version',
    '@codedependant/semantic-release-docker',
    '@commitlint/.*?',
    'undici',
  ],
  ignore: ['src/apis/**', 'src/models/**', 'comm'],
};
