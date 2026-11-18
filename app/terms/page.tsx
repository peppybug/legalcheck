import type { Metadata } from "next";
import Link from "next/link";
import { SubPage, CONTACT_EMAIL, OWNER } from "@/components/SiteChrome";

export const metadata: Metadata = { title: "Terms of use · Legalcheck" };

export default function Terms() {
  return (
    <SubPage current="terms">
      <h1>Terms of use</h1>
      <p className="updated">Last updated 18 November 2026</p>
      <p className="lead">By using this site you agree to these terms. They’re short.</p>

      <h2>What the site provides</h2>
      <p>
        Legalcheck provides AI-generated summaries of whether an activity is legal in a country, based on public legal sources,
        with references to the laws they rely on. It is free to use.
      </p>

      <h2>Not legal advice</h2>
      <ul className="list">
        <li>
          Answers are general information, not legal advice. They don’t take your personal situation into account and don’t
          create a lawyer–client relationship.
        </li>
        <li>
          Answers are written by AI and may be wrong, incomplete or out of date. Laws change, and local rules may differ from
          national law. Always check the cited source, and ask a qualified lawyer before relying on an answer for anything
          important.
        </li>
        <li>An answer saying something is legal is not permission to do it, and is no defence if it turns out to be wrong.</li>
        <li>
          The site is provided “as is”. To the extent the law allows, we are not liable for decisions made or actions taken based
          on it.
        </li>
      </ul>

      <h2>Fair use</h2>
      <p>
        Please don’t try to disrupt the site or use it to plan harm to others. You may quote and link to answers. If you reuse a
        large part of the answers, please credit this site and the original sources.
      </p>

      <h2>Corrections</h2>
      <p>
        If you think an answer is wrong, please <Link href="/contact">contact us</Link> with the activity, the country and a link
        to the law if you have one.
      </p>

      <h2>Who runs this site</h2>
      <p>
        {OWNER}, the Netherlands (<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>). These terms are governed by Dutch
        law.
      </p>
    </SubPage>
  );
}
