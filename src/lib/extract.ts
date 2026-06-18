"use client";

export interface ExtractResult {
  text: string;
  fileName: string;
  fileType: string;
  isImage: boolean;
  note?: string;
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // Worker is copied into /public during setup.
  (pdfjs as any).GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const buf = await file.arrayBuffer();
  const doc = await (pdfjs as any).getDocument({ data: buf }).promise;
  let text = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it: any) => it.str).join(" ") + "\n";
  }
  return text.trim();
}

async function extractDocx(file: File): Promise<string> {
  const mammoth: any = await import("mammoth/mammoth.browser.js").catch(
    () => import("mammoth")
  );
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return String(result.value || "").trim();
}

/** Extract plain text from an uploaded assessment file. */
export async function extractText(file: File): Promise<ExtractResult> {
  const name = file.name;
  const lower = name.toLowerCase();
  const base: Omit<ExtractResult, "text"> = {
    fileName: name,
    fileType: file.type || lower.split(".").pop() || "file",
    isImage: file.type.startsWith("image/"),
  };

  try {
    if (file.type.startsWith("image/")) {
      return {
        ...base,
        text: "",
        note: "Image saved. Paste or type the notification text below so the AI can analyse it.",
      };
    }
    if (lower.endsWith(".pdf") || file.type === "application/pdf") {
      const text = await extractPdf(file);
      return { ...base, text, note: text ? undefined : "Could not read text from this PDF — paste it below." };
    }
    if (lower.endsWith(".docx")) {
      return { ...base, text: await extractDocx(file) };
    }
    // txt, md, rtf, csv, anything text-like
    return { ...base, text: await readAsText(file) };
  } catch (e) {
    return {
      ...base,
      text: "",
      note: "Could not read this file automatically — paste the text below instead.",
    };
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
