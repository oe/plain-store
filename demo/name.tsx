import { nameStore } from './store'
export function Name() {
  console.log('name rendered')
  const name = nameStore.useStore()
  return (
    <div>
      user name {name}
    </div>
  )
}