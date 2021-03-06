/* eslint-disable unicorn/prefer-regexp-test -- rtk uses .match */

import { AnyAction } from '@reduxjs/toolkit'
import axios from 'axios'
import { execFile } from 'child_process'
import electron from 'electron'
import electronIsDev from 'electron-is-dev'
import xor from 'lodash/xor'
import path from 'path'
import sleep from 'tings/sleep'

import package_ from '../../package.json'
import { apps } from '../config/apps'
import {
  appStarted,
  changedHotkey,
  clickedAlreadyDonated,
  clickedBWebsiteButton,
  clickedCloseMenuButton,
  clickedCopyButton,
  clickedDonate,
  clickedEyeButton,
  clickedFavButton,
  clickedMaybeLater,
  clickedQuitButton,
  clickedReloadButton,
  clickedSetAsDefaultBrowserButton,
  clickedSettingsButton,
  clickedTile,
  clickedUpdateButton,
  clickedUpdateRestartButton,
  pressedAppKey,
  pressedCopyKey,
  pressedEscapeKey,
} from '../renderer/store/actions'
import type { ThemeState } from '../renderer/store/reducers'
import { alterHotkeys } from '../utils/alterHotkeys'
import copyToClipboard from '../utils/copyToClipboard'
import { filterAppsByInstalled } from '../utils/filterAppsByInstalled'
import { logger } from '../utils/logger'
import {
  gotAppVersion,
  gotDefaultBrowserStatus,
  gotInstalledApps,
  gotStore,
  gotTheme,
  MAIN_EVENT,
  updateAvailable,
  updateDownloaded,
  updateDownloading,
  urlUpdated,
} from './events'
import { store } from './store'

function getTheme(): ThemeState {
  const theme = {
    // Is dark mode?
    isDarkMode: electron.nativeTheme.shouldUseDarkColors,

    // Accent
    accent: `#${electron.systemPreferences.getAccentColor()}`,
  }
  return theme
}

declare const MAIN_WINDOW_WEBPACK_ENTRY: string
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string

// Attempt to fix this bug: https://github.com/electron/electron/issues/20944
electron.app.commandLine.appendArgument('--enable-features=Metal')

if (store.get('firstRun')) {
  // Prompt to set as default browser
  electron.app.setAsDefaultProtocolClient('http')
  electron.app.setAsDefaultProtocolClient('https')
}

// Prevents garbage collection
let bWindow: electron.BrowserWindow | undefined
// There appears to be some kind of race condition where the window is created
// but not yet ready, so the sent URL on startup gets lost. This tracks the
// ready-to-show event.
let bWindowIsReadyToShow = false
let tray: electron.Tray | undefined
let isEditMode = false

function getUpdateUrl(): string {
  return `https://update.electronjs.org/will-stone/browserosaurus/darwin-${
    process.arch
  }/${electron.app.getVersion()}`
}

async function isUpdateAvailable(): Promise<boolean> {
  const { data } = await axios(getUpdateUrl())
  return Boolean(data)
}

/**
 * Announces a main event to the renderer(s)
 */
function mainEvent(action: AnyAction) {
  bWindow?.webContents.send(MAIN_EVENT, action)
}

// TODO due to this issue: https://github.com/electron/electron/issues/18699
// this does not work as advertised. It will detect the change but getColor()
// doesn't fetch updated values. Hopefully this will work in time.
electron.nativeTheme.on('updated', () => {
  mainEvent(gotTheme(getTheme()))
})

function showBWindow() {
  if (bWindow) {
    const displayBounds = electron.screen.getDisplayNearestPoint(
      electron.screen.getCursorScreenPoint(),
    ).bounds

    const displayEnd = {
      x: displayBounds.x + displayBounds.width,
      y: displayBounds.y + displayBounds.height,
    }

    const mousePoint = electron.screen.getCursorScreenPoint()

    const bWindowBounds = bWindow.getBounds()

    const bWindowEdges = {
      right: mousePoint.x + bWindowBounds.width,
      bottom: mousePoint.y + bWindowBounds.height,
    }

    const nudge = {
      x: 50,
      y: 10,
    }

    const inWindowPosition = {
      x:
        bWindowEdges.right > displayEnd.x + nudge.x
          ? displayEnd.x - bWindowBounds.width
          : mousePoint.x - nudge.x,
      y:
        bWindowEdges.bottom > displayEnd.y + nudge.y
          ? displayEnd.y - bWindowBounds.height
          : mousePoint.y + nudge.y,
    }

    bWindow.setPosition(inWindowPosition.x, inWindowPosition.y, false)

    bWindow.show()
  }
}

