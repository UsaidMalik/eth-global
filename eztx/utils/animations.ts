import { Variants } from 'framer-motion'

// Common animation variants
export const fadeInUp: Variants = {
  initial: {
    opacity: 0,
    y: 20
  },
  animate: {
    opacity: 1,
    y: 0
  },
  exit: {
    opacity: 0,
    y: -20
  }
}

export const fadeInDown: Variants = {
  initial: {
    opacity: 0,
    y: -20
  },
  animate: {
    opacity: 1,
    y: 0
  },
  exit: {
    opacity: 0,
    y: 20
  }
}

export const fadeInLeft: Variants = {
  initial: {
    opacity: 0,
    x: -20
  },
  animate: {
    opacity: 1,
    x: 0
  },
  exit: {
    opacity: 0,
    x: 20
  }
}

export const fadeInRight: Variants = {
  initial: {
    opacity: 0,
    x: 20
  },
  animate: {
    opacity: 1,
    x: 0
  },
  exit: {
    opacity: 0,
    x: -20
  }
}

export const scaleIn: Variants = {
  initial: {
    opacity: 0,
    scale: 0.8
  },
  animate: {
    opacity: 1,
    scale: 1
  },
  exit: {
    opacity: 0,
    scale: 0.8
  }
}

export const slideInFromBottom: Variants = {
  initial: {
    opacity: 0,
    y: '100%'
  },
  animate: {
    opacity: 1,
    y: 0
  },
  exit: {
    opacity: 0,
    y: '100%'
  }
}

export const slideInFromTop: Variants = {
  initial: {
    opacity: 0,
    y: '-100%'
  },
  animate: {
    opacity: 1,
    y: 0
  },
  exit: {
    opacity: 0,
    y: '-100%'
  }
}

// Stagger animation for lists
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

export const staggerItem: Variants = {
  initial: {
    opacity: 0,
    y: 20
  },
  animate: {
    opacity: 1,
    y: 0
  }
}

// Button hover animations
export const buttonHover = {
  scale: 1.02,
  y: -2,
  transition: {
    type: 'spring',
    stiffness: 400,
    damping: 17
  }
}

export const buttonTap = {
  scale: 0.98,
  transition: {
    type: 'spring',
    stiffness: 400,
    damping: 17
  }
}

// Card hover animations
export const cardHover = {
  y: -4,
  boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.15), 0 2px 10px -2px rgba(0, 0, 0, 0.04)',
  transition: {
    type: 'spring',
    stiffness: 300,
    damping: 30
  }
}

// Modal animations
export const modalBackdrop: Variants = {
  initial: {
    opacity: 0
  },
  animate: {
    opacity: 1
  },
  exit: {
    opacity: 0
  }
}

export const modalContent: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    y: 20
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20
  }
}

// Loading animations
export const pulseAnimation = {
  scale: [1, 1.05, 1],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: 'easeInOut'
  }
}

export const spinAnimation = {
  rotate: 360,
  transition: {
    duration: 1,
    repeat: Infinity,
    ease: 'linear'
  }
}

// Form field animations
export const fieldFocus = {
  scale: 1.01,
  transition: {
    type: 'spring',
    stiffness: 300,
    damping: 30
  }
}

export const errorShake = {
  x: [-10, 10, -10, 10, 0],
  transition: {
    duration: 0.4
  }
}

// Success animations
export const successBounce = {
  scale: [1, 1.2, 1],
  transition: {
    duration: 0.6,
    ease: 'easeInOut'
  }
}

// Page transition variants
export const pageTransition: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 1.02
  }
}

// Common transition configurations
export const springTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30
}

export const easeTransition = {
  type: 'tween' as const,
  ease: 'easeInOut',
  duration: 0.3
}

export const bounceTransition = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 17
}

// Utility functions for animations
export const getStaggerDelay = (index: number, baseDelay = 0.1) => {
  return index * baseDelay
}

export const createStaggerVariants = (staggerDelay = 0.1): Variants => ({
  initial: {},
  animate: {
    transition: {
      staggerChildren: staggerDelay
    }
  }
})

export const createFadeInVariant = (direction: 'up' | 'down' | 'left' | 'right' = 'up', distance = 20): Variants => {
  const getInitialPosition = () => {
    switch (direction) {
      case 'up': return { y: distance }
      case 'down': return { y: -distance }
      case 'left': return { x: distance }
      case 'right': return { x: -distance }
    }
  }

  return {
    initial: {
      opacity: 0,
      ...getInitialPosition()
    },
    animate: {
      opacity: 1,
      x: 0,
      y: 0
    },
    exit: {
      opacity: 0,
      ...getInitialPosition()
    }
  }
}

// Animation presets for common use cases
export const animationPresets = {
  // Quick and snappy
  quick: {
    duration: 0.2,
    ease: 'easeOut'
  },
  
  // Standard timing
  standard: {
    duration: 0.3,
    ease: 'easeInOut'
  },
  
  // Smooth and elegant
  smooth: {
    duration: 0.5,
    ease: [0.4, 0, 0.2, 1]
  },
  
  // Bouncy and playful
  bouncy: {
    type: 'spring',
    stiffness: 400,
    damping: 17
  },
  
  // Gentle spring
  gentle: {
    type: 'spring',
    stiffness: 300,
    damping: 30
  }
} as const