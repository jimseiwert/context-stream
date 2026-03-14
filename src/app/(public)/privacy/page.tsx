/**
 * Privacy Policy Page
 */

import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicWrapper } from "@/components/layout/public-wrapper";
import Link from "next/link";


export default function PrivacyPage() {
  return (
    <PublicWrapper>
      <PublicHeader />

      {/* Hero */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "64px 24px 56px", textAlign: "center" }}>
        <div className="pub-s-label" style={{ marginBottom: 12 }}>Legal</div>
        <h1 className="pub-h-display" style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", color: "#dce4f0", marginBottom: 12 }}>
          Privacy Policy
        </h1>
        <p style={{ color: "#5a6a85", fontSize: "0.875rem" }}>
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Main Content */}
      <main id="main-content" style={{ flex: 1 }}>
        <div
          className="pub-prose"
          style={{ maxWidth: 760, margin: "0 auto", padding: "56px 24px 80px" }}
        >

          <h2>1. Introduction</h2>
          <p>
            Welcome to ContextStream (&quot;we,&quot; &quot;our,&quot; or
            &quot;us&quot;). We are committed to protecting your personal
            information and your right to privacy. This Privacy Policy explains
            how we collect, use, disclose, and safeguard your information when
            you use our service.
          </p>

          <h2>2. Information We Collect</h2>
          <h3>2.1 Account Information</h3>
          <p>
            When you create an account, we collect information such as your
            name, email address, and password (encrypted).
          </p>

          <h3>2.2 Documentation Sources</h3>
          <p>
            We collect and index the documentation URLs and content you provide
            to our service. This includes website URLs, repository links, and
            any configuration settings you specify.
          </p>

          <h3>2.3 Usage Data</h3>
          <p>
            We automatically collect certain information when you use our
            service, including:
          </p>
          <ul>
            <li>Search queries and interactions</li>
            <li>API usage and requests</li>
            <li>Device and browser information</li>
            <li>Log data (IP address, timestamps, errors)</li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Provide, maintain, and improve our service</li>
            <li>Process your searches and queries</li>
            <li>Send you service-related notifications</li>
            <li>Monitor and analyze usage patterns</li>
            <li>Detect and prevent fraud or abuse</li>
            <li>Comply with legal obligations</li>
          </ul>

          <h2>4. Data Sharing and Disclosure</h2>
          <p>
            We do not sell your personal information. We may share your
            information in the following circumstances:
          </p>
          <ul>
            <li>
              <strong>Service Providers:</strong> We may share information with
              third-party service providers who help us operate our service
              (e.g., hosting, analytics, payment processing).
            </li>
            <li>
              <strong>Legal Requirements:</strong> We may disclose information
              if required by law or in response to valid legal requests.
            </li>
            <li>
              <strong>Business Transfers:</strong> In the event of a merger,
              acquisition, or sale of assets, your information may be
              transferred.
            </li>
          </ul>

          <h2>5. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to
            protect your information, including encryption, access controls, and
            secure hosting. However, no method of transmission over the internet
            is 100% secure.
          </p>

          <h2>6. Data Retention</h2>
          <p>
            We retain your information for as long as your account is active or
            as needed to provide our services. You may request deletion of your
            account and associated data at any time.
          </p>

          <h2>7. Your Rights</h2>
          <p>Depending on your location, you may have the right to:</p>
          <ul>
            <li>Access your personal information</li>
            <li>Correct inaccurate information</li>
            <li>Request deletion of your information</li>
            <li>Object to or restrict certain processing</li>
            <li>Data portability</li>
            <li>Withdraw consent</li>
          </ul>

          <h2>8. Cookies and Tracking</h2>
          <p>
            We use cookies and similar technologies to maintain your session,
            remember your preferences, and analyze service usage. You can
            control cookies through your browser settings.
          </p>

          <h2>9. Third-Party Services</h2>
          <p>
            Our service may integrate with third-party services (e.g., GitHub
            OAuth, Stripe for payments). These services have their own privacy
            policies, and we encourage you to review them.
          </p>

          <h2>10. Children&apos;s Privacy</h2>
          <p>
            Our service is not intended for children under 13. We do not
            knowingly collect information from children under 13.
          </p>

          <h2>11. International Data Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries
            other than your own. We ensure appropriate safeguards are in place
            for such transfers.
          </p>

          <h2>12. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify
            you of any material changes by posting the new policy on this page
            and updating the &quot;Last updated&quot; date.
          </p>

          <h2>13. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or our privacy
            practices, please contact us through{" "}
            <Link href="https://github.com/contextstream/contextstream/issues">
              GitHub Issues
            </Link>
            .
          </p>

          <h2>14. Self-Hosted Deployments</h2>
          <p>
            If you self-host ContextStream, you are the data controller and
            responsible for compliance with applicable privacy laws. This
            Privacy Policy applies only to our hosted service.
          </p>
        </div>
      </main>

      <PublicFooter />
    </PublicWrapper>
  );
}
