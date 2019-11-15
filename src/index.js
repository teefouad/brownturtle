import React, { Component } from 'react';
import {
  createStore as createReduxStore,
  bindActionCreators,
  applyMiddleware,
  compose,
  combineReducers,
} from 'redux';
import reduxConnect from 'react-redux/es/connect/connect';
import ReduxProvider from 'react-redux/es/components/Provider';
import createSagaMiddleware from 'redux-saga';
import {
  takeLatest,
  put,
  call,
} from 'redux-saga/effects';
import * as helpers from './helpers';

const combinedInitialState = {};

/* =================================== */
/* STORE
/* =================================== */

const store = {
  reducers: {},
  sagas: [],
  middlewares: [],

  create(initialState = {}) {
    const sagaMiddleware = createSagaMiddleware();
    const sagaEnhancer = applyMiddleware(sagaMiddleware);
    const devTools = compose(window.devToolsExtension ? window.devToolsExtension() : foo => foo);

    this.middlewares = [...this.middlewares, sagaEnhancer, devTools];

    this.storeInstance = createReduxStore(
      this.getRootReducer(initialState),
      compose(...this.middlewares),
    );

    this.sagas.forEach(saga => sagaMiddleware.run(saga));

    return this.storeInstance;
  },

  getRootReducer(initialState = {}) {
    const reducers = { ...this.reducers };

    if (Object.keys(reducers).length === 0 || process.env.NODE_ENV === 'test') {
      reducers.$_foo = (state = {}) => state; // default reducer
    }

    const rootReducer = combineReducers(reducers);

    return (state = initialState, action = null) => {
      // start updating the state
      this.$updatingState = true;

      // clear getState calls queue
      this.getStateCallbacks = [];

      // get the new state object
      const newState = rootReducer(state, action);

      // invoke each getState call in the queue with the new state
      this.$updatingState = false;
      while (this.getStateCallbacks.length) this.getStateCallbacks.shift()(newState);

      // return the new state
      return newState;
    };
  },

  getState(query) {
    if (this.$updatingState === false) {
      return Promise.resolve(this.queryState(query, this.storeInstance.getState()));
    }

    return new Promise((resolve) => {
      this.getStateCallbacks.push((state) => {
        resolve(this.queryState(query, state));
      });
    });
  },

  queryState(query, state) {
    // handle query strings
    if (helpers.getObjectType(query) === 'string') {
      return helpers.findPropInObject(state, query);
    }

    // handle query objects
    if (helpers.getObjectType(query) === 'object') {
      return Object.keys(query).reduce((prev, next) => ({
        ...prev,
        [next]: helpers.findPropInObject(state, query[next]),
      }), {});
    }

    return state;
  },
};

export const useReducer = (name, reducer) => {
  store.reducers[name] = reducer;
};

export const useMiddleware = (middleware) => {
  store.middlewares.unshift(applyMiddleware(middleware));
};

/* =================================== */
/* PROVIDER
/* =================================== */

export const Provider = props => (
  <ReduxProvider
    store={store.create(combinedInitialState)}
    {...props}
  />
);

/* =================================== */
/* MODULE
/* =================================== */

class Module {
  constructor(config) {
    this.config = config;
    this.name = config.name;
    this.stateKey = config.stateKey || 'state';
    this.actionsKey = config.actionsKey || 'actions';
    this.globalStateKey = config.globalStateKey || 'globalState';
    this.actionCreators = {};
    this.actionToReducerMap = {};
    this.sagas = {};
    this.workerSagas = {};
    this.reducer = state => state;
    this.build();
  }

