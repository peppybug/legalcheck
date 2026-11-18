import Link from "next/link";
import { COUNTRIES } from "@/lib/countries";

export const CONTACT_EMAIL = "contactolivierjanssen@gmail.com";
export const OWNER = "Olivier B Janssen";

type Page = "home" | "about" | "contact" | "privacy" | "terms" | "laws";

function Logo() {
  return (
    <Link className="logo" href="/" aria-label="Legalcheck home">
      <i aria-hidden="true">§</i>
      <span>Legalcheck</span>
    </Link>
  );
}

export function SiteHeader({ current }: { current: Page }) {
  const cur = (p: Page) => (current === p ? ("page" as const) : undefined);
  return (
    <header className="site">
      <div className="wrap bar">
        <Logo />
        <nav aria-label="Main">
          <ul>
            <li className="hide-sm">
              <Link href="/#how">How it works</Link>
            </li>
            <li>
              <Link href="/#check">Popular</Link>
            </li>
            <li>
              <Link href="/laws" aria-current={cur("laws")}>
                Law library
              </Link>
            </li>
            <li className="hide-sm">
              <Link href="/#faq">FAQ</Link>
            </li>
            <li>
              <Link href="/about" aria-current={cur("about")}>
                About
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site">
      <div className="wrap">
        <div className="foot">
          <div>
            <Logo />
            <p className="tag">Before you do it, check the law.</p>
          </div>
          <div>
            <h2>Product</h2>
            <ul>
              <li>
                <Link href="/#how">How it works</Link>
              </li>
              <li>
                <Link href="/#check">Popular checks</Link>
              </li>
              <li>
                <Link href="/laws">Law library</Link>
              </li>
              <li>
                <Link href="/#faq">FAQ</Link>
              </li>
            </ul>
          </div>
          <div>
            <h2>Company</h2>
            <ul>
              <li>
                <Link href="/about">About</Link>
              </li>
              <li>
                <Link href="/contact">Contact</Link>
              </li>
            </ul>
          </div>
          <div>
            <h2>Legal</h2>
            <ul>
              <li>
                <Link href="/privacy">Privacy policy</Link>
              </li>
              <li>
                <Link href="/terms">Terms of use</Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="fine">
          © 2026 Legalcheck. Covers {COUNTRIES.length} countries. Answers are based on public sources, researched with AI,
          and may be incomplete or out of date. Not legal advice.
        </p>
      </div>
    </footer>
  );
}

export function SubPage({ current, children }: { current: Page; children: React.ReactNode }) {
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <SiteHeader current={current} />
      <main id="main" className="page">
        <div className="wrap narrow">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}
