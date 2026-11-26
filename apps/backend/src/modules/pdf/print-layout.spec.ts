import { getDesktopPrintLayout } from "./print-layout";

describe("desktop print layout", () => {
  it("prints the selected paper, landscape orientation and independent margins", () => {
    const { styles, pdfOptions } = getDesktopPrintLayout({
      format: "legal",
      orientation: "landscape",
      margins: { top: " 12MM ", right: "1in", bottom: "0", left: "20.5mm" },
      pageColor: "#FFF7E6",
      showHeaderFooter: true,
      pageNumberAlign: "right",
      showTotalPages: false,
    });

    expect(styles).toContain("margin: 12mm 1in 0 20.5mm;");
    expect(styles).toContain("background: #fff7e6;");
    expect(pdfOptions).toMatchObject({
      pageSize: "Legal",
      landscape: true,
      printBackground: true,
      displayHeaderFooter: true,
    });
    expect(pdfOptions.footerTemplate).toContain("justify-content: flex-end;");
    expect(pdfOptions.footerTemplate).toContain('class="pageNumber"');
    expect(pdfOptions.footerTemplate).not.toContain("totalPages");
  });

  it("uses safe defaults for invalid paper, orientation, color and margin values", () => {
    const { styles, pdfOptions } = getDesktopPrintLayout({
      format: "constructor",
      orientation: true,
      pageColor: "#abc; color: red",
      margins: { top: "0; color: red", right: "-1mm", bottom: "auto" },
    });

    expect(styles).toContain("margin: 20mm 20mm 20mm 20mm;");
    expect(styles).toContain("background: #ffffff;");
    expect(styles).not.toContain("color: red");
    expect(pdfOptions).toMatchObject({
      pageSize: "A4",
      landscape: false,
      displayHeaderFooter: false,
    });
  });
});