  build = () => {
    /* build action creators ---------- */
    Object.entries(this.config.actions || {}).forEach(([name, callback]) => {
      const camelCaseName = helpers.toCamelCase(name);
      const actionName = helpers.toSnakeCase(camelCaseName).toUpperCase();
      const actionType = `@@${this.name}/${actionName}`;
      const argNames = helpers.getArgNames(callback);

      this.actionCreators[camelCaseName] = (...args) => {
        // build the payload object
        const payload = argNames.reduce((prev, next, index) => ({
          ...prev,
          [next]: args[index],
        }), {});

        // then use it to build the action object
        const actionObject = {
          type: actionType,
          payload,
        };

        return actionObject;
      };

      this.actionToReducerMap[actionType] = this.createSubReducer(actionType, callback, argNames, 'create');
      this.sagas[actionType] = this.createSaga(actionType);
    });

    /* build handlers ----------------- */
    Object.entries(this.config.handlers || {}).forEach(([name, callback]) => {
      let actionType = name;

      if (/^(.*?)\.(.*?)$/.test(actionType)) {
        const [moduleName, camelCaseName] = actionType.split('.');
        const actionName = helpers.toSnakeCase(camelCaseName).toUpperCase();
        actionType = `@@${moduleName}/${actionName}`;
      }

      const argNames = helpers.getArgNames(callback);

      this.actionToReducerMap[actionType] = this.createSubReducer(actionType, callback, argNames, 'handle');
      this.sagas[actionType] = this.createSaga(actionType);
    });

    /* build reducer ------------------ */
    this.reducer = (state = {}, action) => {
      // the action type might be in normal form, such as: '@@prefix/ACTION_NAME'
      // or it may contain a sub action type: '@@prefix/ACTION_NAME/SUB_ACTION_NAME'
      const actionType = action.type;
      const mainActionType = (actionType.match(/@@(.*?)\/((.*?)(?=\/)|(.*?)$)/) || [])[0] || actionType;
      const subActionType = actionType.replace(mainActionType, '').slice(1);
      const actionName = mainActionType.replace(/^@@(.*?)\//, '');

      let newState = state;

      // if the sub action is 'update', just update the state with the payload object
      if (mainActionType === `@@${this.name}/${actionName}` && subActionType === 'UPDATE') {
        newState = helpers.mergeObjects(state, action.payload || {});
      }

      // if it's a main action, look for a sub reducer that can handle this action
      this.getActionTypeMatchers(actionType).forEach((matcher) => {
        if (this.actionToReducerMap[matcher]) {
          newState = this.actionToReducerMap[matcher](newState, action);
        }
      });

      return newState;
    };

    /* map state to props ------------- */
    this.mapStateToProps = (state) => {
      const { [this.name]: ownState, ...globalState } = state;

      return {
        [this.stateKey]: ownState,
        [this.globalStateKey]: globalState,
      };
    };

    /* map dispatch to props ---------- */
    this.mapDispatchToProps = dispatch => bindActionCreators(this.actionCreators, dispatch);

    /* combine props ------------------ */
    this.combineProps = (stateProps, dispatchProps, ownProps) => ({
      ...ownProps,
      ...stateProps,
      [this.actionsKey]: { ...dispatchProps },
    });
  }

  createSubReducer = (actionType, callback, argNames, mode) => (state = {}, action = null) => {
    const matchers = this.getActionTypeMatchers(action.type);

    if (matchers.includes(actionType)) {
      const callbackResult = this.executeCallback(callback, action, argNames, mode);
      const callbackResultType = helpers.getObjectType(callbackResult);
      const stateFragment = (callbackResultType === 'object' ? callbackResult : {});

      // the saga handler will be called right after the reducer so instead of the saga
      // handler executing the callback again, pass it the cached result
      this.cachedCallbackResult = this.cachedCallbackResult || {};
      this.cachedCallbackResult[action.type] = callbackResult;

      return helpers.mergeObjects(state, stateFragment);
    }

    return state;
  };

  createSaga = actionType => function* saga() {
    this.workerSagas[actionType] = function* workerSaga() {
      const result = this.cachedCallbackResult && this.cachedCallbackResult[actionType];

      // check if the callback return value is an iterable (usually a generator function)
      // if it is an iterable then consume it
      if (result && typeof result[Symbol.iterator] === 'function') {
        try {
          // `data` will be assigned to each `next()` call
          let data;
          // `isDone` will be true when `next()` returns done as true
          let isDone = false;
          // the while loop will break after a maximum of 50 calls
          let breakAfter = 50;

          while (!isDone) {
            const next = result.next(data);
            const nextResult = next.value;

            isDone = next.done;

            // if the yielded value is a Promise, resolve it then continue
            if (nextResult instanceof Promise) {
              data = yield call(() => nextResult);
            } else
            // if the yielded value is an object, use it to update the state
            if (helpers.getObjectType(nextResult) === 'object') {
              yield put({
                type: `${actionType}/UPDATE`,
                payload: nextResult,
              });
            }

            breakAfter -= 1;

            // safety break
            if (breakAfter === 0) {
              throw new Error('An async action handler yielded more than 50 values.');
            }
          }

          // indicate that the async action has completed by dispatching
          // a COMPLETE sub action
          yield put({
            type: `${actionType}/COMPLETE`,
          });
        } catch (e) {
          window.console.error(e);

          yield put({
            type: `${actionType}/ERROR`,
            message: e.message,
          });
        }
      }
    }.bind(this);

    yield takeLatest(actionType, this.workerSagas[actionType]);
  }.bind(this);

  executeCallback = (callback, action, argNames, mode) => {
    const callbackArgs = mode === 'create' ? argNames.map(arg => action.payload[arg]) : [action];
    return callback.apply(this.getCallbackContext(), callbackArgs);
  }

  getCallbackContext = () => {
    const self = this;

    return {
      ...self.config.actions,
      getState: self.getState,
      get state() { return self.getState(); },
    };
  }

  getState = async (query) => {
    const state = (await store.getState())[this.name];

    // handle query strings
    if (helpers.getObjectType(query) === 'string') {
      return helpers.findPropInObject(state, query);
    }

    // handle query objects
    if (helpers.getObjectType(query) === 'object') {
      return Object.keys(query).reduce((prev, next) => ({
        ...prev,
        [next]: helpers.findPropInObject(state, query[next]),
      }), {});
    }

    return state;
  }

  getActionTypeMatchers = (actionType) => {
    const regex = /@@(.+?)\/(.+)/;
    let moduleName = '';
    let actionName = actionType;

    if (regex.test(actionType)) {
      [, moduleName, actionName] = actionType.match(regex);
    }

    return [
      actionType, // exact action
      `@@${moduleName}`, // any action by the module
      `@@${moduleName}/`, // any action by the module (alias)
      `@@${moduleName}/*`, // any action by the module (alias)
      `@@*/${actionName}`, // same action dispatched by any module
      `*/${actionName}`, // same action dispatched by any module (alias)
      '*', // any action
    ];
  }
}

/* =================================== */
/* CONNECT
/* =================================== */

export const connect = (component, config = {}) => {
  if (typeof component !== 'function' && Object.getPrototypeOf(component) !== Component) {
    throw new Error('Expected the first parameter to be a pure function or a valid React component class.');
  }

  if (helpers.getObjectType(config) !== 'object') {
    throw new Error('Module configuration must be an object');
  }

  const moduleConfig = { ...config };

  if (!moduleConfig.name) {
    moduleConfig.name = helpers.getComponentName(component);
  }

  if (typeof connect.moduleNames === 'undefined') {
    connect.moduleNames = {};
  }

  if (connect.moduleNames[moduleConfig.name] === true) {
    throw new Error(`Name '${moduleConfig.name}' has already been used by another module, please use a different name`);
  } else {
    connect.moduleNames[moduleConfig.name] = true;
  }

  const module = new Module(moduleConfig);

  combinedInitialState[module.name] = moduleConfig.initialState || moduleConfig.state || {};
  store.reducers[module.name] = module.reducer;

  const connectedComponent = reduxConnect(
    module.mapStateToProps,
    module.mapDispatchToProps,
    module.combineProps,
  )(component);

  store.sagas = [
    ...store.sagas,
    ...Object.values(module.sagas),
  ];

  return connectedComponent;
};

export default {};
