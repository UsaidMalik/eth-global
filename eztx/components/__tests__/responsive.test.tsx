import { render, screen, fireEvent, act } from '@testing-library/react'
import { vi } from 'vitest'
import ResponsiveLayout, { useScreenSize, ResponsiveGrid, ResponsiveStack, ResponsiveNav } from '../responsive/ResponsiveLayout'
import TouchFriendly from '../responsive/TouchFriendly'

// Mock window.innerWidth and window.innerHeight
const mockWindowSize = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })
}

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
    button: ({ children, className, ...props }: any) => <button className={className} {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

describe('Responsive Components', () => {
  beforeEach(() => {
    // Reset to desktop size by default
    mockWindowSize(1024, 768)
  })

  describe('useScreenSize', () => {
    it('should detect mobile screen size', () => {
      mockWindowSize(375, 667) // iPhone size
      
      const TestComponent = () => {
        const { isMobile, isTablet, isDesktop } = useScreenSize()
        return (
          <div>
            <span data-testid="mobile">{isMobile.toString()}</span>
            <span data-testid="tablet">{isTablet.toString()}</span>
            <span data-testid="desktop">{isDesktop.toString()}</span>
          </div>
        )
      }

      render(<TestComponent />)
      
      expect(screen.getByTestId('mobile')).toHaveTextContent('true')
      expect(screen.getByTestId('tablet')).toHaveTextContent('false')
      expect(screen.getByTestId('desktop')).toHaveTextContent('false')
    })

    it('should detect tablet screen size', () => {
      mockWindowSize(768, 1024) // iPad size
      
      const TestComponent = () => {
        const { isMobile, isTablet, isDesktop } = useScreenSize()
        return (
          <div>
            <span data-testid="mobile">{isMobile.toString()}</span>
            <span data-testid="tablet">{isTablet.toString()}</span>
            <span data-testid="desktop">{isDesktop.toString()}</span>
          </div>
        )
      }

      render(<TestComponent />)
      
      expect(screen.getByTestId('mobile')).toHaveTextContent('false')
      expect(screen.getByTestId('tablet')).toHaveTextContent('true')
      expect(screen.getByTestId('desktop')).toHaveTextContent('false')
    })

    it('should detect desktop screen size', () => {
      mockWindowSize(1920, 1080) // Desktop size
      
      const TestComponent = () => {
        const { isMobile, isTablet, isDesktop } = useScreenSize()
        return (
          <div>
            <span data-testid="mobile">{isMobile.toString()}</span>
            <span data-testid="tablet">{isTablet.toString()}</span>
            <span data-testid="desktop">{isDesktop.toString()}</span>
          </div>
        )
      }

      render(<TestComponent />)
      
      expect(screen.getByTestId('mobile')).toHaveTextContent('false')
      expect(screen.getByTestId('tablet')).toHaveTextContent('false')
      expect(screen.getByTestId('desktop')).toHaveTextContent('true')
    })

    it('should update on window resize', () => {
      const TestComponent = () => {
        const { isMobile } = useScreenSize()
        return <span data-testid="mobile">{isMobile.toString()}</span>
      }

      render(<TestComponent />)
      
      // Initially desktop
      expect(screen.getByTestId('mobile')).toHaveTextContent('false')
      
      // Resize to mobile
      act(() => {
        mockWindowSize(375, 667)
        window.dispatchEvent(new Event('resize'))
      })
      
      expect(screen.getByTestId('mobile')).toHaveTextContent('true')
    })
  })

  describe('ResponsiveLayout', () => {
    it('renders children with responsive padding', () => {
      render(
        <ResponsiveLayout>
          <div>Test content</div>
        </ResponsiveLayout>
      )
      
      expect(screen.getByText('Test content')).toBeInTheDocument()
    })

    it('applies mobile-specific classes on mobile', () => {
      mockWindowSize(375, 667)
      
      const { container } = render(
        <ResponsiveLayout>
          <div>Mobile content</div>
        </ResponsiveLayout>
      )
      
      expect(container.firstChild).toHaveClass('px-4', 'py-4')
    })
  })

  describe('ResponsiveGrid', () => {
    it('renders children in a grid layout', () => {
      render(
        <ResponsiveGrid>
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </ResponsiveGrid>
      )
      
      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
      expect(screen.getByText('Item 3')).toBeInTheDocument()
    })

    it('applies correct grid classes', () => {
      const { container } = render(
        <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 3 }}>
          <div>Item</div>
        </ResponsiveGrid>
      )
      
      expect(container.firstChild).toHaveClass('grid')
    })
  })

  describe('ResponsiveStack', () => {
    it('renders children in a vertical stack', () => {
      render(
        <ResponsiveStack>
          <div>Item 1</div>
          <div>Item 2</div>
        </ResponsiveStack>
      )
      
      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
    })

    it('applies flex column layout', () => {
      const { container } = render(
        <ResponsiveStack>
          <div>Item</div>
        </ResponsiveStack>
      )
      
      expect(container.firstChild).toHaveClass('flex', 'flex-col')
    })
  })

  describe('ResponsiveNav', () => {
    const navItems = [
      { label: 'Home', value: 'home', icon: <span>🏠</span> },
      { label: 'Profile', value: 'profile', icon: <span>👤</span> }
    ]

    it('renders navigation items', () => {
      const handleChange = vi.fn()
      
      render(
        <ResponsiveNav
          items={navItems}
          activeItem="home"
          onItemChange={handleChange}
        />
      )
      
      expect(screen.getByText('Home')).toBeInTheDocument()
      expect(screen.getByText('Profile')).toBeInTheDocument()
    })

    it('calls onItemChange when item is clicked', () => {
      const handleChange = vi.fn()
      
      render(
        <ResponsiveNav
          items={navItems}
          activeItem="home"
          onItemChange={handleChange}
        />
      )
      
      fireEvent.click(screen.getByText('Profile'))
      expect(handleChange).toHaveBeenCalledWith('profile')
    })

    it('shows active state correctly', () => {
      const handleChange = vi.fn()
      
      render(
        <ResponsiveNav
          items={navItems}
          activeItem="home"
          onItemChange={handleChange}
        />
      )
      
      const homeButton = screen.getByText('Home').closest('button')
      expect(homeButton).toHaveClass('text-primary-600')
    })

    it('renders as bottom tab bar on mobile', () => {
      mockWindowSize(375, 667)
      const handleChange = vi.fn()
      
      const { container } = render(
        <ResponsiveNav
          items={navItems}
          activeItem="home"
          onItemChange={handleChange}
        />
      )
      
      expect(container.firstChild).toHaveClass('fixed', 'bottom-0')
    })
  })

  describe('TouchFriendly', () => {
    it('renders children', () => {
      render(
        <TouchFriendly>
          <div>Touch content</div>
        </TouchFriendly>
      )
      
      expect(screen.getByText('Touch content')).toBeInTheDocument()
    })

    it('calls onTap when clicked', () => {
      const handleTap = vi.fn()
      
      render(
        <TouchFriendly onTap={handleTap}>
          <div>Tap me</div>
        </TouchFriendly>
      )
      
      fireEvent.click(screen.getByText('Tap me'))
      expect(handleTap).toHaveBeenCalledTimes(1)
    })

    it('does not call handlers when disabled', () => {
      const handleTap = vi.fn()
      
      render(
        <TouchFriendly onTap={handleTap} disabled>
          <div>Disabled</div>
        </TouchFriendly>
      )
      
      fireEvent.click(screen.getByText('Disabled'))
      expect(handleTap).not.toHaveBeenCalled()
    })

    it('handles touch events for swipe detection', () => {
      const handleSwipeLeft = vi.fn()
      const handleSwipeRight = vi.fn()
      
      render(
        <TouchFriendly onSwipeLeft={handleSwipeLeft} onSwipeRight={handleSwipeRight}>
          <div>Swipe me</div>
        </TouchFriendly>
      )
      
      const element = screen.getByText('Swipe me')
      
      // Simulate swipe left
      fireEvent.touchStart(element, {
        targetTouches: [{ clientX: 100, clientY: 100 }]
      })
      fireEvent.touchMove(element, {
        targetTouches: [{ clientX: 40, clientY: 100 }]
      })
      fireEvent.touchEnd(element)
      
      expect(handleSwipeLeft).toHaveBeenCalledTimes(1)
    })
  })
})

