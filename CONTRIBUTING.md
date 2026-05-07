# Contributing to Smart Clothesline IoT System

First off, thank you for considering contributing to Smart Clothesline IoT System! It's people like you that make this project such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* **Use a clear and descriptive title**
* **Describe the exact steps which reproduce the problem**
* **Provide specific examples to demonstrate those steps**
* **Describe the behavior you observed after following the steps**
* **Explain which behavior you expected to see instead and why**
* **Include screenshots and animated GIFs if possible**
* **Include your environment (OS, Node version, etc.)**

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* **Use a clear and descriptive title**
* **Provide a step-by-step description of the suggested enhancement**
* **Provide specific examples to demonstrate the steps**
* **Describe the current behavior and expected behavior**
* **Explain why this enhancement would be useful**

### Pull Requests

* Fill in the required PR template
* Follow the styleguides
* End all files with a newline
* Limit commit messages to 50 characters for the first line

## Styleguides

### Git Commit Messages

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line

Format:
```
type: subject

body (optional)
footer (optional)
```

Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that don't affect code meaning
- `refactor`: Code change that neither fixes a bug nor adds feature
- `perf`: Code change that improves performance
- `test`: Adding or updating tests
- `chore`: Changes to build process or dependencies

Example:
```
feat: add drying time predictor

Add a new service to estimate how long clothes will take to dry
based on temperature and humidity. Includes calculations for
historical data patterns.

Closes #123
```

### JavaScript/TypeScript Styleguide

* Use semicolons
* Use 2 spaces for indentation
* Use const/let, not var
* Use arrow functions for callbacks
* Use async/await over .then()
* Add JSDoc comments for exported functions

```typescript
/**
 * Calculate drying time based on current conditions
 * @param humidity - Current humidity percentage
 * @param temperature - Current temperature in Celsius
 * @returns Estimated drying time in minutes
 */
export function estimateDryingTime(
  humidity: number,
  temperature: number
): number {
  // Implementation
}
```

### CSS/Tailwind Styleguide

* Use Tailwind utility classes
* Avoid custom CSS when possible
* Use responsive prefixes (sm:, md:, lg:, xl:)
* Follow mobile-first approach
* Support dark mode with dark: prefix

```typescript
// Good
className="
  w-full
  md:w-1/2
  lg:w-1/3
  p-4
  bg-white
  dark:bg-slate-900
  rounded-lg
  shadow-sm
  hover:shadow-md
  transition-shadow
"

// Avoid
style={{
  width: '100%',
  padding: '16px',
  backgroundColor: 'white'
}}
```

### React Styleguide

* Use functional components with hooks
* Place useEffect at the top of component
* Memoize expensive operations
* Use proper TypeScript types
* Write meaningful prop names

```typescript
interface MyComponentProps {
  title: string
  onComplete?: (result: Result) => void
  disabled?: boolean
}

export default function MyComponent({
  title,
  onComplete,
  disabled = false
}: MyComponentProps) {
  const [data, setData] = useState<Data | null>(null)

  useEffect(() => {
    // Effect code
  }, [])

  const handleClick = () => {
    onComplete?.(result)
  }

  return (
    <div>
      <h1>{title}</h1>
      <button onClick={handleClick} disabled={disabled}>
        Complete
      </button>
    </div>
  )
}
```

## Development Process

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourusername/smart-clothesline-iot-system.git
   cd smart-clothesline-iot-system
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

3. **Make your changes**
   - Keep commits small and focused
   - Write clear commit messages
   - Update documentation as needed

4. **Test your changes**
   ```bash
   npm run lint      # Check code style
   npm run build     # Test production build
   npm run test      # Run tests (if available)
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/my-feature
   ```

6. **Create a Pull Request**
   - Provide a clear description
   - Link related issues
   - Include before/after screenshots if UI changes

## Testing

### Running Tests
```bash
npm run test          # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Manual Testing Checklist

- [ ] Feature works on desktop (1440px+)
- [ ] Feature works on tablet (768px)
- [ ] Feature works on mobile (320px)
- [ ] Feature works in light mode
- [ ] Feature works in dark mode
- [ ] No console errors or warnings
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Mobile touch targets are at least 44x44px
- [ ] Performance impact is acceptable

## Performance Considerations

When contributing, please be mindful of:

* **Bundle size**: Keep additions small
* **Runtime performance**: Avoid unnecessary re-renders
* **Network efficiency**: Batch API calls where possible
* **Memory usage**: Clean up listeners and timers
* **Accessibility**: Support screen readers and keyboard navigation

## Additional Notes

### Project Goals

This project aims to:
- Demonstrate clean architecture in frontend development
- Show practical IoT system design
- Provide a reusable base for smart home projects
- Maintain high code quality and documentation

### What We're Looking For

* Bug reports and fixes
* Performance improvements
* Documentation improvements
* Feature implementations
* Test coverage
* Accessibility improvements
* Internationalization support

### What We're Not Looking For

* Massive refactors without clear benefit
* Changes that break backward compatibility
* Dependencies that significantly increase bundle size
* Features outside IoT/home automation scope

## Questions?

* Check the [FAQ section](README.md#-support--contact)
* Review existing [issues](https://github.com/yourrepo/issues)
* Ask in discussions or project chat
* Read the [Development Guide](DEVELOPMENT.md)

---

Thank you for contributing to make Smart Clothesline IoT System better! 🚀
