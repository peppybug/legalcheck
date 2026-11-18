import type { Metadata } from "next";
import { SubPage, CONTACT_EMAIL, OWNER } from "@/components/SiteChrome";

export const metadata: Metadata = { title: "Privacy policy · Legalcheck" };

export default function Privacy() {
  return (
    <SubPage current="privacy">
      <h1>Privacy policy</h1>
      <p className="updated">Last updated 18 November 2026</p>
      <p className="lead">
        Short version: we don’t ask for your personal details and we don’t use cookies or tracking. To answer your question,
        what you type is sent to our server and to the AI service that researches the law.
      </p>

      <h2>Who is responsible</h2>
      <p>
        This site is run by {OWNER}, the Netherlands. You can reach us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>Your questions</h2>
      <p>
        When you check an activity, the text you typed and the country you picked are sent to our server. The server passes
        them to Anthropic’s Claude API, which searches the web and writes the answer. The question and answer are then saved
        on our server for up to 30 days, so anyone asking the same question gets a fast reply. They are not linked to you.
      </p>
      <p>
        Don’t type names, addresses or other personal details into the search box. It’s meant for activities, like “flying a
        drone”, not personal stories.
      </p>

      <h2>Your IP address</h2>
      <p>
        To stop abuse, the server counts how many new questions come from each IP address. The count is kept in memory for one
        hour and then discarded. It isn’t written to a database or used for anything else.
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
              <td>
                <span className="ph">Hosting provider</span>
              </td>
              <td>Hosts the website and runs the server</td>
              <td>
                <span className="ph">Link to their privacy policy</span>
              </td>
            </tr>
            <tr>
              <td>Anthropic (Claude API)</td>
              <td>Receives your question and country, researches the law and writes the answer</td>
              <td>
                <a href="https://www.anthropic.com/legal/privacy" rel="noopener">
                  Anthropic privacy policy
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
