import PdfConverter from "@/app/components/pdf-converter";

const PROOF_ITEMS = [
  {
    label: "Render split",
    value: "Chromium + LibreOffice",
  },
  {
    label: "Delivery",
    value: "Instant download",
  },
  {
    label: "Storage",
    value: "Ephemeral cleanup",
  },
] as const;

export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero-grid">
        <div className="hero-copy">
          <p className="hero-copy__eyebrow">DocPDF / REST converter</p>
          <p className="hero-copy__stamp">Public URLs + Working Docs</p>
          <div className="hero-copy__body">
            <h1>DocPDF turns public pages and working docs into sharp PDFs in one hit.</h1>
            <p className="hero-copy__lede">
              Chromium handles the web. LibreOffice handles office files. Every job is
              stateless, fast, and cleared the moment the download finishes.
            </p>
          </div>
          <div className="hero-proof" aria-label="Product highlights">
            {PROOF_ITEMS.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <PdfConverter />
      </section>
    </main>
  );
}