electron.app.on('ready', async () => {
  const bounds = store.get('bounds')

  bWindow = new electron.BrowserWindow({
    frame: true,
    icon: path.join(__dirname, '/static/icon/icon.png'),
    title: 'Browserosaurus',
    webPreferences: {
      additionalArguments: [],
      nodeIntegration: true,
      contextIsolation: false,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      enableRemoteModule: false,
    },
    center: true,
    height: bounds?.height || 204,
    minHeight: 204,
    width: bounds?.width || 424,
    minWidth: 424,
    show: false,
    minimizable: false,
    maximizable: false,
    fullscreen: false,
    fullscreenable: false,
    movable: true,
    resizable: true,
    transparent: true,
    hasShadow: true,
    vibrancy: 'tooltip',
    visualEffectState: 'active',
    titleBarStyle: 'hidden',
    alwaysOnTop: true,
  })

  bWindow.setWindowButtonVisibility(false)

  await bWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY)

  bWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  bWindow.on('ready-to-show', () => {
    bWindowIsReadyToShow = true
  })

  bWindow.on('hide', () => {
    electron.app.hide()
  })

  bWindow.on('close', (event_) => {
    event_.preventDefault()
    bWindow?.hide()
  })

  bWindow.on('show', () => {
    // There isn't a listener for default protocol client, therefore the check
    // is made each time the app is brought into focus.
    mainEvent(
      gotDefaultBrowserStatus(electron.app.isDefaultProtocolClient('http')),
    )
  })

  bWindow.on('resize', () => {
    store.set('bounds', bWindow?.getBounds())
  })

  bWindow.on('blur', () => {
    bWindow?.hide()
  })

  /**
   * Menubar icon
   */
  tray = new electron.Tray(
    path.join(__dirname, '/static/icon/tray_iconTemplate.png'),
  )
  tray.setPressedImage(
    path.join(__dirname, '/static/icon/tray_iconHighlight.png'),
  )
  tray.setToolTip('Browserosaurus')
  tray.addListener('click', () => showBWindow())

  store.set('firstRun', false)

  // Auto update on production
  if (!electronIsDev) {
    electron.autoUpdater.setFeedURL({
      url: getUpdateUrl(),
      headers: {
        'User-Agent': `${package_.name}/${package_.version} (darwin: ${process.arch})`,
      },
    })

    electron.autoUpdater.on('before-quit-for-update', () => {
      // All windows must be closed before an update can be applied using "restart".
      bWindow?.destroy()
    })

    electron.autoUpdater.on('update-available', () => {
      mainEvent(updateDownloading())
    })

    electron.autoUpdater.on('update-downloaded', () => {
      mainEvent(updateDownloaded())
    })

    electron.autoUpdater.on('error', () => {
      logger('AutoUpdater', 'An error has occurred')
    })

    // 1000 * 60 * 60 * 24
    const ONE_DAY_MS = 86_400_000
    // Check for updates every day. The first check is done on load: in the
    // RENDERER_LOADED listener.
    setInterval(async () => {
      if (await isUpdateAvailable()) {
        mainEvent(updateAvailable())
      }
    }, ONE_DAY_MS)
  }

  // Hide from dock and cmd-tab
  electron.app.dock.hide()
})

// App doesn't always close on ctrl-c in console, this fixes that
electron.app.on('before-quit', () => {
  electron.app.exit()
})

async function sendUrl(url: string) {
  if (bWindow && bWindowIsReadyToShow) {
    isEditMode = false
    mainEvent(urlUpdated(url))
    showBWindow()
  } else {
    await sleep(500)
    sendUrl(url)
  }
}

electron.app.on('open-url', (event, url) => {
  event.preventDefault()
  sendUrl(url)
})

