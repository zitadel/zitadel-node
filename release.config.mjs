// noinspection JSUnusedGlobalSymbols
export default {
  branches: [
    'main',
    {
      name: 'beta',
      prerelease: 'beta',
    },
  ],
  plugins: [
    '@semantic-release/commit-analyzer',
    [
      '@mridang/semantic-release-peer-version',
      {
        repo: 'zitadel/zitadel',
      },
    ],
    '@semantic-release/release-notes-generator',
    [
      '@semantic-release/exec',
      {
        prepareCmd:
          "sed -i 's/[0-9]\\+\\.[0-9]\\+\\.[0-9]\\+/${nextRelease.version}/' src/version.ts",
      },
    ],
    [
      '@semantic-release/exec',
      {
        prepareCmd: 'npm ci --no-progress',
      },
    ],
    [
      '@codedependant/semantic-release-docker',
      {
        dockerRegistry: 'ghcr.io',
        dockerProject: 'zitadel',
        dockerImage: 'client-node',
        dockerTags: ['{{version}}'],
      },
    ],
    [
      '@semantic-release/github',
      {
        successComment: false,
        failComment: false,
        assets: [],
      },
    ],
    [
      '@semantic-release/npm',
      {
        npmPublish: true,
        pkgRoot: '.',
        tarballDir: '.',
      },
    ],
    [
      '@semantic-release/git',
      {
        message:
          'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
        assets: ['package.json', 'package-lock.json', 'src/version.ts'],
      },
    ],
  ],
  repositoryUrl: 'git+https://github.com/zitadel/zitadel-node.git',
};
