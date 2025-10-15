/**
 * Terms of Service Page
 */

import { Button } from "@/components/ui/button";
import { PublicFooter } from "@/components/layout/public-footer";
import Link from "next/link";

export const metadata = {
  title: "Terms of Service - ContextStream",
  description: "ContextStream Terms of Service",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">ContextStream</span>
          </Link>
          <nav className="flex items-center space-x-6">
            <Link
              href="/pricing"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Login
            </Link>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto prose dark:prose-invert">
          <h1>Terms of Service</h1>
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using ContextStream ("Service"), you agree to be bound
            by these Terms of Service ("Terms"). If you do not agree to these
            Terms, do not use the Service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            ContextStream is a documentation indexing and search platform that
            integrates with AI tools via the Model Context Protocol (MCP). The
            Service allows you to index documentation sources and query them using
            natural language through compatible AI assistants.
          </p>

          <h2>3. Account Registration</h2>
          <p>
            To use certain features of the Service, you must create an account. You
            agree to:
          </p>
          <ul>
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Notify us immediately of any unauthorized access</li>
            <li>Be responsible for all activities under your account</li>
          </ul>

          <h2>4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Violate any applicable laws or regulations</li>
            <li>Infringe on intellectual property rights</li>
            <li>Transmit malicious code or harmful content</li>
            <li>Attempt to gain unauthorized access to the Service</li>
            <li>Interfere with or disrupt the Service</li>
            <li>Use the Service for illegal or unauthorized purposes</li>
            <li>Scrape or harvest data from the Service</li>
            <li>Abuse or exceed rate limits</li>
          </ul>

          <h2>5. Content and Intellectual Property</h2>
          <h3>5.1 Your Content</h3>
          <p>
            You retain ownership of any documentation sources and content you
            provide to the Service. By using the Service, you grant us a license to
            process, store, and display your content as necessary to provide the
            Service.
          </p>

          <h3>5.2 Our Content</h3>
          <p>
            The Service, including its design, features, and source code, is owned
            by ContextStream and protected by intellectual property laws. The
            Service is licensed under the MIT License for self-hosted deployments.
          </p>

          <h3>5.3 Third-Party Content</h3>
          <p>
            You are responsible for ensuring you have the right to index and query
            third-party documentation. We are not responsible for copyright
            infringement claims related to your use of the Service.
          </p>

          <h2>6. Subscription and Payment</h2>
          <h3>6.1 Paid Plans</h3>
          <p>
            Certain features require a paid subscription. Subscription fees are
            charged on a recurring basis and are non-refundable except as required
            by law or as specified in our refund policy.
          </p>

          <h3>6.2 Free Tier</h3>
          <p>
            We offer a free tier with limited features. We reserve the right to
            modify or discontinue the free tier at any time.
          </p>

          <h3>6.3 Payment Terms</h3>
          <ul>
            <li>Prices are in USD unless otherwise stated</li>
            <li>You must provide valid payment information</li>
            <li>Subscriptions auto-renew unless cancelled</li>
            <li>We may change prices with 30 days notice</li>
          </ul>

          <h2>7. Usage Limits and Quotas</h2>
          <p>
            Your subscription includes specific usage limits (searches, sources,
            pages indexed). Exceeding these limits may result in service
            interruption or additional charges. We reserve the right to enforce
            rate limits and throttle excessive usage.
          </p>

          <h2>8. Service Availability</h2>
          <p>
            We strive to maintain high availability but do not guarantee
            uninterrupted access. We may perform maintenance, updates, or
            modifications that temporarily affect service availability. We are not
            liable for any downtime or service interruptions.
          </p>

          <h2>9. Data and Privacy</h2>
          <p>
            Your use of the Service is subject to our Privacy Policy. We process
            your data in accordance with applicable privacy laws. For self-hosted
            deployments, you are responsible for data protection compliance.
          </p>

          <h2>10. Termination</h2>
          <h3>10.1 Termination by You</h3>
          <p>
            You may terminate your account at any time. Upon termination, your data
            will be deleted according to our retention policy.
          </p>

          <h3>10.2 Termination by Us</h3>
          <p>
            We may suspend or terminate your account if you violate these Terms,
            engage in fraudulent activity, or for any other reason at our sole
            discretion.
          </p>

          <h2>11. Disclaimer of Warranties</h2>
          <p>
            THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS
            OR IMPLIED. WE DISCLAIM ALL WARRANTIES INCLUDING MERCHANTABILITY,
            FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>

          <h2>12. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY
            INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR
            ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR
            INDIRECTLY.
          </p>

          <h2>13. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless ContextStream from any claims,
            damages, or expenses arising from your use of the Service, violation of
            these Terms, or infringement of any rights.
          </p>

          <h2>14. Changes to Terms</h2>
          <p>
            We may modify these Terms at any time. Material changes will be
            notified via email or service notification. Continued use after changes
            constitutes acceptance of the new Terms.
          </p>

          <h2>15. Governing Law</h2>
          <p>
            These Terms are governed by the laws of [Your Jurisdiction], without
            regard to conflict of law principles.
          </p>

          <h2>16. Dispute Resolution</h2>
          <p>
            Any disputes arising from these Terms or the Service shall be resolved
            through binding arbitration, except where prohibited by law.
          </p>

          <h2>17. Open Source License</h2>
          <p>
            The ContextStream source code is available under the MIT License. The
            MIT License applies to self-hosted deployments. These Terms apply to
            our hosted service.
          </p>

          <h2>18. API Terms</h2>
          <p>
            If you use our API, you must comply with our API usage guidelines and
            rate limits. API keys are confidential and must not be shared.
          </p>

          <h2>19. Contact Information</h2>
          <p>
            For questions about these Terms, please contact us through{" "}
            <Link
              href="https://github.com/contextstream/contextstream/issues"
              className="text-primary hover:underline"
            >
              GitHub Issues
            </Link>
            .
          </p>

          <h2>20. Severability</h2>
          <p>
            If any provision of these Terms is found to be invalid or unenforceable,
            the remaining provisions shall remain in full force and effect.
          </p>

          <h2>21. Entire Agreement</h2>
          <p>
            These Terms, together with our Privacy Policy, constitute the entire
            agreement between you and ContextStream regarding the Service.
          </p>
        </div>
      </div>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