/**
 * ------------------
 * Renderer Listeners
 * ------------------
 */

electron.ipcMain.on('FROM_RENDERER', async (_, action: AnyAction) => {
  // App started
  if (appStarted.match(action)) {
    // Resets edit-mode if renderer was restarted whilst in edit-mode
    isEditMode = false

    const installedApps = await filterAppsByInstalled(apps)

    // Send all info down to renderer
    mainEvent(gotTheme(getTheme()))
    mainEvent(gotStore(store.store))
    mainEvent(gotInstalledApps(installedApps))
    mainEvent(
      gotAppVersion(
        `${electron.app.getVersion()}${electronIsDev ? ' DEV' : ''}`,
      ),
    )

    // Is default browser?
    mainEvent(
      gotDefaultBrowserStatus(electron.app.isDefaultProtocolClient('http')),
    )

    if (!electronIsDev && (await isUpdateAvailable())) {
      mainEvent(updateAvailable())
    }
  }

  // Copy to clipboard
  else if (clickedCopyButton.match(action) || pressedCopyKey.match(action)) {
    copyToClipboard(action.payload)
    bWindow?.hide()
  }

  // Quit
  else if (clickedQuitButton.match(action)) {
    electron.app.quit()
  }

  // Reload
  else if (clickedReloadButton.match(action)) {
    bWindow?.reload()
  }

  // Set as default browser
  else if (clickedSetAsDefaultBrowserButton.match(action)) {
    electron.app.setAsDefaultProtocolClient('http')
    electron.app.setAsDefaultProtocolClient('https')
    isEditMode = false
  }

  // Update and restart
  else if (clickedUpdateButton.match(action)) {
    electron.autoUpdater.checkForUpdates()
  }

  // Update and restart
  else if (clickedUpdateRestartButton.match(action)) {
    electron.autoUpdater.quitAndInstall()
  }

  // Change fav
  else if (clickedFavButton.match(action)) {
    store.set('fav', action.payload)
  }

  // Update hidden tiles
  else if (clickedEyeButton.match(action)) {
    store.set(
      'hiddenTileIds',
      xor(store.get('hiddenTileIds'), [action.payload]),
    )
  }

  // Update hotkeys
  else if (changedHotkey.match(action)) {
    const updatedHotkeys = alterHotkeys(
      store.get('hotkeys'),
      action.payload.appId,
      action.payload.value,
    )
    store.set('hotkeys', updatedHotkeys)
  }

  // Open app
  else if (pressedAppKey.match(action) || clickedTile.match(action)) {
    const { appId, url = '', isAlt, isShift } = action.payload

    // Bail if app's bundle id is missing
    if (!appId) return

    const app = apps.find((b) => b.id === appId)

    // Bail if app cannot be found in config (this, in theory, can't happen)
    if (!app) return

    const processedUrlTemplate = app.urlTemplate
      ? app.urlTemplate.replace(/\{\{URL\}\}/u, url)
      : url

    const openArguments: string[] = [
      '-b',
      appId,
      isAlt ? '--background' : [],
      isShift && app.privateArg ? ['--new', '--args', app.privateArg] : [],
      // In order for private/incognito mode to work the URL needs to be passed
      // in last, _after_ the respective app.privateArg flag
      processedUrlTemplate,
    ]
      .filter(Boolean)
      .flat()

    execFile('open', openArguments)

    bWindow?.hide()
  }

  // Go into edit mode
  else if (clickedSettingsButton.match(action)) {
    isEditMode = true
  }

  // Click close edit mode
  else if (clickedCloseMenuButton.match(action)) {
    isEditMode = false
  }

  // Click B's website button in settings
  else if (clickedBWebsiteButton.match(action)) {
    isEditMode = false
  }

  // Escape key
  else if (pressedEscapeKey.match(action)) {
    if (isEditMode) {
      isEditMode = false
    } else {
      bWindow?.hide()
    }
  }

  // Donate button or maybe later buttons clicked
  else if (clickedDonate.match(action) || clickedMaybeLater.match(action)) {
    store.set('supportMessage', Date.now())
  }

  // Already donated button clicked
  else if (clickedAlreadyDonated.match(action)) {
    store.set('supportMessage', -1)
  }
})
