import  { useEffect } from 'react';
import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';

const store = signal(0);

const IncrementButton = () => {
  useSignals()
  const increment = () => store.value++;
  return <button onClick={increment}>Increment</button>;
};

const CountDisplay = () => {
  useSignals()
  console.log('aaa render')
  return <div>Count: {store.value}</div>;
};

const DoubleDisplay = () => {
  useSignals()
  const count = store.value * 2;
  return <div>Double Count: {count}</div>;
};

const ProgressiveDisplay = () => {
  useSignals()
  const count = (store.value % 4) > 0;
  return <div>Progressive Count: {String(count)}</div>;
}

export const BenchmarkV3 = () => {
  useSignals()
  useEffect(() => {
    console.time('signals-react');
    for (let i = 0; i < 1000; i++) {
      store.value++;
    }
    console.timeEnd('signals-react');
  }, []);

  console.log('bbb render')

  return (
    <div>
      <h1>Benchmark @preact/signals-react</h1>
      <IncrementButton />
      <CountDisplay />
      <DoubleDisplay />
      <ProgressiveDisplay />
    </div>
  );
};

