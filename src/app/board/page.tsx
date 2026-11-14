import { TabLeiste } from "@/components/AppRahmen";
import { Otti } from "@/components/Otti";

// Platzhalter: Das Stations-Board kommt im nächsten Schritt (siehe plan.md, Zeitplan 6:00–7:30).
export default function BoardPage() {
  return (
    <>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <Otti stimmung="denkt" groesse={150} wippen />
        <h1 className="text-2xl font-black">Stations-Board</h1>
        <p className="font-semibold text-grau">Hier sieht die übernehmende Schicht bald alle Patienten auf einen Blick.</p>
      </main>
      <TabLeiste />
    </>
  );
}
