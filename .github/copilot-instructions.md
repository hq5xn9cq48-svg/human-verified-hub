# Copilot Instructions for Human-Verified Hub

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

## Build and Development

### Commands
```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Environment Variables Required
Create a `.env.local` file with:
```
# Gemini AI
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key
TURNSTILE_SECRET=your_turnstile_secret
```

## Security Considerations

### Important Security Rules
1. **Never commit API keys or secrets** to the repository
2. **Use environment variables** for all sensitive configuration
3. **Validate and sanitize user input** in API routes before processing
4. **Use Turnstile verification** to prevent bot abuse on analysis endpoints
5. **Implement rate limiting** on API routes (if not already present)
6. **Sanitize HTML** when scraping URLs using Cheerio - remove scripts, iframes
7. **Use HTTPS** for all external API calls
8. **Validate file uploads** for image detection (check file types, sizes)

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

- Run `npm run lint` before committing changes
- Test responsive design at mobile (375px), tablet (768px), and desktop (1024px+) breakpoints
- Verify dark mode appearance (the app uses dark theme by default)
- Test both English and Arabic language modes
- Verify RTL layout works correctly for Arabic

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
