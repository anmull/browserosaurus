import clsx from 'clsx'
import React from 'react'

interface Props {
  className?: string
  style?: React.CSSProperties
}

const Kbd: React.FC<Props> = ({ children, className, style }) => {
  return (
    <kbd
      className={clsx(
        className,
        'tracking-widest uppercase rounded text-center',
      )}
      style={style}
    >
      {children}
    </kbd>
  )
}

export default Kbd
