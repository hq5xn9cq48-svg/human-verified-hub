# Copilot Instructions for Human-Verified Hub

## Quick Start

To get started with this project:

1. **Clone the repository** and navigate to the project directory
2. **Install dependencies:** `npm install`
3. **Set up environment variables:** Create `.env.local` with required keys (see Environment Variables section)
4. **Run development server:** `npm run dev`
5. **Open browser:** Navigate to `http://localhost:3000`

For detailed setup and configuration, see the sections below.

## Project Overview

Human-Verified Hub is a professional AI-powered tool for detecting AI-generated content and checking for plagiarism. The application provides forensic linguistic analysis to verify if text is human-written, with the ability to generate certified PDF reports and certificates.

**Primary Features:**
- AI text detection and analysis using Google Gemini API
- Web scraping for URL-based content analysis
- Multi-language support (English and Arabic with RTL support)
- User authentication and verification history via Supabase
- PDF certificate generation for verified human content (90%+ scores)
- Image-based text detection
- Text humanization capabilities

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript with strict mode enabled
- **Styling:** Tailwind CSS with custom design system
- **UI/Animations:** Framer Motion for animations
- **Backend Services:**
  - Supabase for authentication and database
  - Google Gemini API for AI analysis
  - Cloudflare Turnstile for bot protection
- **PDF Generation:** jsPDF with QRCode support
- **Web Scraping:** Cheerio for HTML parsing
- **Icons:** Lucide React

## Project Structure

```
/src
  /app                  # Next.js App Router pages
    /api               # API routes
      /analyze         # Text analysis endpoint
      /certificate     # Certificate generation
      /humanize        # Text humanization
      /image-analyze   # Image text detection
      /scrape          # URL scraping
    /auth              # Authentication pages
    /dashboard         # User dashboard
    /history           # Verification history
    /humanizer         # Text humanization UI
    /image-detector    # Image detection UI
    /verify            # Certificate verification
    layout.tsx         # Root layout with providers
    page.tsx           # Homepage with analyzer
  /components          # Reusable React components
  /contexts            # React Context providers (Language, Auth)
  /i18n                # Internationalization (translations)
  /lib                 # Utility libraries
    /supabase          # Supabase client/server/middleware
    gemini.ts          # Gemini AI integration
  /types               # TypeScript type definitions
```

## Code Conventions and Patterns

### TypeScript
- Use TypeScript for all new files
- Enable strict mode (configured in tsconfig.json)
- Define interfaces for component props and API responses
- Use type inference where possible, explicit types for public APIs

### React Components
- **Client Components:** Use `'use client'` directive for components that use hooks, browser APIs, or event handlers
- **Server Components:** Default for app directory - no `'use client'` directive
- Use functional components with hooks
- Destructure props in component parameters
- Use TypeScript interfaces for prop types

### Styling
- Use Tailwind CSS utility classes
- Follow the custom color system defined in `tailwind.config.js`:
  - Primary: purple shades (`purple-500`, `purple-600`, etc.)
  - Accents: green for success, red for errors, yellow for warnings
  - Dark theme colors: `dark-950`, `dark-900`, etc.
- Custom classes available:
  - `glass-card`: Glassmorphic card effect
  - `cyber-grid`: Cyberpunk-style grid background
  - `neon-text-glow`: Glowing text effect
  - `text-gradient`: Purple-green gradient text

### Animations
- Use Framer Motion for complex animations
- Available custom Tailwind animations: `animate-glow`, `animate-float`, `animate-pulse-slow`, `animate-scan`, etc.
- Use `AnimatePresence` for enter/exit animations

### API Routes
- Use Next.js App Router API route handlers (`route.ts`)
- Return `NextResponse` objects
- Include proper error handling with try-catch blocks
- Use environment variables for API keys:
  - `GEMINI_API_KEY` or `NEXT_PUBLIC_GEMINI_API_KEY`
  - `TURNSTILE_SECRET`
  - Supabase keys (see Supabase client configuration)

### State Management
- Use React Context for global state (Language, Auth)
- Use `useState` for local component state
- Custom hooks pattern: `useLanguage()`, `useAuth()`

### Internationalization
- Support English (`en`) and Arabic (`ar`)
- Use the `useLanguage()` hook for translations
- Access translations via `t` object from context
- Handle RTL layout with `isRTL` flag
- Use `dir={isRTL ? 'rtl' : 'ltr'}` on containers
- Use `dir="auto"` for user input fields to auto-detect text direction

### Supabase Integration
- Client components: Use `createClient()` from `@/lib/supabase/client`
- Server components: Use `createClient()` from `@/lib/supabase/server`
- Middleware: Use client from `@/lib/supabase/middleware`
- Never expose service role keys in client-side code

## Code Quality Standards

