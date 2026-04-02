module.exports = {
  entry: ['src/index.ts', 'release.config.mjs', 'commitlint.config.mjs'],
  ignoreDependencies: [
    '@semantic-release/.*?',
    '@mridang/semantic-release-peer-version',
    '@mridang/semantic-release-oci',
    '@commitlint/.*?',
  ],
  ignore: ['src/apis/**', 'src/models/**', 'comm'],
};
