import MemoryModel from "../models/memory";

export class InvalidMemoryImageError extends Error {
  constructor() {
    super("A imagem de memória deve conter 256 valores de 8 bits.");
    this.name = "InvalidMemoryImageError";
  }
}

function parseMemoryImage(contents: string): MemoryModel {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new InvalidMemoryImageError();
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("data" in parsed) ||
    !Array.isArray(parsed.data) ||
    parsed.data.length !== 256 ||
    !parsed.data.every(
      (value: unknown): value is number =>
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= -128 &&
        value <= 255
    )
  ) {
    throw new InvalidMemoryImageError();
  }

  return new MemoryModel(parsed.data);
}

class MemoryImageService {
  private fileHandle: FileSystemFileHandle | null = null;

  clearFileHandle() {
    this.fileHandle = null;
  }

  async save(memory: MemoryModel, fileName: string) {
    if (!("showSaveFilePicker" in self)) {
      this.download(memory, fileName);
      return;
    }

    if (!this.fileHandle) {
      this.fileHandle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: "Memória do Bisk-8",
            accept: {
              "application/json": [".json"],
            },
          },
        ],
        excludeAcceptAllOption: true,
      });
    }

    const writable = await this.fileHandle.createWritable();
    await writable.write(JSON.stringify(memory));
    await writable.close();
  }

  download(memory: MemoryModel, fileName: string) {
    const blob = new Blob([JSON.stringify(memory)], {
      type: "application/json",
    });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  }

  async copy(memory: MemoryModel) {
    await navigator.clipboard.writeText(JSON.stringify(memory));
  }

  async paste(): Promise<MemoryModel> {
    return parseMemoryImage(await navigator.clipboard.readText());
  }

  async upload(): Promise<MemoryModel | null> {
    const file = await new Promise<File | null>((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = () => resolve(input.files?.[0] ?? null);
      input.addEventListener("cancel", () => resolve(null), { once: true });
      input.click();
    });

    if (!file) return null;
    return parseMemoryImage(await file.text());
  }
}

export default new MemoryImageService();
