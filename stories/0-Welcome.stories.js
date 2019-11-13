import React from 'react';
import { Provider, connect } from '../src';

const delay = (t, v) => new Promise(resolve => setTimeout(resolve, t, v));

// --------------------------------------

const TimerComponent = (props) => {
  return (
    <div>
      <button type="button" onClick={() => props.actions.setTimer(104)}>
        Timer {props.state.data.info.timer.time}
      </button>

      <button type="button" onClick={() => props.actions.increase()}>
        Timer {props.state.data.info.timer.time}
      </button>
    </div>
  );
};

const Timer = connect(
  TimerComponent,
  {
    name: 'timer',

    state: {
      data: {
        info: {
          timer: {
            time: 0,
          },
        },
      },
      laps: 99,
    },

    actions: {
      setTimer(value) {
        return {
          'data.info.timer.time': value,
        };
      },

      * increase() {
        const currentValue = yield this.getState('data.info.timer.time');

        yield {
          'data.info.timer.time': currentValue + 1,
        };
      },
    },
  },
);

// --------------------------------------

const AuthorCardComponent = (props) => {
  return (
    <div>
      <h1>{props.state.info.balance}</h1>
      <button
        type="button"
        onClick={props.actions.increaseBalance}
      >
        Click me
      </button>
      <button
        type="button"
        onClick={props.actions.becomeRich}
      >
        becomeRich
      </button>

      <h2>Time is {props.globalState.timer.data.info.timer.time}</h2>

      <h3>{
        props.state.timerSet === false ? 'Timer not set' : 'Timer is set!' 
      }</h3>
    </div>
  );
};

const AuthorCard = connect(
  AuthorCardComponent,
  {
    name: 'author-card',
    state: {
      info: {
        balance: 0,
      },
      timerSet: false,
    },
    actions: {
      increaseBalance() {
        return {
          'info.balance': 100,
        };
      },

      * becomeRich() {
        yield {
          'info.balance': 10,
        };

        yield delay(1000);

        yield {
          'info.balance': 100,
        };

        yield delay(1000);

        yield {
          'info.balance': 2000,
        };

        yield delay(1000);

        yield {
          'info.balance': 3000000,
        };
      },
    },
    handlers: {
      'timer.setTimer': () => {
        return {
          timerSet: true,
        };
      },
    },
  },
);

// --------------------------------------

const App = () => (
  <div>
    <AuthorCard />
    <Timer />
  </div>
);

// --------------------------------------

export const toStorybook = () => (
  <Provider>
    <App />
  </Provider>
);

export default {
  title: 'Index',
};
