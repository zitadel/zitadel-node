module.exports = {
  entry: ['src/index.ts', 'release.config.mjs'],
  ignoreDependencies: [
    '@semantic-release/.*?',
    '@mridang/semantic-release-peer-version',
    '@codedependant/semantic-release-docker',
  ],
  ignore: ['src/apis/**', 'src/models/**'],
};
