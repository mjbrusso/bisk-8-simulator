import MemoryModel from "../models/memory";
import RegisterFile from "../models/registerFile";
import MemoryTable from "../components/MemoryTable/MemoryTable";
import { useState } from "react";

interface MemoryProps {
  memory: MemoryModel;
  setMemory: (memory: MemoryModel) => void;
  file: RegisterFile;
  onManualMemoryChange: () => void;
}

function Memory({
  memory,
  setMemory,
  file,
  onManualMemoryChange,
}: MemoryProps) {
  const [currentField, setCurrentField] = useState<number | undefined>(
    undefined
  );

  return (
    <MemoryTable
      memory={memory}
      setMemory={setMemory}
      file={file}
      setCurrentField={setCurrentField}
      onManualMemoryChange={onManualMemoryChange}
    />
  );
}

export default Memory;
