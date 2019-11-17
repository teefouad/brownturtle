/**
 * Dependency imports.
 */
import React, { Component } from 'react';
import reduxConnect from 'react-redux/es/connect/connect';
import ReduxProvider from 'react-redux/es/components/Provider';
import {
  createStore as createReduxStore,
  bindActionCreators,
  applyMiddleware,
  compose,
  combineReducers,
} from 'redux';
import createSagaMiddleware from 'redux-saga';
import {
  takeEvery,
  put,
  call,
} from 'redux-saga/effects';

/**
 * Local imports.
 */
import * as helpers from './helpers';

/**
 * An object that is used to build the initial state tree for the
 * entire app. Each call to `connect()` will add a new key to this
 * object.
 * @type {Object}
 */
const combinedInitialState = {};

/* =================================== */
/* STORE
/* =================================== */

/**
 * Creates the saga middleware function.
 * @type {Function}
 */
const sagaMiddleware = createSagaMiddleware();

/**
 * Creates the saga store enhancer.
 * @type {Function}
 */
const sagaEnhancer = applyMiddleware(sagaMiddleware);

/**
 * Creates a middleware function that is used to enable Redux devTools.
 * in the browser.
 * @type {Function}
 */
const devTools = compose(window.devToolsExtension ? window.devToolsExtension() : foo => foo);

/**
 * This is not the actual store object. This is a wrapper object
 * that manages the Redux store instance. Use `store.getInstance()`
 * to get a reference to the Redux store.
 */
const store = {
  /**
   * An object that is used as a map to store references to registered
   * reducers. This object is used by `getRootReducer()` to create the
   * root reducer for the store.
   * @type {Object}
   */
  reducers: {},


  sagas: [],

  /**
   * An array of middlewares to use when creating the store.
   * Use exported method `useMiddleware()` to add other middleware
   * functions to this list.
   * @type {Array}
   */
  middlewares: [sagaEnhancer, devTools],

  /**
   * Creates a new Redux store instance and updates the reference.
   */
  create(initialState = {}) {
    if (this.storeInstance) return this.storeInstance;

    this.storeInstance = createReduxStore(
      this.getRootReducer(initialState),
      compose(...this.middlewares),
    );

    this.sagas.forEach(saga => sagaMiddleware.run(saga));

    return this.storeInstance;
  },

  /**
   * Combines all registered reducers and returns a single reducer function.
   * @param {Object} initialState The initial state for the app
   */
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

  /**
   * Returns the complete state object or part of it based on a given query. If the
   * query parameter is a string that uses dot notation, it will return the resolved
   * value of the given key. If the query is an object, it will return an object that
   * has the same structure but contains the resolved values. If the query parameter
   * is not provided, the complete state object will be returned.
   * @param   {String|Object}   query   A query string or a query object that represents
   *                                    part of the state object that needs to be fetched.
   *                                    This parameter is not required.
   * @return  {Promise}                 A promise that eventually resolves with the state
   *                                    object, part of it or a value in the state object.
   */
  getState(query) {
    if (this.$updatingState === false) {
      return Promise.resolve(this.getStateSync(query));
    }

    return new Promise((resolve) => {
      this.getStateCallbacks.push((state) => {
        resolve(this.queryState(query, state));
      });
    });
  },

  getStateSync(query) {
    return this.queryState(query, this.storeInstance.getState());
  },

  /**
   * Queries a state object for a specific value.
   * @param   {String}    query   Query string.
   * @param   {Object}    state   State object to query.
   * @return  {Object}            The state object, part of it or a value in the state object.
   */
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

  /**
   * Returns an reference to the Redux store instance.
   */
  getInstance() {
    return this.storeInstance;
  },
};

/**
 * Adds a reducer function to be used by the root reducer.
 * @param  {String}   key       Reducer unique identifier key
 * @param  {Function} reducer   Reducer function.
 */
export const useReducer = (name, reducer) => {
  store.reducers[name] = reducer;
};

/**
 * Allows registering middleware functions such as Router and other middlewares.
 * @param {Function} middleWare Middleware function to use
 */
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
/* DISPATCH
/* =================================== */

/**
 * Dispatches an action. It may accepts two or three parameters:
 * dispatch(actionType, payload);
 * dispatch(actionObject);
 * @param   {String}  actionType    Type of the action to be dispatched
 * @param   {Object}  payload       Action payload object
 * @param   {Object}  actionObject  Normal action object that contains a 'type' property
 */
function dispatch(...args) {
  let action = {};

  if (helpers.getObjectType(args[0]) === 'object') {
    action = helpers.deepCopy(args[0]);
  } else
  if (helpers.getObjectType(args[0]) === 'string') {
    // set the type
    if (/^([^.]*?)\.([^.]*?)$/.test(args[0])) {
      const [moduleName, moduleAction] = args[0].split('.');
      const camelCaseName = helpers.toCamelCase(moduleAction);
      const actionName = helpers.toSnakeCase(camelCaseName).toUpperCase();
      action.type = `@@${moduleName}/${actionName}`;
    } else {
      [action.type] = args;
    }

    // set the payload
    if (helpers.getObjectType(args[1]) === 'object') {
      action.payload = { ...args[1] };
      args.splice(1, 1);
    } else {
      action.payload = {};
    }
  }

  store.storeInstance.dispatch(action);
}

