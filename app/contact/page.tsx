import type { Metadata } from "next";
import { SubPage, CONTACT_EMAIL } from "@/components/SiteChrome";

export const metadata: Metadata = { title: "Contact · Legalcheck" };

export default function Contact() {
  return (
    <SubPage current="contact">
      <h1>Contact</h1>
      <p className="lead">Report a wrong answer, suggest a popular check, or ask a question.</p>

      <div className="cards">
        <div className="card">
          <h3>Report a wrong answer</h3>
          <p>Tell us the activity and country, what looks wrong, and a link to the law or an official source if you have one.</p>
        </div>
        <div className="card">
          <h3>Suggest a check</h3>
          <p>Know a question lots of people ask? Send the activity and country and we may add it to the popular checks.</p>
        </div>
        <div className="card">
          <h3>Anything else</h3>
          <p>Questions about the site or your privacy are welcome too.</p>
        </div>
      </div>

      <h2>Email</h2>
      <p>
        Write to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
      <p className="muted">
        We can’t give legal advice about your personal situation. Please don’t send case files, ID documents or other
        people’s personal information.
      </p>
    </SubPage>
  );
}
