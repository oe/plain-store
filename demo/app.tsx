import ReactDom from 'react-dom/client'
import { nameStore } from './store'
import { C1 } from './c1'
import { Name } from './name'
import { BenchmarkV1 } from './benchmarkV1'
import { BenchmarkV2 } from './benchmarkV2'

export const App = () => {
  const nameLength = nameStore.useSelector(n => n.length)
  console.log('app rendered')
  return (
    <div>
      Name Length {nameLength}
      <C1 />
      <Name />
      <BenchmarkV1 />
      <BenchmarkV2 />
    </div>
  )
}

ReactDom.createRoot(document.getElementById('root')!).render(<App />)
