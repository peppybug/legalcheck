import type { Metadata } from "next";
import { SubPage, CONTACT_EMAIL, OWNER } from "@/components/SiteChrome";

export const metadata: Metadata = { title: "Privacy policy · Legalcheck" };

export default function Privacy() {
  return (
    <SubPage current="privacy">
      <h1>Privacy policy</h1>
      <p className="updated">Last updated 18 November 2026</p>
      <p className="lead">
        Short version: we don’t ask for your personal details and we don’t use cookies or tracking. Searches for answers we
        already have stay in your browser; new questions are sent to our lookup service to be researched.
      </p>

      <h2>Who is responsible</h2>
      <p>
        This site is run by {OWNER}, the Netherlands. You can reach us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>Your searches</h2>
      <p>
        When you search, our database of answers is downloaded to your browser and the search happens there first. If there’s
        an answer, nothing is sent anywhere.
      </p>
      <p>
        If there isn’t, the activity you typed and the country you picked are sent to our lookup service (running on
        Cloudflare), which asks Anthropic’s Claude API to research it. The answer is cached for up to 30 days so the next person
        asking the same question gets it quickly. It isn’t linked to you. Don’t type names or other personal details into the
        search box.
      </p>
      <p>
        To stop abuse, the lookup service briefly uses your IP address to limit how many new questions can be asked per minute.
        It isn’t stored or used for anything else.
      </p>

      <h2>How answers are made</h2>
      <p>
        Database answers are researched in advance by Claude, checked against official legal sources, and reviewed by a person
        before they’re published. No visitor data is used for this. Instant answers are researched as described above. If you suggest an activity by email, we may add the activity and country (but
        nothing about you) to that list.
      </p>

      <h2>What we don’t do</h2>
      <ul className="list">
        <li>No accounts or sign-up, and no payments on this site</li>
        <li>No cookies</li>
        <li>No analytics, advertising or tracking scripts</li>
        <li>No selling or sharing of personal data</li>
      </ul>

      <h2>Services the site uses</h2>
      <p>
        Like every website, loading a page means your browser contacts the servers that deliver it. Those services see
        technical information such as your IP address and browser type:
      </p>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>What it does</th>
              <th>Their policy</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Cloudflare Workers (Cloudflare, Inc.)</td>
              <td>Runs the lookup service for new questions</td>
              <td>
                <a href="https://www.cloudflare.com/privacypolicy/" rel="noopener">
                  Cloudflare privacy policy
                </a>
              </td>
            </tr>
            <tr>
              <td>Anthropic (Claude API)</td>
              <td>Researches new questions (receives only the activity and country)</td>
              <td>
                <a href="https://www.anthropic.com/legal/privacy" rel="noopener">
                  Anthropic privacy policy
                </a>
              </td>
            </tr>
            <tr>
              <td>GitHub Pages (GitHub, Inc.)</td>
              <td>Hosts the website</td>
              <td>
                <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" rel="noopener">
                  GitHub privacy statement
                </a>
              </td>
            </tr>
            <tr>
              <td>Google Fonts (Google LLC)</td>
              <td>Delivers the fonts</td>
              <td>
                <a href="https://developers.google.com/fonts/faq/privacy" rel="noopener">
                  Google Fonts privacy FAQ
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>If you email us</h2>
      <p>
        We use your email address and message only to answer you and, for corrections, to fix the answer. We keep the email as
        long as needed for that and then delete it.
      </p>

      <h2>Your rights</h2>
      <p>
        Under the GDPR you can ask to see, correct or delete personal data we hold about you, and object to how we use it.
        Contact us to do so. You also have the right to complain to a data protection authority, such as the{" "}
        <a href="https://autoriteitpersoonsgegevens.nl/en" rel="noopener">
          Autoriteit Persoonsgegevens
        </a>{" "}
        in the Netherlands.
      </p>

      <h2>Changes</h2>
      <p>If this policy changes, we’ll update it here and change the date at the top.</p>
    </SubPage>
  );
}
