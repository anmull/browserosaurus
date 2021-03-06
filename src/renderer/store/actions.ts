import { createAction as cA } from '@reduxjs/toolkit'

import { App } from '../../config/types'

interface OpenAppArguments {
  url: string
  appId: App['id'] | undefined
  isAlt: boolean
  isShift: boolean
}

// -----------------------------------------------------------------------------
// App
// -----------------------------------------------------------------------------
const appStarted = cA('app/started')

// -----------------------------------------------------------------------------
// Tiles
// -----------------------------------------------------------------------------
const clickedTile = cA<OpenAppArguments>('tiles/clickTile')

// -----------------------------------------------------------------------------
// Keyboard
// -----------------------------------------------------------------------------
const keydown =
  cA<{
    isAlt: boolean
    isCmd: boolean
    isShift: boolean
    code: string
    key: string
    keyCode: number
  }>('keyboard/keydown')
const pressedEscapeKey = cA('keyboard/escapeKey')
const pressedBackspaceKey = cA('keyboard/backspaceKey')
const pressedCopyKey = cA<string>('keyboard/copyKey')
const pressedAppKey = cA<OpenAppArguments>('keyboard/appKey')

// -----------------------------------------------------------------------------
// Settings
// -----------------------------------------------------------------------------
const changedHotkey = cA<{ appId: string; value: string }>(
  'settings/changedHotkey',
)
const clickedCloseMenuButton = cA('settings/clickedCloseMenuButton')
const clickedEyeButton = cA<string>('settings/clickedEyeButton')
const clickedFavButton = cA<string>('settings/clickedFavButton')
const clickedQuitButton = cA('settings/clickedQuitButton')
const clickedReloadButton = cA('settings/clickedReloadButton')
const clickedSetAsDefaultBrowserButton = cA(
  'settings/clickedSetAsDefaultBrowserButton',
)
const clickedUpdateButton = cA('settings/clickedUpdateButton')
const clickedUpdateRestartButton = cA('settings/clickedUpdateRestartButton')
const clickedBWebsiteButton = cA('settings/clickedBWebsiteButton')

// -----------------------------------------------------------------------------
// URL bar
// -----------------------------------------------------------------------------
const clickedSettingsButton = cA('urlBar/clickedSettingsButton')
const clickedUrlBackspaceButton = cA('urlBar/clickedUrlBackspaceButton')
const clickedCopyButton = cA<string>('urlBar/clickedCopyButton')

// -----------------------------------------------------------------------------
// Support Message
// -----------------------------------------------------------------------------
const clickedDonate = cA('urlBar/clickedDonate')
const clickedMaybeLater = cA('urlBar/clickedMaybeLater')
const clickedAlreadyDonated = cA('urlBar/clickedAlreadyDonated')

export {
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
  clickedUrlBackspaceButton,
  keydown,
  pressedAppKey,
  pressedBackspaceKey,
  pressedCopyKey,
  pressedEscapeKey,
}
