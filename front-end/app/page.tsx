import PdfConverter from "@/app/components/pdf-converter";

export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero-grid">
        <div className="hero-copy">
          <p className="hero-copy__eyebrow">DocPDF / REST converter</p>
          <h1>Turn public pages and working docs into clean PDFs in one pass.</h1>
          <p className="hero-copy__lede">
            Chromium handles web rendering. LibreOffice handles office documents. Every
            request is stateless, immediate, and cleaned up after download.
          </p>
          <div className="hero-proof">
            <div>
              <span>Renderer split</span>
              <strong>Chromium + LibreOffice</strong>
            </div>
            <div>
              <span>Delivery model</span>
              <strong>Instant download only</strong>
            </div>
            <div>
              <span>Storage model</span>
              <strong>Ephemeral by default</strong>
            </div>
          </div>
        </div>

        <PdfConverter />
      </section>
    </main>
  );
}
