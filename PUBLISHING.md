# Publishing

Package: `@marsolab/plainq-sdk`. Repository: `marsolab/plainq-typescript-sdk`.

1. Complete the first publication with an npm account allowed to publish under
   `@marsolab`: run `npm login`, then `npm publish --access public` from a tested
   release checkout. Do not put tokens in source or chat.
2. Configure an npm trusted publisher for GitHub owner `marsolab`, repository
   `plainq-typescript-sdk`, workflow `publish.yml`, environment `npm`.
   See https://docs.npmjs.com/trusted-publishers/ .
3. For each later version, update `package.json` and the lockfile, pass CI,
   commit, and push the matching `vX.Y.Z` tag.
4. Run **Publish npm** against that tag. The workflow reruns CI, checks the
   tag against the package version, and uses GitHub OIDC with provenance.

The workflow is manual so a GitHub release can distribute tarballs before
registry credentials are configured. A built tarball or GitHub release is not
proof of npm publication. Verify with `npm view @marsolab/plainq-sdk version`
and install the published version in a clean directory after publishing.
