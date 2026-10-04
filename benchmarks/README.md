# Library comparison

Run from the repository root after installing the development dependencies:

```sh
npm run benchmark:compare
```

This builds plain-store, installs the pinned comparison dependencies using their separate lockfile, and writes `benchmarks/results/react-18.json` or `react-19.json` according to the installed React version. Pass a destination with `npm run benchmark:compare -- /tmp/comparison.json` to keep the recorded results unchanged. Competitor dependencies live only in this private directory; none is added to the published package or root dependency manifest. The benchmark reuses the root React installation; `--legacy-peer-deps` prevents npm from installing another React alongside the competitors.

## Compared configurations

- **plain-store 0.10.0:** the built ESM artifact, with default deep equality for both whole-state writes and selections.
- **Zustand 5.0.15:** vanilla store plus its standard `useStore` hook for primitive selections. Object/array selections use `useStoreWithEqualityFn` from `zustand/traditional`, `use-sync-external-store` 1.7.0, and `fast-deep-equal` 3.1.3. This avoids fresh object snapshots and supplies equality matching the JSON-like values in these workloads.
- **Zustand/useShallow:** also measure the recommended `useStore` + `useShallow` approach for flat object selections. Shallow equality is insufficient for the nested/derived cases, so this variant only participates in flat cases. This makes the effect of choosing Zustand's hook configuration visible.
- **Jotai 3.0.1:** one root state atom and a shared `selectAtom` with `fast-deep-equal`, used by `useAtomValue` with an explicit per-sample store. The selected atom is intentionally shared across subscribers so Jotai retains its native computation sharing. Primitive equality has the same outcome as `Object.is` for these integer inputs.

These adapters expose the same whole-state replacement/get/subscribe/selected-read operations. Each sample gets a fresh store, a stable selector, immutable state, identical subscriber counts and the same state updates. No library gets an intentionally unstable selector or an equality mode that produces extra renders for equivalent selections. Equality functions are equivalent only for these input values; this is not a general comparator conformance test.

## Workloads and validation

- **Vanilla setters:** 100,000 increasing object-state replacements, one listener, no React components. All libraries must notify exactly 100,000 times and end on the same count.
- **Primitive/object/nested selection:** 20 mounted subscribers and 500 updates. Unrelated updates must render zero times; selected-field changes must render 10,000 times. Flat selections return a fresh `{ count }`; nested selections return fresh nested objects and arrays. Each library stabilizes equal selections using its configured equality.
- **Derived list:** 5,000 items filtered on each selection, either 500 unrelated updates or a filter change on every update. Jotai's shared selected atom can evaluate the selector once per update, whereas hook-based selectors evaluate it per subscriber. This architectural difference is part of the result, not suppressed by the harness.
- **Cached list:** the same one-entry application cache, keyed by list reference and filter, is shared within each library's store. Unrelated updates must perform zero filtering after mount; changed-filter updates must perform exactly 500 filtering operations. This cache is an application pattern available to all three libraries, not a plain-store-only feature. Jotai apps can additionally model independent input atoms; that topology is outside this root-store comparison.
- **Equal writes:** 500 fresh root objects with unchanged contents. Default plain-store equality suppresses writes, while default Zustand/Jotai root reference equality accepts them. Selected render counts are zero for all configurations, but notification/selector counts differ. This is a separate semantics diagnostic: comparing these times as equal amounts of work would be misleading. A write guard can provide equivalent suppression in other libraries.

Timing excludes store creation, mounting, initial effects, assertions and unmounting. Every measured React update uses `flushSync`, so changed selections produce real commits and batching cannot hide work. Render time, DOM updates and selector/equality costs are included. A non-enumerable wrapper on the sample list's `filter` counts derivations without replacing any selector implementation. All final selected values, state fields, subscriber counts, expected renders, notifications and cached derivation counts are asserted. Selector/derivation counts must be identical across measured rounds for each configuration.

The harness uses production React/React DOM, Node and jsdom. Two warmup rounds precede seven measured rounds; library order rotates and reverses. Reports contain medians, empirical quartiles, every unrounded timing sample, computation/render/notification counts, library versions, Node/OS/CPU metadata and SHA-256 hashes of the harness, dependency lockfile and built plain-store artifact. `gitRevision` identifies the checkout base; the source hashes identify the actual files used even when running from a working tree.

## Bundle comparison

The size harness bundles consumer fixtures exposing an object-selection hook and count setter. Both flat and nested object fixtures use the same initial state and update semantics. Vite targets ES2020, minifies production ESM and gzips its output; only React is external. Assertions reject other unbundled dependencies. Equality helpers and the Zustand selector shim are included where used. These are fixture costs, not package download sizes or entire app sizes. They depend on the consumer, React version and build settings. `useShallow` is included in the flat fixture, but does not implement deep nested equality. The Jotai flat fixture uses a small count equality function instead of importing a general comparator.

## Reproduction and limits

The root lockfile installs React 18.3.1. To reproduce the React 19.3.0 runtime results without changing the manifest:

```sh
npm install --no-save --package-lock=false --ignore-scripts react@19.3.0 react-dom@19.3.0
npm run benchmark:compare
# Restore the root dependency versions afterward.
yarn install --frozen-lockfile --force
```

Run `npm run benchmark:check` after a build for a quick validation using 20 updates, 1,000 setters and one untimed-threshold round. CI runs that check with both React 18 and 19. It validates workload correctness and bundled imports; timing and relative rankings never decide success, and CI does not overwrite the checked-in full results.

These synthetic synchronous tests do not measure browser paint, user interaction latency, app startup, hydration, memory consumption, concurrent scheduling, fetching, middleware or complex atom graphs. Shared-machine scheduling, JIT and GC can move small timings substantially; quartile ranges often overlap. Re-run on the target app/browser before choosing a library. Results support specific configuration/workload claims, not a universal fastest-library ranking.