describe('Responsive Behavior', () => {
  it('should adapt layout based on screen size changes', () => {
    const TestComponent = () => {
      const { isMobile } = useScreenSize()
      return (
        <div data-testid="layout">
          {isMobile ? 'Mobile Layout' : 'Desktop Layout'}
        </div>
      )
    }

    render(<TestComponent />)
    
    // Initially desktop
    expect(screen.getByTestId('layout')).toHaveTextContent('Desktop Layout')
    
    // Change to mobile
    act(() => {
      mockWindowSize(375, 667)
      window.dispatchEvent(new Event('resize'))
    })
    
    expect(screen.getByTestId('layout')).toHaveTextContent('Mobile Layout')
  })

  it('should handle orientation changes', () => {
    const TestComponent = () => {
      const { width, height } = useScreenSize()
      return (
        <div>
          <span data-testid="width">{width}</span>
          <span data-testid="height">{height}</span>
        </div>
      )
    }

    render(<TestComponent />)
    
    // Portrait
    act(() => {
      mockWindowSize(375, 667)
      window.dispatchEvent(new Event('resize'))
    })
    
    expect(screen.getByTestId('width')).toHaveTextContent('375')
    expect(screen.getByTestId('height')).toHaveTextContent('667')
    
    // Landscape
    act(() => {
      mockWindowSize(667, 375)
      window.dispatchEvent(new Event('resize'))
    })
    
    expect(screen.getByTestId('width')).toHaveTextContent('667')
    expect(screen.getByTestId('height')).toHaveTextContent('375')
  })
})