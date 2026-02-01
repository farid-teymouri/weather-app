# Contributing to WeatherFlow

Thank you for your interest in contributing to WeatherFlow! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## 🤝 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## 🎯 How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates.

**Guidelines for bug reports:**

1. Use a clear and descriptive title
2. Describe the exact steps to reproduce the problem
3. Provide specific examples and error messages
4. Include screenshots if applicable
5. Mention your browser, OS, and device information
6. Describe the behavior you observed and the behavior you expected

### Suggesting Features

Feature requests are welcome! Please follow these guidelines:

1. Use a clear and descriptive title
2. Provide a detailed description of the feature
3. Explain why this feature would be useful
4. Include examples or mockups if applicable
5. Describe alternatives you've considered

### Pull Requests

We welcome pull requests! Here's how to contribute code:

## 🔧 Development Workflow

### 1. Fork the Repository

Click the "Fork" button on the GitHub repository page.

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/weather-app.git
cd weather-app
```

### 3. Set Up the Project

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Create a Branch

```bash
git checkout -b feat/amazing-feature
# or
git checkout -b fix/specific-bug
# or
git checkout -b docs/documentation-update
```

### 5. Make Your Changes

- Follow the Coding Standards
- Write clear, self-documenting code
- Add comments where necessary
- Update documentation if needed

### 6. Test Your Changes

```bash
# Format code
npm run format

# Run linter
npm run lint

# Build the project
npm run build

# Test in browser
npm run preview
```

### 7. Commit Your Changes

Follow the <a href="https://www.conventionalcommits.org" target="_blank"> Conventional Commits </a> specification:

```bash
feat: add new weather animation
fix: resolve geolocation permission issue
docs: update README with new screenshots
style: format CSS files
refactor: improve weather service architecture
test: add unit tests for validators
chore: update dependencies
```

Example:

```bash
git add .
git commit -m "feat: add keyboard shortcuts for favorites"
```

### 8. Push to Your Fork

```bash
git push origin feat/amazing-feature
```

### 9. Create a Pull Request

    1. Go to the original repository on GitHub
    2. Click "Compare & pull request"
    3. Fill out the PR template
    4. Submit your pull request

## 💻 Coding Standards

### JavaScript

- Use ES6+ features
- Follow the ESLint configuration (`.eslintrc.js`)
- Use 4 spaces for indentation
- Use single quotes for strings
- Use semicolons
- Prefer `const` over `let`, avoid `var`
- Use arrow functions for callbacks
- Add JSDoc comments for public functions and classes

**Example**:

```bash
.weather-card {
    padding: var(--spacing-lg);
    background-color: var(--color-background);
    border-radius: var(--border-radius-lg);
}

.weather-card__title {
    font-size: var(--font-size-xl);
    color: var(--color-text);
}
```

### HTML

- Use semantic HTML5 elements
- Add proper ARIA attributes for accessibility
- Ensure proper nesting and indentation
- Use descriptive class names
- Include alt text for images
  **Example**:

```html
<article class="weather-card" aria-labelledby="weather-title">
    <h2 id="weather-title" class="weather-card__title">Current Weather</h2>
    <div class="weather-card__content">
        <!-- Content here -->
    </div>
</article>
```

### Git Commit Messages

**Follow these guidelines**:

1. Use the present tense ("Add feature" not "Added feature")
2. Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
3. Limit the first line to 72 characters or less
4. Reference issues and pull requests liberally
5. Consider starting the commit message with a tag:

- `feat`: - New feature
- `fix`: - Bug fix
- `docs`: - Documentation changes
- `style`: - Code style changes (formatting, etc.)
- `refactor`: - Code refactoring
- `test`: - Adding or updating tests
- `chore`: - Maintenance tasks

## 📝 Pull Request Process

1. Update Documentation: Ensure README.md and relevant documentation is updated
2. Add Tests: Include tests for new functionality
3. Check Accessibility: Verify WCAG 2.1 AA compliance
4. Test Across Browsers: Test in Chrome, Firefox, Safari, and Edge
5. Performance Check: Ensure no performance regressions
6. Security Review: Verify no security vulnerabilities introduced
7. Code Review: Be prepared to make changes based on feedback

## 🐛 Reporting Bugs

1. When reporting bugs, please include:
2. Clear Title: Summarize the issue
3. Steps to Reproduce: Detailed steps to recreate the bug
4. Expected Behavior: What should happen
5. Actual Behavior: What actually happens
6. Screenshots: Visual evidence if applicable
7. Environment: Browser, OS, device information
8. Console Errors: Any error messages from browser console

## 💡 Suggesting Features

### When suggesting features:

1. Clear Title: Describe the feature
2. Detailed Description: Explain what it does
3. Use Cases: Why is this useful?
4. Examples: Mockups or examples
5. Alternatives: Other approaches considered

## 🎨 Design Guidelines

### Accessibility

- Maintain WCAG 2.1 AA compliance
- Ensure keyboard navigation works
- Add proper ARIA labels
- Test with screen readers
- Support high contrast mode

### Performance

- Optimize images and assets
- Minimize bundle size
- Implement lazy loading
- Use efficient algorithms
- Avoid unnecessary re-renders

### Security

- Never expose API keys
- Sanitize all user inputs
- Validate all data
- Use HTTPS
- Implement CSP headers

## 📚 Resources

- <a href="https://openweathermap.org" target="_blank"> OpenWeatherMap API Docs</a>
- <a href="https://www.w3.org/WAI/WCAG21/quickref" target="_blank">WCAG 2.1 Guidelines</a>
- <a href="https://web.dev/pwa-checklist" target="_blank">PWA Checklist</a>
- <a href="https://google.github.io/styleguide/jsguide.html" target="_blank">JavaScript Style Guide</a>
- <a href="https://css-tricks.com/css-architecture-and-design-systems" target="_blank">CSS Architecture</a>

## 🙏 Thank You!

Your contributions are greatly appreciated! Every contribution helps make WeatherFlow better for everyone. <br>
If you have any questions, feel free to open an issue or contact the maintainers.<br>
Happy coding! 🚀
