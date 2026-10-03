# Maintenance assessment — 2026-10-03

## Recommendation

Keep plain-store in lightweight maintenance. Its small API and lack of runtime dependencies other than React make correctness fixes inexpensive. Preserve the existing store, selector, subscription, and async setter APIs. Prioritize regressions, React compatibility, and reliable packaging rather than adding a large state-management framework.

There is not enough adoption evidence to justify substantial feature investment. For a new application that needs an established ecosystem, middleware, or devtools, evaluate an established alternative such as Zustand before choosing plain-store. Existing consumers and small applications that value this API still benefit from a working, maintained package.

## Evidence and limits

Observed on 2026-10-03:

- [GitHub repository](https://github.com/oe/plain-store): 0 stars, 0 forks, and no open issues or pull requests. These numbers do not measure private use.
- [npm download API](https://api.npmjs.org/downloads/point/last-month/plain-store): 77 downloads during 2026-09-02 through 2026-10-01. Downloads include automation and reinstalls; they do not establish 77 users.
- [npm registry](https://registry.npmjs.org/plain-store): latest published version is 0.9.0, published at 2025-03-16 16:16 UTC (2025-03-17 in Asia/Shanghai).
- The implementation occupies one source file. The original 33 tests pass, but targeted regressions expose stale selections, missed updates before subscription, missing SSR snapshots, and comparator/Promise detection defects.
- The original CI builds without running tests. The original React hook testing dependency declares compatibility with React 16/17 despite the package requiring React 18 or later.

No production usage, downstream dependency inventory, or user retention data is available in this assessment. The maintenance recommendation is based on the low repair cost and existing download activity, not demonstrated product-market fit.

## This maintenance pass

- Cache selected snapshots within each selector render and retain equal committed selections. Recompute when props change, catch updates before subscription, and isolate interrupted renders.
- Provide the initial store snapshot for SSR and hydration. Document per-request stores and matching initial client state.
- Correct comparisons for null-prototype records, ArrayBuffer, and DataView, and make Promise detection consistently return a boolean.
- Replace obsolete hook test tooling, update build/test dependencies, and run React 18/19 tests, builds, and packed-package checks in CI.
- Add an explicit `.mjs` ESM entry while preserving existing file paths and import resolution. Check CommonJS, ESM, browser IIFE, and TypeScript consumers against the actual tarball.
- Correct README badges and browser paths; document immutability, comparator limits, and async ordering. Remove the unverified 100% coverage claim and universal sub-1-kB claim.

The public store API and deprecated aliases remain available. The existing `dist/esm/index.js` artifact is retained alongside a new `dist/esm/index.mjs` entry; package-root and deep imports remain compatible. Development tools require Node.js 24.15 or later, while consuming applications retain React >=18 as the only peer requirement.

## Validation

Locally verified on Node.js 24.19.0 with React/React DOM 18.3.1 and 19.3.0, including their matching TypeScript definitions:

- 47 tests pass for each React version, including selector prop changes, subscription timing, stable object selections, SSR, hydration, and interrupted Suspense renders.
- Type checking and production builds pass for both versions.
- Both packed-package checks pass: CommonJS/ESM imports, IIFE execution with external React, and `.mts`/`.cts` TypeScript consumers (including rejection of invalid partial updates).
- Yarn audit reports 0 known vulnerabilities after updating the development dependencies. This is an advisory database check, not a guarantee of security.
- The built CJS/IIFE entry is about 1.00 kB gzipped, and the ESM entry about 1.15 kB gzipped, excluding React. The README therefore avoids a blanket sub-1-kB claim.

## Ongoing scope

Fix confirmed bugs and compatibility problems when reported. Before expanding the API, require a concrete consumer need. Reassess after actual adoption evidence becomes available; download counts alone are insufficient. Publish releases after compatibility and regression checks pass, when requested by the maintainer.

## Release review for 0.10.0

The generated public declarations match the published 0.9.0 declarations exactly. Package checks cover root named/default imports, existing CommonJS file/extensionless/directory imports, both ESM paths, the IIFE, and TypeScript consumers. No exports restriction is introduced. Changes to DataView/ArrayBuffer comparisons and selector evaluation are intentional correctness fixes.

A local production-mode comparison on Node.js 24.19.0, React 18.3.1, and jsdom tested both published 0.9.0 and the new CJS build. Seven measured rounds followed two warmup rounds, alternating version order. With 50 subscribers and 1,000 synchronous updates, unrelated updates caused zero component renders for both versions. Changed snapshots evaluated stable selectors 100,000 times in 0.9.0 versus 50,000 in 0.10.0. In this synthetic run, trivial selected updates took about 71 versus 76 ms, while selectors deriving 200 values took about 1,086 versus 576 ms. These measurements show the fixed safety overhead and avoided duplicate work; they are not browser benchmarks or universal performance claims.

The review retains the concurrency/SSR fixes and narrowly scoped comparator repairs. It adds no state-management features, persistence layer, signal engine, or general-purpose equality framework. SSR retains the initial snapshot until the store is released, which is documented in the changelog.
