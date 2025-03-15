import  { useEffect } from 'react';
import { createStore } from './old-store';

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

export const BenchmarkV1 = () => {

  useEffect(() => {
    console.time('Benchmark useEffect');
    for (let i = 0; i < 1000; i++) {
      setStore((prev) => ({ count: prev.count + 1 }));
    }
    console.timeEnd('Benchmark useEffect');
  }, []);

  return (
    <div>
      <h1>Benchmark useEffect</h1>
      <IncrementButton />
      <CountDisplay />
      <DoubleDisplay />
    </div>
  );
};