### Code Review Guidelines
- **Readability:** Code should be self-documenting with clear variable/function names
- **Consistency:** Follow existing patterns and conventions in the codebase
- **Type Safety:** Use TypeScript types and interfaces, avoid `any` unless absolutely necessary
- **Error Handling:** Always include proper error handling with try-catch blocks
- **Performance:** Optimize for performance, especially in animations and API calls
- **Security:** Validate user input, sanitize data, use environment variables for secrets

### Before Committing
1. Review your changes with `git diff`
2. Test the functionality manually
3. Check for console errors and warnings
4. Verify TypeScript compilation succeeds
5. Ensure no sensitive data is committed
6. Update related documentation if needed

## Build and Development

### Commands
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code (requires ESLint setup)
npm run lint
```

### Package Management
- Use `npm` for package management (lock file is `package-lock.json`)
- When adding new dependencies:
  - Prefer stable, well-maintained packages
  - Check for security vulnerabilities before adding
  - Use `--save` for runtime dependencies, `--save-dev` for development dependencies
  - Update documentation if adding new tools or libraries

### Development Server
- Development server runs on `http://localhost:3000` by default
- Hot reload is enabled - changes will reflect automatically
- API routes are available at `/api/*` endpoints
- Check console for errors and warnings during development

### Environment Variables Required
Create a `.env.local` file with:
```
# Gemini AI
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key

# Supabase (use anonymous/public key - safe for client-side)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key
TURNSTILE_SECRET=your_turnstile_secret
```

**Note:** The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the anonymous/public key that is safe to expose on the client-side. Never use the service role key in client-side code.

## Security Considerations

### Critical Security Rules
1. **Never commit API keys or secrets** to the repository
   - Always use environment variables
   - Add sensitive files to `.gitignore`
   - Use `.env.local` for local development (not tracked in git)
2. **Use environment variables** for all sensitive configuration
   - Prefix client-side variables with `NEXT_PUBLIC_`
   - Server-side variables should NOT have this prefix
3. **Validate and sanitize user input** in API routes before processing
   - Check input length and format
   - Sanitize HTML content to prevent XSS
   - Validate file uploads (type, size, content)
4. **Use Turnstile verification** to prevent bot abuse on analysis endpoints
   - Verify tokens server-side before processing requests
5. **Implement rate limiting** on API routes
   - Consider adding rate limiting middleware for production
6. **Sanitize HTML** when scraping URLs using Cheerio
   - Remove `script`, `style`, `iframe`, `noscript` tags
   - Strip event handlers and dangerous attributes
7. **Use HTTPS** for all external API calls
   - Verify SSL certificates
   - Handle connection errors gracefully
8. **Validate file uploads** for image detection
   - Check file types (accept only images)
   - Limit file size (prevent DoS)
   - Scan for malicious content if possible

### API Security Best Practices
- Validate all request parameters before processing
- Return appropriate HTTP status codes (400, 401, 403, 500, etc.)
- Don't expose internal error messages to users
- Use proper CORS configuration if needed
- Log security-relevant events (failed auth, suspicious requests)

### Client-Side Security
- Never store sensitive data in localStorage or sessionStorage
- Use secure cookies with appropriate flags
- Implement CSRF protection for state-changing operations
- Validate data received from APIs before using

### Content Security
- The `poweredByHeader: false` setting in Next.js config removes framework fingerprinting
- Scraping function removes dangerous HTML elements: `script`, `style`, `iframe`, `noscript`

## Common Patterns

### Loading States
```typescript
const [loading, setLoading] = useState(false)
// Use with Loader2 icon from lucide-react
{loading ? <Loader2 className="animate-spin" /> : <Icon />}
```

### Error Handling
```typescript
const [error, setError] = useState<string | null>(null)
// Display with AnimatePresence for smooth transitions
```

### Modal/Dialog Pattern
- Use Framer Motion's `AnimatePresence` for modal mounting/unmounting
- Fixed positioning with `fixed inset-0 z-50`
- Backdrop with `bg-black/90 backdrop-blur-md`
- Click outside to close: `onClick={handleClose}` on backdrop, `onClick={(e) => e.stopPropagation()}` on modal content

