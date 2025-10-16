/**
 * Favicon/Logo Extraction Utility
 *
 * Extracts favicon URL from HTML content or page URL
 */

import { JSDOM } from 'jsdom';

export interface FaviconResult {
  url: string | null;
  method: 'meta' | 'link' | 'header' | 'default' | 'none';
  width?: number;
  height?: number;
}

/**
 * Extract logo URL from HTML content
 *
 * IMPORTANT: Only extracts actual logo images that can be used in <img> tags.
 * Does NOT extract favicons (.ico files) as they don't work reliably in image tags.
 *
 * Searches for (in priority order):
 * 1. Header/banner logos - Visible site logos in header/nav elements
 * 2. <meta property="og:image"> - Open Graph image (social media)
 * 3. <meta name="twitter:image"> - Twitter card image
 *
 * @param html - HTML content to parse
 * @param baseUrl - Base URL for resolving relative paths
 * @returns Logo URL or null
 */
export function extractFaviconFromHtml(html: string, baseUrl: string): FaviconResult {
  try {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Priority 1: Header/banner logos - Look for visible site logos
    // These are actual logo images that work in <img> tags
    const headerSelectors = [
      'header img[alt*="logo" i]',
      'header img[alt*="home" i]',
      'nav img[alt*="logo" i]',
      'banner img[alt*="logo" i]',
      '.logo img',
      '.header-logo img',
      '.site-logo img',
      '.brand img',
      'a[class*="logo" i] img',
      '[class*="banner"] img[alt*="logo" i]',
      '[id*="logo" i] img',
      '[id*="brand" i] img',
    ];

    for (const selector of headerSelectors) {
      const imgs = document.querySelectorAll(selector);
      for (const img of imgs) {
        const src = img.getAttribute('src');
        if (!src) continue;

        // Get dimensions - prefer larger images
        const width = parseInt(img.getAttribute('width') || '0', 10);
        const height = parseInt(img.getAttribute('height') || '0', 10);
        const alt = img.getAttribute('alt') || '';

        // Skip obvious non-logo images (buttons, icons, decorative)
        const skipKeywords = ['button', 'icon-only', 'arrow', 'close', 'menu', 'search', 'crisis', 'vcl'];
        if (skipKeywords.some(keyword => alt.toLowerCase().includes(keyword))) {
          continue;
        }

        // Prefer images >= 64px (better than tiny 16x16 favicons)
        // Or if no dimensions specified, try it anyway
        if (width >= 64 || height >= 64 || (width === 0 && height === 0)) {
          const resolvedUrl = new URL(src, baseUrl).toString();

          // Skip data URLs and very small images
          if (resolvedUrl.startsWith('data:')) continue;

          return {
            url: resolvedUrl,
            method: 'header',
            width: width || undefined,
            height: height || undefined,
          };
        }
      }
    }

    // Priority 2: <meta property="og:image"> - Open Graph image
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) {
      const content = ogImage.getAttribute('content');
      if (content) {
        const resolvedUrl = new URL(content, baseUrl).toString();
        return { url: resolvedUrl, method: 'meta' };
      }
    }

    // Priority 3: <meta name="twitter:image"> - Twitter card image
    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (twitterImage) {
      const content = twitterImage.getAttribute('content');
      if (content) {
        const resolvedUrl = new URL(content, baseUrl).toString();
        return { url: resolvedUrl, method: 'meta' };
      }
    }

    // No logo found - return null instead of falling back to favicon.ico
    return { url: null, method: 'none' };

  } catch (error) {
    console.error('[Favicon Extractor] Error parsing HTML:', error);
    return { url: null, method: 'none' };
  }
}

/**
 * DEPRECATED: No longer using favicon.ico as logo
 * This function is kept for backwards compatibility but should not be used.
 */
export function getDefaultFaviconUrl(pageUrl: string): string {
  console.warn('[Favicon Extractor] getDefaultFaviconUrl is deprecated - use extractAndVerifyFavicon instead');
  return '';
}

/**
 * Verify if a favicon URL is accessible and is a valid image
 *
 * @param faviconUrl - URL to check
 * @returns True if accessible and valid image, false otherwise
 */
export async function verifyFaviconUrl(faviconUrl: string): Promise<boolean> {
  try {
    const response = await fetch(faviconUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000), // 5 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'same-origin',
        'Cache-Control': 'max-age=0',
      },
    });

    if (!response.ok) {
      return false;
    }

    const contentType = response.headers.get('content-type');

    // Accept image/* and also SVG files (which may be served as image/svg+xml or text/xml)
    const isImage = contentType?.startsWith('image/') ||
                   contentType?.includes('svg') ||
                   faviconUrl.endsWith('.svg') ||
                   faviconUrl.endsWith('.png') ||
                   faviconUrl.endsWith('.jpg') ||
                   faviconUrl.endsWith('.jpeg') ||
                   faviconUrl.endsWith('.ico') ||
                   faviconUrl.endsWith('.webp');

    if (!isImage) {
      return false;
    }

    // Check file size - reject images larger than 5MB (likely not a logo)
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
      console.log(`[Favicon Extractor] Image too large (${contentLength} bytes): ${faviconUrl}`);
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Extract and verify logo URL from HTML
 *
 * @param html - HTML content
 * @param baseUrl - Base URL for resolving paths
 * @returns Verified logo URL or null
 */
export async function extractAndVerifyFavicon(
  html: string,
  baseUrl: string
): Promise<string | null> {
  const result = extractFaviconFromHtml(html, baseUrl);

  if (!result.url) {
    console.log('[Favicon Extractor] No logo found in HTML');
    return null;
  }

  // Verify the URL is accessible
  const isValid = await verifyFaviconUrl(result.url);

  if (isValid) {
    const dimensions = result.width && result.height ? ` (${result.width}x${result.height})` : '';
    console.log(`[Favicon Extractor] Found valid logo via ${result.method}${dimensions}: ${result.url}`);
    return result.url;
  }

  console.log(`[Favicon Extractor] Logo URL verification failed: ${result.url}`);
  return null;
}
