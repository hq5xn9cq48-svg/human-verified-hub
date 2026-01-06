# Human Verified Hub

An advanced AI platform to verify human-written content using Gemini 1.5 Flash and Supabase for secure data tracking.

## Tech Stack

This project is built with modern web technologies:

- **Next.js 14** - React framework for production
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library for React
- **Supabase** - Backend-as-a-Service for secure data storage
- **Google Generative AI (Gemini)** - AI-powered content verification
- **Lucide React** - Beautiful icon library
- **Recharts** - Charting library for data visualization
- **jsPDF** - PDF generation library
- **QR Code** - QR code generation

## Installation

Install the project dependencies:

```bash
npm install
```

## Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Build for Production

Build the application for production:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Environment Variables

This project requires the following environment variables to be set. Create a `.env.local` file in the root directory and add these variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_AI_API_KEY=your_google_ai_api_key
```

See `.env.example` for a template with all required environment variables.

## License

All rights reserved.
