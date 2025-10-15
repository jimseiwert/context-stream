/**
 * Favicon/Logo Extraction Utility
 *
 * Extracts favicon URL from HTML content or page URL
 */

import { JSDOM } from 'jsdom';

export interface FaviconResult {
  url: string | null;
  method: 'meta' | 'link' | 'default' | 'none';
}

/**
 * Extract favicon URL from HTML content
 *
 * Searches for (in priority order):
 * 1. <link rel="mask-icon"> - Safari pinned tab icon (usually SVG, high quality)
 * 2. <link rel="apple-touch-icon"> - Apple touch icon (usually high res PNG)
 * 3. <link rel="icon"> or <link rel="shortcut icon"> - Standard favicon
 * 4. <meta property="og:image"> - Open Graph image (common fallback)
 * 5. Falls back to /favicon.ico
 *
 * @param html - HTML content to parse
 * @param baseUrl - Base URL for resolving relative paths
 * @returns Favicon URL or null
 */
export function extractFaviconFromHtml(html: string, baseUrl: string): FaviconResult {
  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Priority 1: <link rel="mask-icon"> - Safari pinned tab (usually SVG)
    const maskIcon = document.querySelector('link[rel="mask-icon"]');
    if (maskIcon) {
      const href = maskIcon.getAttribute('href');
      if (href) {
        const resolvedUrl = new URL(href, baseUrl).toString();
        return { url: resolvedUrl, method: 'link' };
      }
    }

    // Priority 2: <link rel="apple-touch-icon"> - Usually high resolution
    const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (appleTouchIcon) {
      const href = appleTouchIcon.getAttribute('href');
      if (href) {
        const resolvedUrl = new URL(href, baseUrl).toString();
        return { url: resolvedUrl, method: 'link' };
      }
    }

    // Priority 3: <link rel="icon"> or <link rel="shortcut icon">
    const iconLink = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
    if (iconLink) {
      const href = iconLink.getAttribute('href');
      if (href) {
        const resolvedUrl = new URL(href, baseUrl).toString();
        return { url: resolvedUrl, method: 'link' };
      }
    }

    // Priority 4: <meta property="og:image"> - Open Graph image fallback
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) {
      const content = ogImage.getAttribute('content');
      if (content) {
        const resolvedUrl = new URL(content, baseUrl).toString();
        return { url: resolvedUrl, method: 'meta' };
      }
    }

    // Priority 5: Try /favicon.ico as fallback
    const parsedUrl = new URL(baseUrl);
    const faviconUrl = `${parsedUrl.protocol}//${parsedUrl.host}/favicon.ico`;
    return { url: faviconUrl, method: 'default' };

  } catch (error) {
    console.error('[Favicon Extractor] Error parsing HTML:', error);
    return { url: null, method: 'none' };
  }
}

/**
 * Get favicon URL for a given page URL
 *
 * @param pageUrl - URL of the page
 * @returns Default favicon URL at /favicon.ico
 */
export function getDefaultFaviconUrl(pageUrl: string): string {
  try {
    const parsedUrl = new URL(pageUrl);
    return `${parsedUrl.protocol}//${parsedUrl.host}/favicon.ico`;
  } catch (error) {
    console.error('[Favicon Extractor] Invalid URL:', pageUrl);
    return '';
  }
}

/**
 * Verify if a favicon URL is accessible
 *
 * @param faviconUrl - URL to check
 * @returns True if accessible, false otherwise
 */
export async function verifyFaviconUrl(faviconUrl: string): Promise<boolean> {
  try {
    const response = await fetch(faviconUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      return false;
    }

    const contentType = response.headers.get('content-type');
    // Accept image/* and also SVG files (which may be served as image/svg+xml or text/xml)
    return contentType?.startsWith('image/') ||
           contentType?.includes('svg') ||
           faviconUrl.endsWith('.svg') ||
           false;
  } catch (error) {
    return false;
  }
}

/**
 * Extract and verify favicon URL from HTML
 *
 * @param html - HTML content
 * @param baseUrl - Base URL for resolving paths
 * @returns Verified favicon URL or null
 */
export async function extractAndVerifyFavicon(
  html: string,
  baseUrl: string
): Promise<string | null> {
  const result = extractFaviconFromHtml(html, baseUrl);

  if (!result.url) {
    return null;
  }

  // Verify the URL is accessible
  const isValid = await verifyFaviconUrl(result.url);

  if (isValid) {
    console.log(`[Favicon Extractor] Found valid favicon via ${result.method}: ${result.url}`);
    return result.url;
  }

  // If verification failed and we used default, return null
  if (result.method === 'default') {
    console.log('[Favicon Extractor] Default favicon not found');
    return null;
  }

  // Try default as last resort
  const defaultUrl = getDefaultFaviconUrl(baseUrl);
  const isDefaultValid = await verifyFaviconUrl(defaultUrl);

  if (isDefaultValid) {
    console.log(`[Favicon Extractor] Using default favicon: ${defaultUrl}`);
    return defaultUrl;
  }

  return null;
}
