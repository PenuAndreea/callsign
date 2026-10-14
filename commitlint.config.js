/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Scope is optional; when given it must name a workspace or area of the repo.
    'scope-enum': [
      2,
      'always',
      ['api', 'web', 'mobile', 'types', 'theme', 'ui', 'hooks', 'config', 'deps', 'ci', 'docs'],
    ],
  },
};
