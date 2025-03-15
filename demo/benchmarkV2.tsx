import  { useEffect } from 'react';
import { createStore } from '../src/index';

const initialState = { count: 0 };
const { useStore, setStore, useSelector } = createStore(initialState);

const IncrementButton = () => {
  const increment = () => setStore((prev) => ({ count: prev.count + 1 }));
  return <button onClick={increment}>Increment</button>;
};

const CountDisplay = () => {
  const store = useStore();
  return <div>Count: {store.count}</div>;
};

const DoubleDisplay = () => {
  const count = useSelector((state) => state.count * 2);
  return <div>Double Count: {count}</div>;
};

export const BenchmarkV2 = () => {

  useEffect(() => {
    console.time('useSyncExternalStore');
    for (let i = 0; i < 1000; i++) {
      setStore((prev) => ({ count: prev.count + 1 }));
    }
    console.timeEnd('useSyncExternalStore');
  }, []);

  return (
    <div>
      <h1>Benchmark useSyncExternalStore</h1>
      <IncrementButton />
      <CountDisplay />
      <DoubleDisplay />
    </div>
  );
};

