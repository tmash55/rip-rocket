import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";

// CHATGPT PROMPT TO GENERATE YOUR TERMS & SERVICES — replace with your own data 👇

// 1. Go to https://chat.openai.com/
// 2. Copy paste bellow
// 3. Replace the data with your own (if needed)
// 4. Paste the answer from ChatGPT directly in the <pre> tag below

// You are an excellent lawyer.

// I need your help to write a simple Terms & Services for my website. Here is some context:
// - Website: https://shipfa.st
// - Name: ShipFast
// - Contact information: marc@shipfa.st
// - Description: A JavaScript code boilerplate to help entrepreneurs launch their startups faster
// - Ownership: when buying a package, users can download code to create apps. They own the code but they do not have the right to resell it. They can ask for a full refund within 7 day after the purchase.
// - User data collected: name, email and payment information
// - Non-personal data collection: web cookies
// - Link to privacy-policy: https://shipfa.st/privacy-policy
// - Governing Law: France
// - Updates to the Terms: users will be updated by email

// Please write a simple Terms & Services for my site. Add the current date. Do not add or explain your reasoning. Answer:

export const metadata = getSEOTags({
  title: `Terms and Conditions | ${config.appName}`,
  canonicalUrlRelative: "/tos",
});

const TOS = () => {
  return (
    <main className="max-w-xl mx-auto">
      <div className="p-5">
        <Link href="/" className="btn btn-ghost">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M15 10a.75.75 0 01-.75.75H7.612l2.158 1.96a.75.75 0 11-1.04 1.08l-3.5-3.25a.75.75 0 010-1.08l3.5-3.25a.75.75 0 111.04 1.08L7.612 9.25h6.638A.75.75 0 0115 10z"
              clipRule="evenodd"
            />
          </svg>
          Back
        </Link>
        <h1 className="text-3xl font-extrabold pb-6">
          Terms and Conditions for {config.appName}
        </h1>

        <pre
          className="leading-relaxed whitespace-pre-wrap"
          style={{ fontFamily: "sans-serif" }}
        >
          {`Terms of Service
Effective Date: August 6, 2025

1. Acceptance of Terms
By accessing or using Fantasy Nexus (“the Site”), you agree to be bound by these Terms of Service (“Terms”). If you do not agree, please do not use the Site.

2. Description of Service
Fantasy Nexus is a free fantasy football tool that helps players gain an edge at their draft by identifying values and busts on each fantasy platform.

3. Ownership and Use
The Site and its content are owned by Fantasy Nexus. You may use the Site for personal, non-commercial purposes. Unauthorized copying, distribution, or modification of Site content is prohibited.

4. User Conduct
You agree not to:

Use the Site for any unlawful purpose.

Interfere with or disrupt the Site’s operation.

Attempt to gain unauthorized access to Site data or systems.

5. Privacy and Data Collection
We collect non-personal data through web cookies to improve Site performance. For details, see our Privacy Policy: https://fantasynexus.io/privacy-policy.

6. Intellectual Property
All trademarks, logos, and service marks displayed on the Site are the property of Fantasy Nexus or their respective owners. Nothing contained in these Terms grants any license to use any logo or mark without the express written permission of Fantasy Nexus.

7. Disclaimer of Warranties
The Site is provided “as is” and “as available” without warranties of any kind, express or implied. Fantasy Nexus does not guarantee the accuracy, completeness, or reliability of any content.

8. Limitation of Liability
In no event shall Fantasy Nexus be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with your use of the Site.

9. Changes to Terms
Fantasy Nexus may update these Terms from time to time. You will be notified of material changes via the email address you provided.

10. Governing Law
These Terms are governed by the laws of the United States of America, without regard to conflict of law principles.

11. Contact Information
For questions or concerns, please contact us at tyler.maschoff@gmail.com.

By using Fantasy Nexus, you acknowledge that you have read and agree to these Terms of Service.`}
        </pre>
      </div>
    </main>
  );
};

export default TOS;
