/* eslint-disable unicorn/prefer-regexp-test -- rtk uses .match */

import {
  Action,
  AnyAction,
  combineReducers,
  configureStore,
  ThunkAction,
} from '@reduxjs/toolkit'
import electron from 'electron'
import deepEqual from 'fast-deep-equal'
import {
  shallowEqual,
  TypedUseSelectorHook,
  useSelector as useReduxSelector,
} from 'react-redux'

import { MAIN_EVENT } from '../../main/events'
import { apps, theme, ui } from './reducers'
import { sendToMainMiddleware } from './send-to-main.middleware'

// Root Reducer
const rootReducer = combineReducers({ ui, apps, theme })
export type RootState = ReturnType<typeof rootReducer>

// Store
const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => [
    ...getDefaultMiddleware(),
    sendToMainMiddleware(),
  ],
})

export default store

// useSelector hook wrapper includes typed state
export const useSelector: TypedUseSelectorHook<RootState> = useReduxSelector
export const useShallowEqualSelector: TypedUseSelectorHook<RootState> = (
  selector,
) => useSelector(selector, shallowEqual)
export const useDeepEqualSelector: TypedUseSelectorHook<RootState> = (
  selector,
) => useSelector(selector, deepEqual)

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>

// -----------------------------------------------------------------------------
// Main event listeners
// -----------------------------------------------------------------------------

electron.ipcRenderer.on(MAIN_EVENT, (_: unknown, action: AnyAction) => {
  store.dispatch(action)
})
