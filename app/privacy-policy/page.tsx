import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Cookie, Eye, Lock, UserCheck, Mail, ChevronLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy - Future Times Events',
  description: 'Learn how Future Times Events collects, uses, and protects your personal information.',
};

const sections = [
  {
    id: 'introduction',
    icon: Shield,
    title: 'Introduction',
    content: `
      Future Times Events ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
      
      By accessing or using Future Times Events, you agree to the terms of this Privacy Policy. If you do not agree with our policies and practices, please do not use our services.
    `
  },
  {
    id: 'information-collection',
    icon: Eye,
    title: 'Information We Collect',
    content: `
      We collect information that you provide directly to us, including:
      
      • Account Information: Name, email address, phone number, date of birth, and password when you create an account
      • Profile Information: Profile photos, bio, location preferences, and interests
      • Event Information: Events you create, tickets purchased, RSVPs, and event preferences
      • Payment Information: Billing address and payment method details (processed securely by our payment providers)
      • Communications: Messages, comments, reviews, and customer support inquiries
      
      We also automatically collect certain information when you use our services:
      
      • Device Information: IP address, browser type, operating system, and device identifiers
      • Usage Data: Pages visited, time spent on pages, features used, and clicks
      • Location Data: With your permission, we collect your precise or approximate location
      • Cookies and Similar Technologies: See our Cookie Policy section below
    `
  },
  {
    id: 'cookies',
    icon: Cookie,
    title: 'Cookies and Tracking Technologies',
    content: `
      We use cookies, web beacons, and similar tracking technologies to collect information about your browsing activities.
      
      Types of cookies we use:
      
      • Essential Cookies: Required for the website to function properly (e.g., authentication, security)
      • Functional Cookies: Remember your preferences and settings
      • Analytics Cookies: Help us understand how visitors interact with our website
      • Marketing Cookies: Used to deliver personalized advertisements and track their effectiveness
      
      You can control cookies through your browser settings. However, disabling certain cookies may limit your ability to use some features of our services.
      
      We also use:
      • Google Analytics for website analytics
      • Facebook Pixel for advertising effectiveness
      • Session cookies to maintain your login state
    `
  },
  {
    id: 'information-use',
    icon: UserCheck,
    title: 'How We Use Your Information',
    content: `
      We use the information we collect to:
      
      • Provide, maintain, and improve our services
      • Process transactions and send related information
      • Send technical notices, updates, security alerts, and support messages
      • Respond to your comments, questions, and requests
      • Personalize your experience and deliver content relevant to your interests
      • Facilitate event creation, management, and attendance
      • Enable communication between users, organizers, and attendees
      • Monitor and analyze trends, usage, and activities
      • Detect, investigate, and prevent fraudulent transactions and other illegal activities
      • Comply with legal obligations
    `
  },
  {
    id: 'information-sharing',
    icon: Lock,
    title: 'Information Sharing and Disclosure',
    content: `
      We may share your information in the following situations:
      
      • With Event Organizers: When you RSVP or purchase tickets, we share necessary information with the event organizer
      • With Other Users: Information you choose to make public on your profile or in comments
      • With Service Providers: Third-party vendors who perform services on our behalf (payment processing, data analysis, email delivery, hosting)
      • For Legal Reasons: When required by law, court order, or governmental regulation
      • Business Transfers: In connection with a merger, acquisition, or sale of assets
      
      We do not sell your personal information to third parties for marketing purposes.
    `
  },
  {
    id: 'data-security',
    icon: Lock,
    title: 'Data Security',
    content: `
      We implement appropriate technical and organizational measures to protect your personal information:
      
      • Encryption of sensitive data in transit and at rest
      • Regular security assessments and penetration testing
      • Access controls and authentication requirements
      • Employee training on data protection practices
      • Incident response procedures
      
      However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.
    `
  },
  {
    id: 'your-rights',
    icon: UserCheck,
    title: 'Your Privacy Rights',
    content: `
      Depending on your location, you may have the following rights:
      
      • Access: Request a copy of the personal information we hold about you
      • Correction: Request correction of inaccurate or incomplete information
      • Deletion: Request deletion of your personal information (subject to legal requirements)
      • Portability: Request transfer of your data to another service
      • Objection: Object to certain processing of your personal information
      • Withdraw Consent: Withdraw consent for processing based on consent
      • Opt-out: Opt-out of marketing communications
      
      To exercise these rights, please contact us using the information below.
    `
  },
  {
    id: 'data-retention',
    icon: Lock,
    title: 'Data Retention',
    content: `
      We retain your personal information for as long as necessary to:
      
      • Provide our services and fulfill the purposes outlined in this Privacy Policy
      • Comply with legal obligations, resolve disputes, and enforce agreements
      • Maintain business records for financial and audit purposes
      
      When we no longer need your personal information, we will securely delete or anonymize it.
    `
  },
  {
    id: 'children',
    icon: UserCheck,
    title: "Children's Privacy",
    content: `
      Our services are not directed to children under 13 years of age. We do not knowingly collect personal information from children under 13. If we learn that we have collected personal information from a child under 13, we will promptly delete that information.
      
      If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
    `
  },
  {
    id: 'international',
    icon: Shield,
    title: 'International Data Transfers',
    content: `
      Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws.
      
      When we transfer information internationally, we implement appropriate safeguards, including:
      
      • Standard contractual clauses approved by relevant authorities
      • Adequacy decisions where applicable
      • Data processing agreements with strict confidentiality obligations
    `
  },
  {
    id: 'changes',
    icon: Shield,
    title: 'Changes to This Privacy Policy',
    content: `
      We may update this Privacy Policy from time to time to reflect changes in our practices or for legal, operational, or regulatory reasons.
      
      We will notify you of any material changes by:
      • Posting the updated policy on our website with a new effective date
      • Sending you an email notification
      • Displaying a prominent notice within our services
      
      Your continued use of our services after any changes indicates your acceptance of the updated Privacy Policy.
    `
  },
  {
    id: 'contact',
    icon: Mail,
    title: 'Contact Us',
    content: `
      If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
      
      Email: privacy@futuretimesevents.com
      
      Postal Address:
      Future Times Events
      Privacy Department
      123 Innovation Drive
      Harare, Zimbabwe
      
      We will respond to your inquiry within 30 days.
    `
  }
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen page-offset" style={{ background: 'var(--bg-secondary)' }}>
      {/* Header */}
      <div className="border-b" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="container flex flex-col" style={{ paddingBlock: 'var(--sp-6)', gap: 'var(--sp-3)' }}>
          <Link 
            href="/"
            className="inline-flex w-fit items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: 'var(--text-muted)', marginBottom: 'var(--sp-2)' }}
          >
            <ChevronLeft size={16} />
            Back to Home
          </Link>
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
            Privacy Policy
          </h1>
          <p className="text-base md:text-lg" style={{ color: 'var(--text-muted)' }}>
            Last updated: May 11, 2026
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container" style={{ paddingBlock: 'var(--sp-6)' }}>
        <div className="max-w-4xl" style={{ marginInline: 'auto' }}>
          {/* Quick Navigation */}
          <div
            className="rounded-[var(--r-3xl)] bg-[var(--bg-card)] border border-[var(--border)] shadow-[var(--shadow-card)]"
            style={{ padding: 'clamp(1.25rem, 4vw, 2rem)', marginBottom: 'var(--sp-6)', boxSizing: 'border-box' }}
          >
            <h2 className="font-bold text-lg" style={{ color: 'var(--text)', marginBottom: 'var(--sp-3)' }}>Quick Navigation</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center gap-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
                  style={{ color: 'var(--text-muted)', padding: 'var(--sp-2) var(--sp-3)' }}
                >
                  <section.icon size={14} style={{ color: 'var(--accent)' }} />
                  {section.title}
                </a>
              ))}
            </div>
          </div>

          {/* Sections */}
          <div className="flex flex-col" style={{ gap: 'var(--sp-5)' }}>
            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24 rounded-[var(--r-3xl)] bg-[var(--bg-card)] border border-[var(--border)] shadow-[var(--shadow-card)]"
                style={{ padding: 'clamp(1.25rem, 4vw, 2rem)', boxSizing: 'border-box' }}
              >
                <div className="flex items-center gap-3" style={{ marginBottom: 'var(--sp-3)' }}>
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(var(--accent-rgb, 114, 34, 227), 0.1)' }}
                  >
                    <section.icon size={20} style={{ color: 'var(--accent)' }} />
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text)' }}>
                    {section.title}
                  </h2>
                </div>
                
                <div
                  className="max-w-none flex flex-col"
                  style={{ color: 'var(--text-muted)', gap: 'var(--sp-3)' }}
                >
                  {section.content.split('\n\n').map((paragraph, idx) => (
                    <p key={idx} className="leading-relaxed whitespace-pre-line">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Footer Note */}
          <div className="text-center" style={{ marginTop: 'var(--sp-6)', paddingInline: 'var(--sp-3)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              By using Future Times Events, you acknowledge that you have read and understood this Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
