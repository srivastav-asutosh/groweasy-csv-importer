import { ImportWizard } from "@/components/ImportWizard";
import { SiteHeader } from "@/components/SiteHeader";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <ImportWizard />
      </main>
    </div>
  );
}
