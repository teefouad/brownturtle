import React from 'react';
import { Provider, connect } from '../src';

export default {
  title: 'Examples',
};

/* -------------------------------------------------- */

const App = connect(
  ({ state, actions }) => (
    <div>
      <h1>{state.value}</h1>
      <button type="button" onClick={actions.increaseValue}>
        Increase value
      </button>
    </div>
  ),

  {
    name: 'app',

    state: {
      value: 0,
    },

    actions: {
      increaseValue() {
        const state = this.getState();
        return {
          value: state.value + 1,
        };
      },
      // * increaseValue() {
      //   const state = yield this.getState();
      //   yield {
      //     value: state.value + 1,
      //   };
      // },
    },
  },
);

const AnotherApp = connect(
  () => (
    <div>
    </div>
  ),

  {
    name: 'app_b',

    state: {
      value: 0,
      foo: 'baz',
    },
  },
);

export const test = () => (
  <Provider>
    <App />
    <AnotherApp />
  </Provider>
);


// const Todos = connect(
//   // Component
//   ({ state, actions }) => {
//     return (
//       <div>
//         <h1>Todo Items</h1>

//         <form onSubmit={actions.addNewItem}>
//           <input type="text" name="new-item" />
//         </form>

//         <ol>
//           {
//             state.items.map((item, index) => (
//               <li key={`${item.text}-${Math.random()}`}>
//                 <input
//                   checked={item.complete}
//                   type="checkbox"
//                   onChange={e => actions.toggleItem(index, e.target.checked)}
//                 />
//                 {
//                   item.complete ? (
//                     <s>{item.text}</s>
//                   ) : (
//                     item.text
//                   )
//                 }
//               </li>
//             ))
//           }
//         </ol>

//         <button type="button" onClick={actions.clearComplete}>Clear Complete</button>
//       </div>
//     );
//   },

//   // Speedux Module
//   {
//     name: 'todos',

//     state: {
//       items: [
//         {
//           text: 'Take a shower',
//           complete: true,
//         },
//         {
//           text: 'Brush your teeth',
//           complete: false,
//         },
//         {
//           text: 'Poop',
//           complete: false,
//         },
//       ],
//     },

//     actions: {
//       toggleItem(index, isComplete) {
//         return {
//           [`items[${index}].complete`]: isComplete,
//         };
//       },

//       * clearComplete() {
//         console.log('inside action generator: will wait for state from module');
//         const items = yield this.getState('items');
//         console.log('inside action generator: got state', items);

//         console.log(items);
//         const incompleteItems = items.filter(item => item.complete === false);

//         yield {
//           items: incompleteItems,
//         };
//       },

//       * addNewItem(e) {
//         e.preventDefault();

//         const newItem = {
//           text: e.target['new-item'].value,
//           complete: false,
//         };

//         e.target['new-item'].value = '';

//         const items = yield this.getState('items');

//         yield {
//           items: [
//             ...items,
//             newItem,
//           ],
//         };
//       },
//     },
//   },
// );

// export const TodoApp = () => (
//   <Provider>
//     <Todos />
//   </Provider>
// );

// // --------------------------------------

// const Library = connect(
//   // Component
//   ({ state, actions }) => {
//     return (
//       <div>
//         {
//           Object.values(state.elements).map(element => (
//             <button
//               key={element.id}
//               type="button"
//               onClick={() => actions.selectElement(element.id)}
//             >
//               {element.title}
//             </button>
//           ))
//         }
//       </div>
//     );
//   },

//   // Speedux Module
//   {
//     name: 'library',

//     state: {
//       selectedElement: null,
//       elements: {
//         heading: {
//           id: 'heading',
//           title: 'Heading',
//           props: ['size'],
//         },
//         button: {
//           id: 'button',
//           title: 'Button',
//           props: ['type', 'color'],
//         },
//         link: {
//           id: 'link',
//           title: 'Link',
//           props: ['title', 'href', 'target'],
//         },
//       },
//     },

//     actions: {
//       selectElement(data) {
//         return {
//           selectedElement: data,
//         };
//       },
//     },

