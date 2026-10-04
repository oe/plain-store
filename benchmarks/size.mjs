import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { build } from 'vite';

// Consumer fixtures with equivalent flat/deep object selections and update APIs.
function fixtures(deep) {
  const select = deep ? 's=>({filters:{query:s.query},picks:[s.count,42]})' : 's=>({count:s.count})';
  const state = '{count:0,query:""}';
  return {
    'plain-store': `import {createStore} from '../dist/esm/index.mjs';
      const store=createStore(${state});
      export const useCounter=()=>store.useSelector(${select});
      export const setCount=count=>store.set({count},true);`,
    Zustand: `import {createStore} from 'zustand/vanilla';
      import {useStoreWithEqualityFn} from 'zustand/traditional'; import equal from 'fast-deep-equal';
      const store=createStore(()=>(${state}));
      export const useCounter=()=>useStoreWithEqualityFn(store,${select},equal);
      export const setCount=count=>store.setState({count});`,
    ...(!deep ? { 'Zustand/useShallow': `import {createStore} from 'zustand/vanilla';
      import {useStore} from 'zustand'; import {useShallow} from 'zustand/react/shallow';
      const store=createStore(()=>(${state}));
      export const useCounter=()=>useStore(store,useShallow(${select}));
      export const setCount=count=>store.setState({count});` } : {}),
    Jotai: `import {atom,createStore,useAtomValue} from 'jotai'; import {selectAtom} from 'jotai/utils';
      ${deep ? "import equal from 'fast-deep-equal';" : 'const equal=(a,b)=>a.count===b.count;'}
      const store=createStore(), state=atom(${state});
      const selected=selectAtom(state,${select},equal);
      export const useCounter=()=>useAtomValue(selected,{store});
      export const setCount=count=>store.set(state,{...store.get(state),count});`,
  };
}

export async function measureBundles() {
  const root = dirname(import.meta.filename);
  const outDir = mkdtempSync(resolve(tmpdir(), 'plain-store-benchmark-size-'));
  const result = {};
  try {
    for (const deep of [false, true]) {
      const group = deep ? 'deepObject' : 'flatObject';
      result[group] = {};
      for (const [name, code] of Object.entries(fixtures(deep))) {
        const entry = resolve(root, '.size-fixture.mjs');
        writeFileSync(entry, code);
        try {
          const built = await build({ configFile: false, root, logLevel: 'silent',
            define: { 'process.env.NODE_ENV': JSON.stringify('production') },
            build: { write: false, outDir, minify: true, target: 'es2020',
              lib: { entry, formats: ['es'] }, rollupOptions: {
                external: (id) => id === 'react' || id.startsWith('react/'),
              },
            },
          });
          const outputs = (Array.isArray(built) ? built : [built]).flatMap((b) => b.output);
          const chunks = outputs.filter((item) => item.type === 'chunk');
          assert.equal(chunks.length, 1, 'one self-contained ESM chunk expected');
          for (const id of chunks[0].imports) assert.ok(id === 'react' || id.startsWith('react/'), `unbundled dependency: ${id}`);
          result[group][name] = { bytes: Buffer.byteLength(chunks[0].code), gzipBytes: gzipSync(chunks[0].code).length };
        } finally {
          rmSync(entry, { force: true });
        }
      }
    }
    return result;
  } finally {
    rmSync(outDir, { force: true, recursive: true });
  }
}
