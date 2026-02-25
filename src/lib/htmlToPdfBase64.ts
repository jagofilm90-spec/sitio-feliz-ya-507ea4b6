import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Converts an HTML string (like the OC template) into a high-quality PDF
 * and returns the base64-encoded PDF content.
 */
export const htmlToPdfBase64 = async (htmlContent: string): Promise<string> => {
  // Create a hidden container to render the HTML
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "8.5in";
  container.style.backgroundColor = "#ffffff";
  document.body.appendChild(container);

  // Use an iframe to isolate styles
  const iframe = document.createElement("iframe");
  iframe.style.width = "8.5in";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.position = "absolute";
  iframe.style.left = "-9999px";
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error("Could not access iframe document");

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    // Wait for content to render (images, fonts, etc.)
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Auto-size iframe to content height
    const body = iframeDoc.body;
    const html = iframeDoc.documentElement;
    const contentHeight = Math.max(
      body.scrollHeight,
      body.offsetHeight,
      html.scrollHeight,
      html.offsetHeight
    );
    iframe.style.height = `${contentHeight}px`;

    // Wait a bit more for resize
    await new Promise((resolve) => setTimeout(resolve, 200));

    const canvas = await html2canvas(iframeDoc.body, {
      scale: 3,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: iframeDoc.body.scrollWidth,
      height: contentHeight,
      windowWidth: iframeDoc.body.scrollWidth,
      windowHeight: contentHeight,
    });

    // Create PDF - letter size
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgData = canvas.toDataURL("image/png");
    const imgWidth = pdfWidth - 10; // 5mm margin on each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // If content fits in one page
    if (imgHeight <= pdfHeight - 10) {
      pdf.addImage(imgData, "PNG", 5, 5, imgWidth, imgHeight);
    } else {
      // Multi-page: split the canvas
      const pageContentHeight = pdfHeight - 10; // 5mm top + 5mm bottom margin
      const totalPages = Math.ceil(imgHeight / pageContentHeight);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();

        const sourceY = (page * pageContentHeight * canvas.width) / imgWidth;
        const sourceHeight = Math.min(
          (pageContentHeight * canvas.width) / imgWidth,
          canvas.height - sourceY
        );

        // Create a canvas slice for this page
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sourceHeight;
        const ctx = pageCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0, sourceY,
            canvas.width, sourceHeight,
            0, 0,
            canvas.width, sourceHeight
          );
        }

        const pageImgData = pageCanvas.toDataURL("image/png");
        const sliceHeight = (sourceHeight * imgWidth) / canvas.width;
        pdf.addImage(pageImgData, "PNG", 5, 5, imgWidth, sliceHeight);
      }
    }

    return pdf.output("datauristring").split(",")[1];
  } finally {
    document.body.removeChild(iframe);
  }
};