//     handlers: {
//       'sidebar.updateItem': function* ssssss(action) {
//         console.log('ssssssssssssssssssssssss')
//         console.log(action)
//         yield {
//           [`elements.${action.payload.id}.title`]: action.payload.newTitle,
//         };
//       },
//     },
//   },
// );

// const Sidebar = connect(
//   // Component
//   ({ state, globalState, actions }) => {
//     const setTitle = (id, newTitle) => {
//       dispatch('sidebar.updateItem', {
//         id,
//         newTitle,
//       });
//     };

//     const { selectedElement: selectedId, elements } = globalState.library;
//     const selectedElement = elements[selectedId];

//     return (
//       <div style={{ width: 300, background: 'red' }}>
//         <h4>
//           {state.foo} Selected element is:
//           <button type="button" onClick={() => setTitle(selectedId, prompt(selectedElement.title))}>
//             {selectedElement ? selectedElement.title : 'none'}
//           </button>
//         </h4>
//       </div>
//     );
//   },

//   // Speedux Module
//   {
//     name: 'sidebar',

//     state: {
//       selectedElement: null,
//       foo: 'foo',
//     },

//     handlers: {
//       'library.selectElement': function* sss(action) {
//         console.log('aaaaaaaaaaaaaaaaa')
//         yield {
//           selectedElement: action.payload.data,
//           foo: 'sadasd',
//         }
//       }

//       // 'library.selectElement': function* onSelectElement(action) {
//       //   const gs = yield this.getState();
//       //   console.log(gs, action);

//       //   yield {
//       //     selectedElement: action.payload.data,
//       //     foo: 'sadasd',
//       //   };
//       // },
//     },
//   },
// );

// export const EditorApp = () => (
//   <Provider>
//     <Sidebar />
//     <Library />
//   </Provider>
// );


// // --------------------------------------

// const Items = connect(
//   // Component
//   ({ state, globalState, dispatch: dispatchAction }) => {
//     return (
//       <div>
//         {
//           Object.values(state.items).map((item) => {
//             const inCart = globalState.cart.items[item.id];
            
//             return (
//               <div key={item.id}>
//                 <h1>{item.name}
//                 </h1>
//                 <h4>{item.price}</h4>
//                 <button disabled={inCart} type="button" onClick={() => dispatchAction('cart.addItem', { item })}>
//                   {
//                     inCart ? 'Added' : 'Add to cart'
//                   }
//               </button>
//               </div>
//             );
//           })
//         }
//       </div>
//     );
//   },

//   // Speedux Module
//   {
//     name: 'items',

//     state: {
//       items: {
//         0: {
//           id: 0,
//           name: 'Shoes',
//           price: 100,
//         },
//         1: {
//           id: 1,
//           name: 'PS4',
//           price: 450,
//         },
//         2: {
//           id: 2,
//           name: 'Backpack',
//           price: 2300,
//         },
//       },
//     },
//   },
// );

// const Cart = connect(
//   // Component
//   ({ state, actions }) => (
//     <div>
//       <h1>Cart:</h1>

//       <ul>
//         {
//           Object.values(state.items).map(item => (
//             <li key={item.id}>
//               <h3>{item.name} <small>{item.price}</small></h3>
//               <button type="button" onClick={() => actions.removeItem(item)}>Remove item</button>
//             </li>
//           ))
//         }
//       </ul>

//       <hr />
//       <h3>Total: {Object.values(state.items).reduce((p, n) => (p + n.price), 0)}</h3>
//       <hr />
//     </div>
//   ),

//   // Speedux Module
//   {
//     name: 'cart',

//     state: {
//       items: {},
//     },

//     actions: {
//       removeItem(item) {
//         return {
//           [`items.${item.id}`]: undefined,
//         }
//       }
//     },

//     handlers: {
//       'cart.addItem': (action) => {
//         return {
//           [`items.${action.payload.item.id}`]: action.payload.item,
//         };
//       },
//     },
//   },
// );

// export const ShoppingCartApp = () => (
//   <Provider>
//     <Cart />
//     <Items />
//   </Provider>
// );

// export default {
//   title: 'Examples',
// };
