import { createStore, type ICreateStoreOptions } from '../src/index.ts';

export interface Todo {
  id: number;
  done: boolean;
}

export interface TodoState {
  todos: Todo[];
  filter: 'all' | 'active' | 'done';
  progress: number;
}

// Application code, not an additional plain-store API. One cached result;
// immutable inputs are required. Create a separate selector for each store.
export function createVisibleTodoSelector() {
  let cached: Pick<TodoState, 'todos' | 'filter'> & { result: Todo[] } | undefined;
  return ({ todos, filter }: TodoState) => {
    if (cached && cached.todos === todos && cached.filter === filter) {
      return cached.result;
    }
    const result = filter === 'all'
      ? todos : todos.filter((todo) => todo.done === (filter === 'done'));
    cached = { todos, filter, result };
    return result;
  };
}

export function createTodoStore(initialState: TodoState, options?: ICreateStoreOptions) {
  return {
    store: createStore(initialState, options),
    selectVisibleTodos: createVisibleTodoSelector(),
  };
}