/* =================================== */
/* MODULE
/* =================================== */

class Module {
  constructor(config) {
    this.config = config;
    this.name = config.name;
    this.stateKey = config.stateKey || 'state';
    this.actionsKey = config.actionsKey || 'actions';
    this.dispatchKey = config.dispatchKey || 'dispatch';
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

      this.cachedState = {
        [this.name]: state,
      };

      // if the sub action is 'update', just update the state with the payload object
      if (
        // for self actions
        (mainActionType === `@@${this.name}/${actionName}` && subActionType === 'UPDATE')
        // for handled actions
        || this.actionToReducerMap[mainActionType]
      ) {
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
    this.mapDispatchToProps = dispatchFunc => bindActionCreators(this.actionCreators, dispatchFunc);

    /* combine props ------------------ */
    this.combineProps = (stateProps, dispatchProps, ownProps) => ({
      ...ownProps,
      ...stateProps,
      [this.actionsKey]: { ...dispatchProps },
      [this.dispatchKey]: dispatch,
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
    this.workerSagas[actionType] = function* workerSaga(action) {
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
            this.cachedState = yield call(() => store.getState());

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
                type: `${action.type}/UPDATE`,
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
            type: `${action.type}/COMPLETE`,
          });
        } catch (e) {
          window.console.error(e);

          yield put({
            type: `${action.type}/ERROR`,
            message: e.message,
          });
        }
      }
    }.bind(this);

    yield takeEvery(actionType, this.workerSagas[actionType]);
  }.bind(this);

  executeCallback = (callback, action, argNames, mode) => {
    const context = this.getCallbackContext();
    const callbackArgs = mode === 'create' ? argNames.map(arg => action.payload[arg]) : [action];
    return callback.apply(context, callbackArgs);
  }

  getCallbackContext = () => {
    const self = this;

    return {
      ...self.config.actions,
      getState: self.getState,
    };
  }

  getState = (query) => {
    const state = this.cachedState[this.name];

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

/**
 * Connects a component to the Redux store and injects its module state and actions into the
 * component props. If the module name is not provided, the name of the component or function
 * will be used instead. If the component definition is an anonymous function, then the module
 * name must be provided in the configuration object. If the initial state is not provided, an
 * empty object will be assumed to be the initial state.
 * @param {Class|Function}    component   The component to be connected.
 * @param {Object}            config      Configuration object that may contain all or some of
 *                                        the following keys:
 *                                          - name
 *                                              Module namespace, which will be used as a key in
 *                                              the state tree and as a prefix for module actions.
 *                                          - state
 *                                              The initial state object for the module. This
 *                                              object is used to populate the Redux state object
 *                                              with initial values.
 *                                          - actions
 *                                              A hash table of all the actions that can be
 *                                              dispatched from the component to update the state.
 *                                          - handlers
 *                                              A hash table of handler function that listen to
 *                                              actions dispatched by the store. The key represents
 *                                              the action type that needs to be handled and the
 *                                              value represents the handler function.
 *                                          - stateKey
 *                                              The stateKey is a string used to inject the module
 *                                              state into the component props.
 *                                              The default value is 'state'.
 *                                          - globalStateKey
 *                                              The globalStateKey is a string used to inject the
 *                                              global state tree, excluding the module state, into
 *                                              the component props.
 *                                              The default value is 'globalState'.
 *                                          - actionsKey
 *                                              The actionsKey is a string used to inject the module
 *                                              action creator functions into the component props.
 *                                              The default value is 'actions'.
 *                                          - dispatchKey
 *                                              The dispatchKey is a string used to inject the
 *                                              dispatch function into the component props.
 *                                              The default value is 'actions'.
 */
export const connect = (component, config) => {
  if (!component || !config) {
    throw new Error('The \'connect\' function expects a component definition and a valid configuration object as parameters.');
  }

  if (typeof component !== 'function' && Object.getPrototypeOf(component) !== Component) {
    throw new Error('Expected the first parameter to be a pure function or a valid React component class.');
  }

  if (helpers.getObjectType(config) !== 'object') {
    throw new Error('Module configuration must be a valid object.');
  }

  const moduleConfig = {
    ...config,
    name: config.name || helpers.getComponentName(component),
  };

  if (!moduleConfig.name) {
    throw new Error('Property \'name\' is missing from the module configuration. Module name is required.');
  }

  if (typeof connect.moduleNames === 'undefined') {
    connect.moduleNames = {};
  }

  if (connect.moduleNames[moduleConfig.name] === true) {
    throw new Error(`Name '${moduleConfig.name}' has already been used by another module, please use a different name.`);
  } else {
    connect.moduleNames[moduleConfig.name] = true;
  }

  const module = new Module(moduleConfig);
  const initialState = moduleConfig.initialState || moduleConfig.state || {};

  combinedInitialState[module.name] = helpers.deepCopy(initialState);
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
