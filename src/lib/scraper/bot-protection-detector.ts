/**
 * Bot Protection Detector
 *
 * Detects bot protection mechanisms by analyzing:
 * - Response headers (Cloudflare, Akamai, AWS WAF, etc.)
 * - Rate limiting indicators
 * - Domain patterns
 * - robots.txt crawl-delay directives
 *
 * Returns protection level to adjust scraping behavior accordingly.
 */

export type ProtectionLevel = 'none' | 'low' | 'medium' | 'high';

export interface ProtectionDetectionResult {
  level: ProtectionLevel;
  services: string[]; // List of detected services (e.g., ['cloudflare', 'rate-limiting'])
  details: string; // Human-readable explanation
}

export class BotProtectionDetector {
  private userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  /**
   * Detect bot protection by probing the start URL
   */
  async detect(url: string, crawlDelay?: number): Promise<ProtectionDetectionResult> {
    const services: string[] = [];
    let highestLevel: ProtectionLevel = 'none';

    // Check domain patterns first (fast)
    const domainLevel = this.checkDomainPatterns(url);
    if (domainLevel !== 'none') {
      services.push(`${domainLevel}-security domain`);
      highestLevel = domainLevel;
    }

    // Check robots.txt crawl-delay if provided
    if (crawlDelay && crawlDelay >= 1) {
      services.push(`crawl-delay: ${crawlDelay}s`);
      const crawlDelayLevel = this.getCrawlDelayLevel(crawlDelay);
      if (this.isHigherLevel(crawlDelayLevel, highestLevel)) {
        highestLevel = crawlDelayLevel;
      }
    }

    // Probe URL to check headers
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
        redirect: 'follow',
      });

      // Check response headers for protection services
      const headers = response.headers;

      // Cloudflare detection
      if (headers.get('cf-ray') || headers.get('server')?.toLowerCase().includes('cloudflare')) {
        services.push('Cloudflare');
        if (this.isHigherLevel('medium', highestLevel)) {
          highestLevel = 'medium';
        }
      }

      // Akamai detection
      if (
        headers.get('server')?.includes('AkamaiGHost') ||
        Array.from(headers.keys()).some(key => key.toLowerCase().startsWith('x-akamai'))
      ) {
        services.push('Akamai');
        if (this.isHigherLevel('medium', highestLevel)) {
          highestLevel = 'medium';
        }
      }

      // AWS CloudFront (with WAF indicators)
      if (headers.get('x-amz-cf-id') || headers.get('x-amz-cf-pop')) {
        services.push('AWS CloudFront');
        if (this.isHigherLevel('low', highestLevel)) {
          highestLevel = 'low';
        }
      }

      // Other WAF/Bot Protection Services
      if (headers.get('x-sucuri-id') || headers.get('x-sucuri-cache')) {
        services.push('Sucuri WAF');
        if (this.isHigherLevel('high', highestLevel)) {
          highestLevel = 'high';
        }
      }

      if (headers.get('server')?.includes('PerimeterX')) {
        services.push('PerimeterX');
        if (this.isHigherLevel('high', highestLevel)) {
          highestLevel = 'high';
        }
      }

      if (Array.from(headers.keys()).some(key => key.toLowerCase().startsWith('x-datadome'))) {
        services.push('DataDome');
        if (this.isHigherLevel('high', highestLevel)) {
          highestLevel = 'high';
        }
      }

      if (headers.get('server')?.toLowerCase().includes('ddos-guard')) {
        services.push('DDoS-Guard');
        if (this.isHigherLevel('high', highestLevel)) {
          highestLevel = 'high';
        }
      }

      // Rate limiting detection
      const rateLimitHeaders = [
        'x-ratelimit-limit',
        'x-ratelimit-remaining',
        'x-rate-limit-limit',
        'ratelimit-limit',
        'retry-after',
      ];

      const hasRateLimiting = rateLimitHeaders.some(header => headers.get(header));
      if (hasRateLimiting) {
        services.push('Rate limiting');
        if (this.isHigherLevel('medium', highestLevel)) {
          highestLevel = 'medium';
        }
      }
    } catch (error: any) {
      // If we can't probe, assume no protection (or network error)
      console.log(`[BotProtectionDetector] Failed to probe ${url}: ${error.message}`);
    }

    // Generate human-readable details
    const details = this.generateDetails(highestLevel, services);

    return {
      level: highestLevel,
      services,
      details,
    };
  }

  /**
   * Check domain patterns for known security-conscious organizations
   */
  private checkDomainPatterns(url: string): ProtectionLevel {
    try {
      const hostname = new URL(url).hostname.toLowerCase();

      // Government and military (highest security)
      if (hostname.endsWith('.gov') || hostname.endsWith('.mil')) {
        return 'high';
      }

      // Educational institutions (medium security)
      if (hostname.endsWith('.edu')) {
        return 'low';
      }

      // Known high-security domains
      const highSecurityDomains = [
        'stripe.com',
        'paypal.com',
        'bankofamerica.com',
        'chase.com',
        'wellsfargo.com',
        'citibank.com',
      ];

      if (highSecurityDomains.some(domain => hostname.includes(domain))) {
        return 'high';
      }
    } catch {
      // Invalid URL
    }

    return 'none';
  }

  /**
   * Convert crawl-delay seconds to protection level
   */
  private getCrawlDelayLevel(delaySec: number): ProtectionLevel {
    if (delaySec >= 5) return 'high';
    if (delaySec >= 2) return 'medium';
    if (delaySec >= 1) return 'low';
    return 'none';
  }

  /**
   * Check if level A is higher than level B
   */
  private isHigherLevel(a: ProtectionLevel, b: ProtectionLevel): boolean {
    const levels: Record<ProtectionLevel, number> = {
      none: 0,
      low: 1,
      medium: 2,
      high: 3,
    };
    return levels[a] > levels[b];
  }

  /**
   * Generate human-readable details about detected protection
   */
  private generateDetails(level: ProtectionLevel, services: string[]): string {
    if (level === 'none') {
      return 'No bot protection detected - using default scraping settings';
    }

    const serviceList = services.length > 0 ? ` (${services.join(', ')})` : '';

    switch (level) {
      case 'low':
        return `Low protection detected${serviceList} - using moderate scraping speed`;
      case 'medium':
        return `Medium protection detected${serviceList} - using careful scraping with delays`;
      case 'high':
        return `High protection detected${serviceList} - using very conservative scraping to avoid blocking`;
      default:
        return 'Unknown protection level';
    }
  }
}
