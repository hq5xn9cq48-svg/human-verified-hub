import { NextResponse } from "next/server";
import * as cheerio from 'cheerio';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ 
        error: "No URL provided" 
      }, { status: 400 });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return NextResponse.json({ 
        error: "Invalid URL format" 
      }, { status: 400 });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return NextResponse.json({ 
          error: `Failed to fetch URL (${response.status})` 
        }, { status: 400 });
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Remove unwanted elements
      $('script, style, nav, header, footer, aside, iframe, noscript, svg, img, video, audio, form, button, input, select, textarea, [role="navigation"], [role="banner"], [role="complementary"], .advertisement, .ad, .ads, .sidebar, .comment, .comments, .social, .share, .related').remove();

      // Get title
      const title = $('title').text().trim() || 
                    $('h1').first().text().trim() ||
                    $('meta[property="og:title"]').attr('content') ||
                    'Untitled';

      // Get main content - try multiple selectors
      let content = '';
      
      const contentSelectors = [
        'article',
        'main',
        '[role="main"]',
        '.post-content',
        '.article-content',
        '.entry-content',
        '.content',
        '.post',
        '.article',
        '#content',
        '#main',
        '.story-body',
        '.article-body',
      ];

      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length) {
          content = element.text();
          break;
        }
      }

      // Fallback to body if no content found
      if (!content) {
        content = $('body').text();
      }

      // Clean the content
      content = content
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim();

      // Limit content length
      if (content.length > 15000) {
        content = content.substring(0, 15000) + '...';
      }

      if (content.length < 50) {
        return NextResponse.json({ 
          error: "Could not extract meaningful content from this URL" 
        }, { status: 400 });
      }

      return NextResponse.json({ 
        title,
        content,
        url,
        wordCount: content.split(/\s+/).length
      });

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return NextResponse.json({ 
          error: "Request timed out" 
        }, { status: 408 });
      }
      throw fetchError;
    }

  } catch (error: any) {
    console.error("Scrape Error:", error?.message || error);
    return NextResponse.json({ 
      error: "Failed to fetch URL content" 
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 30;
