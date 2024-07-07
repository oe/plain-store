import {
  createStore
} from '../src/index'

export const nameStore = createStore('Saiya')

// use global nameStore to change the store
// @ts-expect-error xxx
window.nameStore = nameStore