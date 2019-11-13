/**
 * Dependency imports.
 */
import {
  createStore as createReduxStore,
  // combineReducers,
  // applyMiddleware,
  // compose,
} from 'redux';

const getRootReducer = initialState => (state = initialState, action = null) => {
  if (action) {
    console.log(action);
  }

  return state;
};

export default (initialState = {}) => createReduxStore(getRootReducer(initialState));
