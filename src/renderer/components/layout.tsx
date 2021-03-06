import clsx from 'clsx'
import React, { useEffect } from 'react'
import { useDispatch } from 'react-redux'

import { useSelector } from '../store'
import { appStarted } from '../store/actions'
import { useKeyboardEvents } from './hooks/use-keyboard-events'
import SupportMessage from './organisms/support-message'
import Tiles from './organisms/tiles'
import UrlBar from './organisms/url-bar'

const useAppStarted = () => {
  const dispatch = useDispatch()
  useEffect(() => {
    dispatch(appStarted())
  }, [dispatch])
}

const App: React.FC = () => {
  /**
   * Tell main that renderer is available
   */
  useAppStarted()

  /**
   * Setup keyboard listeners
   */
  useKeyboardEvents()

  /**
   * System theme
   */
  const isDarkMode = useSelector((state) => state.theme.isDarkMode)

  return (
    <div
      className={clsx(
        'h-screen w-screen select-none flex flex-col items-center relative',
        isDarkMode && 'text-white',
      )}
    >
      <Tiles />
      <UrlBar />
      <SupportMessage />
    </div>
  )
}

export default App
