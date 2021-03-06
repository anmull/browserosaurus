import { Rectangle } from 'electron'
import ElectronStore from 'electron-store'

import { App } from '../config/types'

/**
 * Keyboard shortcuts
 */
export type Hotkeys = { [key in string]: App['id'] }

export interface Store {
  supportMessage: number
  fav: string
  firstRun?: boolean
  hotkeys: Hotkeys
  hiddenTileIds: string[]
  // TODO [>=15] Deprecated, remove when reach v15
  theme?: 'dark' | 'dracula' | 'light'
  bounds?: Rectangle
}

export const store = new ElectronStore<Store>({
  name: 'store',
  defaults: {
    supportMessage: 0,
    fav: 'com.apple.Safari',
    firstRun: true,
    hotkeys: {},
    hiddenTileIds: [],
  },
  migrations: {
    '>=14.2.2': (storeInstance) => {
      storeInstance.delete('theme')
    },
  },
})
