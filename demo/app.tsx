import ReactDom from 'react-dom/client'
import { nameStore } from './store'
import { C1 } from './c1'
import { Name } from './name'

export const App = () => {
  const nameLength = nameStore.useSelector(n => n.length)
  console.log('app rendered')
  return (
    <div>
      Name Length {nameLength}
      <C1 />
      <Name />
    </div>
  )
}

ReactDom.createRoot(document.getElementById('root')!).render(<App />)