### Form Submission Pattern
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setError(null)
  try {
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error)
    // Handle success
  } catch (err: any) {
    setError(err.message)
  } finally {
    setLoading(false)
  }
}
```

## Testing and Quality

### Manual Testing
Since this project does not have automated tests yet, thorough manual testing is essential:

- **Linting:** Run `npm run lint` before committing changes (Note: ESLint needs to be configured first)
- **Build:** Run `npm run build` to ensure the project builds successfully
- **Responsive Design:** Test at mobile (375px), tablet (768px), and desktop (1024px+) breakpoints
- **Dark Theme:** Verify appearance since the app uses dark theme by default
- **Language Support:** Test both English and Arabic language modes
- **RTL Layout:** Verify RTL layout works correctly for Arabic
- **Authentication:** Test sign-up, sign-in, and sign-out flows
- **API Endpoints:** Test all analysis features (text, URL, image)
- **PDF Generation:** Verify certificate and report generation work correctly
- **Error Handling:** Test error states and edge cases

### Testing Checklist for New Features
- [ ] Feature works in both English and Arabic
- [ ] UI is responsive on mobile, tablet, and desktop
- [ ] Error states are handled gracefully
- [ ] Loading states provide feedback to users
- [ ] Animations are smooth and performant
- [ ] API calls include proper error handling
- [ ] Environment variables are used for sensitive data
- [ ] TypeScript types are properly defined

## Important Notes

1. **Beta Mode:** The application is in beta with all premium features free. The banner at the top reflects this.
2. **Free Features:** Certificate generation is available for scores >= 90%, download report is available for all scores
3. **Minimum Text Length:** Analysis requires at least 20 characters
4. **URL Scraping:** The scrape function has a 15-second timeout and removes navigation/header/footer elements
5. **PDF Generation:** Uses jsPDF for both certificates and reports with custom dark/purple theme
6. **Custom Design System:** The app uses a cyberpunk/neon aesthetic with purple as the primary color and dark backgrounds

## File Naming Conventions

- React components: PascalCase (e.g., `Navbar.tsx`, `AuthForm.tsx`)
- Utility files: camelCase (e.g., `gemini.ts`, `client.ts`)
- API routes: `route.ts` in feature-named directories
- Pages: Use Next.js App Router conventions (`page.tsx`, `layout.tsx`)

## When Making Changes

1. **Maintain the design aesthetic:** Dark theme with purple accents and glassmorphic effects
2. **Support both languages:** Add translations to both `en` and `ar` in translation files
3. **Test authentication flows:** Ensure Supabase integration works correctly
4. **Preserve error handling:** Don't remove try-catch blocks in API routes
5. **Keep animations smooth:** Use Framer Motion best practices
6. **Mobile-first:** Ensure responsive design works on small screens
7. **Accessibility:** Include proper ARIA labels where needed, especially for modals and forms

## Git Workflow

### Branch Naming
- Feature branches: `feature/short-description`
- Bug fixes: `fix/short-description`
- Copilot tasks: `copilot/task-description`

### Commit Messages
- Use clear, descriptive commit messages
- Start with a verb in present tense (e.g., "Add", "Fix", "Update", "Remove")
- Keep the first line under 72 characters
- Example: "Add certificate verification endpoint"

### Pull Requests
- Ensure all changes are tested before creating a PR
- Run `npm run lint` to check for linting issues
- Update documentation if changing public APIs or user-facing features
- Include screenshots for UI changes

## Troubleshooting

### Common Issues

**Issue: `next: not found` when running npm scripts**
- Solution: Run `npm install` to install dependencies

**Issue: ESLint configuration not found**
- Solution: ESLint is not yet configured. If you need to add it:
  ```bash
  npm install --save-dev eslint eslint-config-next@latest --legacy-peer-deps
  ```
  Then create `.eslintrc.json` with Next.js recommended config

**Issue: TypeScript errors in components**
- Solution: Check that you're using the correct import paths with `@/` prefix
- Ensure all props are properly typed with interfaces

**Issue: Supabase client errors**
- Solution: Verify environment variables are set in `.env.local`
- Use the correct Supabase client for the context (client vs server components)

**Issue: Gemini API rate limits**
- Solution: Implement exponential backoff or request queuing
- Consider caching results for identical text inputs

**Issue: RTL layout issues with Arabic**
- Solution: Use `dir={isRTL ? 'rtl' : 'ltr'}` on container elements
- Test with actual Arabic content, not just placeholder text
- Check Tailwind classes have proper RTL support

**Issue: Build failures**
- Solution: Check for client-side only code in server components
- Ensure all `'use client'` directives are at the top of files that need them
- Verify all imports are correctly resolved

## Project-Specific Guidelines

### Working with Gemini API
- Always use environment variables for API keys
- Never expose API keys in client-side code
- The system prompt in `/api/analyze/route.ts` defines the AI behavior - modify carefully
- Handle rate limiting and API errors gracefully

### Supabase Best Practices
- Use `createClient()` from appropriate location (`@/lib/supabase/client` or `@/lib/supabase/server`)
- Row Level Security (RLS) policies should be configured in Supabase dashboard
- Never use the service role key in client-side code
- Test authentication flows in incognito/private browsing mode

### PDF Generation
- PDF generation happens server-side using jsPDF
- Certificates are only generated for scores >= 90%
- Reports include QR codes for verification
- Use the dark/purple theme consistent with the app design

### Internationalization
- All user-facing text must be in both English and Arabic
- Translation keys are in `/src/i18n/translations.ts`
- Use the `useLanguage()` hook to access translations
- Test both languages and verify RTL layout for Arabic
