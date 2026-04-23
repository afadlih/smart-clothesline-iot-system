# Development Guide

This guide helps you set up and contribute to the Smart Clothesline IoT System project.

## Getting Started

### Prerequisites
- Node.js 18+ ([Download](https://nodejs.org/))
- npm 9+ (comes with Node.js)
- Git
- A code editor (VS Code recommended)

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd smart-clothesline-iot-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment (optional)**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Firebase credentials if desired
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   - Navigate to http://localhost:3000
   - Changes auto-reload on file save

## Project Structure

```
smart-clothesline-iot-system/
├── src/
│   ├── app/                      # Next.js pages and layouts
│   ├── components/               # Reusable React components
│   ├── features/                 # Feature-specific logic
│   ├── hooks/                    # Custom React hooks
│   ├── models/                   # Data models and types
│   ├── services/                 # Business logic and APIs
│   ├── utils/                    # Helper functions
│   └── styles/                   # Global CSS
├── public/                       # Static assets
├── .github/workflows/            # CI/CD pipelines
├── .env.example                  # Environment template
├── README.md                     # Project documentation
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── tailwind.config.js            # Tailwind CSS config
└── next.config.js                # Next.js config
```

## Architecture Layers

### 1. Models (`src/models/`)
Define data structures and types:
```typescript
// src/models/SensorData.ts
export class SensorData {
  temperature: number
  humidity: number
  light: number
  rain: boolean
  
  isRaining(): boolean { }
  isDark(): boolean { }
}
```

### 2. Services (`src/services/`)
Implement business logic:
```typescript
// src/services/MyService.ts
export class MyService {
  static calculateSomething(data: SensorData): number {
    // Business logic here
  }
}
```

### 3. Hooks (`src/hooks/`)
Connect services to components:
```typescript
// src/hooks/useMyFeature.ts
export function useMyFeature() {
  const [state, setState] = useState()
  
  useEffect(() => {
    const result = MyService.calculateSomething(data)
    setState(result)
  }, [data])
  
  return state
}
```

### 4. Components (`src/components/`)
Build UI with hooks:
```typescript
// src/components/MyComponent.tsx
export default function MyComponent() {
  const state = useMyFeature()
  
  return <div>{state}</div>
}
```

### 5. Pages (`src/app/`)
Assemble pages with components:
```typescript
// src/app/mypage/page.tsx
import MyComponent from '@/components/MyComponent'

export default function MyPage() {
  return (
    <div>
      <h1>My Page</h1>
      <MyComponent />
    </div>
  )
}
```

## Development Workflow

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes**
   - Follow the architecture layers above
   - Keep components small and focused
   - Use TypeScript strict mode
   - Write meaningful commit messages

3. **Test your changes**
   ```bash
   npm run build     # Test production build
   npm run lint      # Check code style
   ```

4. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: add my feature"
   git push origin feature/my-feature
   ```

5. **Open a Pull Request**
   - Describe what you changed
   - Why you made the change
   - How to test it

### Code Style

#### Naming Conventions
- **Files**: kebab-case (my-component.tsx)
- **Classes**: PascalCase (MyService)
- **Functions**: camelCase (myFunction)
- **Constants**: UPPER_SNAKE_CASE (MY_CONSTANT)
- **Types**: PascalCase (MyType)

#### TypeScript Best Practices
```typescript
// ✅ Good: Explicit types
function calculateDryingTime(
  humidity: number,
  temperature: number
): number {
  return humidity * temperature
}

// ❌ Avoid: Implicit 'any'
function calculateDryingTime(humidity, temperature) {
  return humidity * temperature
}
```

#### React Best Practices
```typescript
// ✅ Good: Functional component with hooks
export default function MyComponent() {
  const [count, setCount] = useState(0)
  
  return <button onClick={() => setCount(count + 1)}>
    Count: {count}
  </button>
}

// ❌ Avoid: Class components
class MyComponent extends React.Component {
  state = { count: 0 }
  // ...
}
```

#### CSS with Tailwind
```typescript
// ✅ Good: Utility classes
<div className="p-4 bg-white rounded-lg shadow-sm">
  <h1 className="text-lg font-bold text-gray-900">Title</h1>
  <p className="text-sm text-gray-600 mt-2">Description</p>
</div>

// ❌ Avoid: Inline styles
<div style={{ padding: '16px', backgroundColor: 'white' }}>
```

## Testing

### Manual Testing

1. **Check responsive design**
   - Desktop: Right-click → Inspect → Toggle Device Toolbar
   - Test at: 320px, 768px, 1024px, 1440px widths

2. **Test dark mode**
   - System Preferences → Appearance → Dark Mode
   - Check all pages render correctly

3. **Test error states**
   - Block network in DevTools
   - Force errors in console
   - Verify error messages display

4. **Test loading states**
   - Slow down network (DevTools → Network → Slow 3G)
   - Verify skeleton loaders appear

### Automated Testing (Future)

```bash
npm run test        # Run tests
npm run test:watch  # Watch mode
npm run test:coverage # Coverage report
```

## Performance Guidelines

### Bundle Size
- Keep individual page sizes < 10 kB (excluding Recharts)
- Use dynamic imports for large features
- Remove unused dependencies

### Runtime Performance
- Memoize expensive calculations
- Use proper useEffect dependencies
- Avoid re-renders with useMemo/useCallback

### Network Performance
- Minimize MQTT message frequency
- Batch API calls where possible
- Cache analytics calculations

## Common Tasks

### Adding a New Page

1. Create directory: `src/app/mypage/`
2. Create file: `src/app/mypage/page.tsx`
3. Implement component:
   ```typescript
   export default function MyPage() {
     return <div>My Page</div>
   }
   ```
4. Page is automatically routed to `/mypage`

### Adding a New Hook

1. Create file: `src/hooks/useMyHook.ts`
2. Implement hook:
   ```typescript
   export function useMyHook() {
     const [state, setState] = useState()
     useEffect(() => { }, [])
     return state
   }
   ```
3. Import and use in components

### Adding a New Service

1. Create file: `src/services/MyService.ts`
2. Implement class:
   ```typescript
   export class MyService {
     static myMethod(data: SensorData): Result {
       // Implementation
     }
   }
   ```
3. Use in hooks and components

### Styling with Tailwind

**Responsive prefixes:**
```typescript
// Mobile first approach
className="
  w-full              // mobile
  md:w-1/2            // tablet
  lg:w-1/3            // desktop
"
```

**Dark mode:**
```typescript
className="
  bg-white
  dark:bg-slate-900
  text-gray-900
  dark:text-slate-100
"
```

**Hover/Active states:**
```typescript
className="
  bg-blue-600
  hover:bg-blue-700
  active:bg-blue-800
  disabled:opacity-50
  disabled:cursor-not-allowed
"
```

## Debugging

### Browser DevTools
1. **React DevTools**: React component tree inspection
2. **Redux DevTools**: State management debugging (if added)
3. **Network Tab**: API/MQTT monitoring
4. **Console**: Error and warning messages

### VS Code Debugging
1. Install "Debugger for Chrome" extension
2. Add to `.vscode/launch.json`:
   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "name": "Next.js",
         "type": "chrome",
         "request": "launch",
         "url": "http://localhost:3000",
         "webRoot": "${workspaceFolder}"
       }
     ]
   }
   ```
3. Press F5 to start debugging

### Logging
```typescript
// Console logging
console.log('Message:', value)
console.warn('Warning:', value)
console.error('Error:', value)

// Service logging
console.info('[Service] Action completed')
console.warn('[Service] Warning message')
console.error('[Service] Error occurred', error)
```

## Troubleshooting

### "Module not found" errors
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

### Type errors in IDE
```bash
# Regenerate type definitions
npm run build
```

### MQTT connection issues
1. Check HiveMQ broker status: https://www.hivemq.com
2. Verify topic name matches
3. Check browser console for WebSocket errors

### Styles not applying
1. Verify Tailwind classes are used (not custom CSS)
2. Check `tailwind.config.js` includes correct paths
3. Restart dev server after config changes

## Performance Profiling

### Build Analysis
```bash
npm run build         # Generate production build
# Check .next/static/chunks/ for bundle sizes
```

### Runtime Performance
1. Open DevTools → Performance tab
2. Click record button
3. Perform action to test
4. Stop recording
5. Analyze flame chart for bottlenecks

## Dependencies

### Core Dependencies
- **next**: Framework
- **react**: UI library
- **typescript**: Type safety
- **tailwindcss**: Styling
- **recharts**: Charts

### Optional Dependencies
- **firebase**: Cloud database
- **mqtt**: Message broker client

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com)
- [MQTT Docs](https://mqtt.org/)

## Need Help?

- Check existing issues on GitHub
- Review code comments and commit messages
- Ask in team chat or discussions
- Create a detailed issue with steps to reproduce

---

Happy coding! 🚀
