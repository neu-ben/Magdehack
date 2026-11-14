import { redirect } from "next/navigation";

// Alte Adresse: Die Sprachübergabe liegt jetzt unter /schicht/uebergabe
export default function AufnahmeAlt() {
  redirect("/schicht/uebergabe");
}
