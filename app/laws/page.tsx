import type { Metadata } from "next";
import { SubPage } from "@/components/SiteChrome";
import Library from "@/components/Library";

export const metadata: Metadata = {
  title: "Law library · Legalcheck",
  description: "Where each country publishes its laws, the laws behind our answers, and every answer by country.",
};

export default function LawsPage() {
  return (
    <SubPage current="laws">
      <h1>Law library</h1>
      <p className="lead">
        Where each country officially publishes its laws, the specific laws our answers rely on, and every answer we have for
        that country.
      </p>
      <Library />
    </SubPage>
  );
}
