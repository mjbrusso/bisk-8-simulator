import MemoryModel from "../models/memory";

export class InvalidMemoryImageError extends Error {
  constructor() {
    super("A imagem de memória deve conter endereços e valores em hexadecimal maiúsculo, com dois dígitos.");
    this.name = "InvalidMemoryImageError";
  }
}

export function parseMemoryImage(contents: string): MemoryModel {
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
    typeof parsed.data !== "object" ||
    parsed.data === null ||
    Array.isArray(parsed.data)
  ) {
    throw new InvalidMemoryImageError();
  }

  const data = Array<number>(256).fill(0);
  for (const [address, value] of Object.entries(parsed.data)) {
    if (!/^[0-9A-F]{2}$/.test(address) || typeof value !== "string" || !/^[0-9A-F]{2}$/.test(value)) {
      throw new InvalidMemoryImageError();
    }

    data[Number.parseInt(address, 16)] = Number.parseInt(value, 16);
  }

  return new MemoryModel(data);
}

export function serializeMemoryImage(memory: MemoryModel): string {
  const entries = memory.data.flatMap((value, address) => {
    const byte = value & 0xff;
    if (byte === 0) return [];

    const key = address.toString(16).toUpperCase().padStart(2, "0");
    const hexValue = byte.toString(16).toUpperCase().padStart(2, "0");
    return [`${JSON.stringify(key)}:${JSON.stringify(hexValue)}`];
  });

  return `{"data":{${entries.join(",")}}}`;
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
              "application/json": [".b8"],
            },
          },
        ],
        excludeAcceptAllOption: true,
      });
    }

    const writable = await this.fileHandle.createWritable();
    await writable.write(serializeMemoryImage(memory));
    await writable.close();
  }

  download(memory: MemoryModel, fileName: string) {
    const blob = new Blob([serializeMemoryImage(memory)], {
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
    await navigator.clipboard.writeText(serializeMemoryImage(memory));
  }

  async paste(): Promise<MemoryModel> {
    return parseMemoryImage(await navigator.clipboard.readText());
  }

  async upload(): Promise<MemoryModel | null> {
    const file = await new Promise<File | null>((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".b8";
      input.onchange = () => resolve(input.files?.[0] ?? null);
      input.addEventListener("cancel", () => resolve(null), { once: true });
      input.click();
    });

    if (!file) return null;
    return parseMemoryImage(await file.text());
  }
}

export default new MemoryImageService();
