import type { Metadata } from "next";
import Link from "next/link";
import { SubPage, OWNER } from "@/components/SiteChrome";

export const metadata: Metadata = { title: "About · Legalcheck" };

export default function About() {
  return (
    <SubPage current="about">
      <h1>About Legalcheck</h1>
      <p className="lead">
        We help people find out quickly whether an everyday activity is legal in a given country, and which laws say so.
      </p>

      <h2>Why this exists</h2>
      <p>
        Laws differ from country to country and change every year. Whether you’re travelling, moving or just curious, it’s
        hard to find a straight answer to “am I allowed to do this here?” without wading through legal texts. Legalcheck
        gives you that answer in plain language, with the laws behind it, so you know where you stand.
      </p>

      <h2>What you can do</h2>
      <div className="cards">
        <div className="card">
          <h3>Ask about an activity</h3>
          <p>Describe what you want to do in your own words and pick a country.</p>
        </div>
        <div className="card">
          <h3>Get a straight answer</h3>
          <p>Legal, illegal, or legal with conditions, with the conditions, penalties and regional differences.</p>
        </div>
        <div className="card">
          <h3>Check the law yourself</h3>
          <p>Every answer lists the acts and sections it’s based on, with links to the source where available.</p>
        </div>
      </div>

      <h2>How answers are made</h2>
      <p>
        Each answer is researched by a human and uses current public legal sources, preferring
        official legislation databases and government websites, and summarises it in plain language. Answers are re-checked at
        least twice a year so new acts and amendments are picked up, and the date of the last check is shown with every answer.
        When you search, everything happens in your browser.
      </p>

      <h2>What this site is not</h2>
      <ul className="list">
        <li>
          <strong>Not legal advice.</strong> It’s general information to help you understand the law, not advice for your
          situation. For anything serious, talk to a qualified lawyer.
        </li>
        <li>
          <strong>Not always right.</strong> Answers are written by AI from public sources and can be wrong, incomplete or
          out of date. Always check the cited law when it matters.
        </li>
        <li>
          <strong>Not complete.</strong> Answers are researched in advance, so not every activity and country is covered yet.
          Missing one? <Link href="/contact">Suggest it</Link>.
        </li>
        <li>
          <strong>Not local.</strong> Answers cover national law, with notes on regional differences. City and municipal
          rules can be stricter.
        </li>
        <li>
          <strong>Not a defence.</strong> “Legalcheck said it was fine” won’t help you with the police or in court.
        </li>
      </ul>

      <h2>Free to use</h2>
      <p>Checking is free and needs no account. There are no ads, no cookies and no tracking.</p>

      <h2>Who runs it</h2>
      <p>
        Legalcheck is an independent project run by {OWNER}, based in the Netherlands. It is not affiliated with any
        government, court or law firm.
      </p>
      <p>
        Questions or corrections? Use the <Link href="/contact">contact page</Link>.
      </p>
    </SubPage>
  );
}
