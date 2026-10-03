# Changelog

## 0.10.0 — 2026-10-03

### Fixed

- Recompute selectors when component props change without requiring a store update.
- Catch store updates between a component's render and its subscription.
- Keep interrupted renders from replacing the committed selector.
- Retain equal selected values and cache stable selectors per snapshot.
- Compare null-prototype records without throwing, and compare DataView and ArrayBuffer contents correctly.
- Return a boolean from `isPromiseLike` for nullish and falsy values.

### Added

- Initial snapshots for React DOM server rendering and hydration. Initialize a separate store per request and recreate the same initial state in the browser.
- An explicit `dist/esm/index.mjs` entry, while retaining every previously published file path and existing package-root/deep import resolution.
- React 18/19 CI tests, package compatibility checks, and regression coverage for selector timing, concurrency, and cleanup.

### Documentation and tooling

- Rewrite the README around shared UI state, object selectors, API semantics, alternatives, and documented limitations.
- Update development dependencies and remove obsolete React hook test tooling.
- Correct the watch command and make publication checks work through npm without requiring a globally installed Yarn executable.

### Compatibility and performance

- Public TypeScript declarations and deprecated aliases remain unchanged from 0.9.0. React >=18 remains the only runtime peer dependency. Development tooling requires Node.js 24.15+.
- Root `set` updates still replace state by default; partial object updates remain opt-in.
- Selectors must be pure: the correctness fixes can change evaluation timing and call counts.
- Concurrency-safe snapshot checks add a small fixed cost for trivial selectors. Stable selectors avoid duplicate evaluation after accepted updates; expensive selectors can benefit. Default deep comparison remains unsuitable for some large or frequently updated values; choose an appropriate comparator.
- The initial snapshot remains referenced for the lifetime of the store so server rendering and hydration can use it.
