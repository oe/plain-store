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

## Large-state optimization — 2026-10-04

The costly case is repeated derivation, not just rendering. Every subscriber still evaluates its selector for an accepted snapshot. Filtering a large immutable list allocates a new result and forces default equality to walk that result, even when an unrelated progress field changes.

Add an application-level recipe in `demo/large-state.ts`, with one cached result keyed by the list reference and filter. Sharing that selector within its store avoids duplicate filtering between subscribers and returns a stable selected reference. Keep the runtime implementation, default comparator, public API, and declarations unchanged. No dependency or automatic memoization layer is added to the package. The example cache holds only the latest list/result, requires immutable inputs, and is created separately for each store/request. Reading an older snapshot safely recomputes its result.

`npm run benchmark:selectors` builds the library and measures the actual ESM build against that recipe. On Node.js 24.19.0 in production-mode React with jsdom, each sample mounts 20 subscribers, uses 5,000 items and 500 synchronous updates, and verifies output, render, selector, and derivation counts. Five measured rounds follow two warmup rounds; case order alternates. Timing is diagnostic, not a CI threshold or browser performance claim.

| React / workload | Uncached, default (ms) | Cached, default (ms) | Cached, Object.is (ms) |
| --- | ---: | ---: | ---: |
| 18.3.1 / unrelated updates | 414.31 | 0.94 | 0.52 |
| 18.3.1 / filter changes each update | 259.88 | 42.78 | 42.45 |
| 19.3.0 / unrelated updates | 387.96 | 0.73 | 0.55 |
| 19.3.0 / filter changes each update | 258.19 | 45.65 | 44.95 |

Each case still evaluates selectors 10,000 times. Unrelated updates produce no component renders in either version, but caching reduces filtering from 10,000 operations to zero after mounting. When the filter changes every time, filtering drops from 10,000 to 500 operations and both cases render 10,000 times. This isolates avoided computations rather than attributing batched renders to an optimization.

The existing `Object.is` comparator is optional, not required for the main improvement. It changes equality semantics for newly allocated equivalent state/selection objects, so the README explains stable references and unnecessary writes. The recipe does not cache arbitrary selector dependencies or track mutations automatically.

Validation covers 53 tests on React 18/19, including changed inputs, shared subscribers, request isolation, old snapshots, SSR hydration, and an interrupted Suspense render that replaces the shared cache. Build and packed-package checks preserve legacy imports and public declarations. Gzip sizes remain ESM 1,151, CJS 1,005, and IIFE 1,003 bytes, excluding React, within the existing budgets. The example and benchmark are not included in the runtime `dist` files.

## Initial comparable-library benchmarks — 2026-10-04

Add a separately locked, private `benchmarks` package for Zustand 5.0.15, Jotai 3.0.1, fast-deep-equal 3.1.3 and use-sync-external-store 1.7.0. No dependency is added to the root or published runtime. The harness uses the built ESM library, identical immutable full replacements, equivalent selected outputs, and functional equality configurations. Include both Zustand's native/useShallow hooks and its traditional equality hook, and retain Jotai's shared selected-atom computation cache. Apply the same input-reference cache to all libraries in the cached-list cases.

Store the full seven-round timing samples, quartiles, counters, versions, CPU/OS details and source hashes for production React 18.3.1 and 19.3.0. Cover primitive, object and nested selections, uncached/cached list derivation, raw setters and equal-content write semantics. Assert outputs, renders and notification/derivation counts, and run a short validation in the existing React 18/19 CI matrix. Timing never gates CI and the short check never overwrites full reports.

README claims are limited to measured behavior: a small deep-selection consumer fixture (1,253 gzip bytes versus 2,055 for the Zustand traditional/equality fixture and 4,432 for Jotai), and default suppression of deeply equal writes. Also show the smaller Zustand shallow fixture (914 bytes), faster Zustand raw writes, and Jotai's lower uncached derivation costs. Other libraries can implement write guards and application-level caches. These synchronous Node/jsdom measurements do not establish universal speed, browser responsiveness, memory usage or the cost of every application topology. See `benchmarks/README.md` for reproduction and limits.

## Shared-snapshot implementation — 2026-10-04 (unreleased)

Borrow Jotai's identity-based sharing: one store-local cache for the latest selected snapshot, keyed weakly by the pure selector function. Per-hook render/committed caches remain isolated. Default stabilized values can be shared after a hook has taken an actual result from that selector. A changed selector can initially retain an equal result of another type (boxed/primitive, for example); that history must stay private until an actual result is accepted. Custom comparators always compare each subscriber's own prior value. Accepted writes clear the shared cache, so old snapshot/result histories cannot accumulate across writes. Reading an older/SSR snapshot may recompute; current derived values can remain cached after unmount while keys/store stay alive.

Borrow the simpler synchronous update path from Zustand: move result application outside `setStore` and allocate a resolution handler only for async updates. Retain whole-state deep equality, resolution-time partial merging, synchronous/reentrant notification order and all public declarations. Add no atom graph, dependency tracking or public API.

The comparison now runs the pinned published 0.10.0 alongside the working-tree implementation in the same process, and includes component-local selectors that cannot share their function identity. Reports explicitly distinguish the unreleased artifact from the npm release. With production React 18.3.1, 20 subscribers, 5,000 items and 500 updates, shared uncached filtering drops from 10,000 to 500 operations. Unrelated update medians are 386.96 ms (0.10.0) versus 21.30 ms (new), with Jotai at 21.50 ms; changed-filter medians are 262.96 versus 28.88 ms. React 19 shows the same computation-count improvement. These measurements support this workload; simple/cached selections do not gain uniformly. Component-local unrelated selections cost 1.91 versus 1.16 ms (React 18) and 1.77 versus 1.13 ms (React 19), exposing the extra lookup/allocation cost. Raw write medians improve only modestly and remain above Zustand's costs.

The complete library gzip grows from 1,151/1,005/1,003 to 1,267/1,103/1,101 bytes (ESM/CJS/IIFE, React excluded). Increase each existing budget by 100 bytes to 1,350/1,200/1,200; do not disable budget checks. The deep-selection consumer fixture is now 1,368 bytes. Validate 60 tests on both React 18/19, including shared results, undefined values, function/store isolation, custom non-transitive comparator history, old-selector boxed/primitive retention, concurrent Suspense, hydration across roots and reentrant notifications. Public declarations match the pre-optimization artifact exactly; legacy package checks and comparison correctness checks pass. These changes are pending release.
