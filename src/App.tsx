import Header from "./components/Header/Header";
import Memory from "./pages/Memory";
import { useCallback, useEffect, useState } from "react";
import RegisterFile from "./models/registerFile";
import InstructionSet from "./models/instructionSet";
import { searchAddress, searchInstruction } from "./services/operations";
import Simulation from "./pages/Simulation";
import toolbarStyles from "./components/Toolbar/Toolbar.module.css";
import MemoryModel from "./models/memory";
import ISA from "./pages/ISA";
import AboutDialog from "./components/AboutDialog/AboutDialog";
import memoryImageService, {
  InvalidMemoryImageError,
} from "./services/memoryImageService";

enum Phase {
  searchInstruction,
  searchAddress,
  executeInstruction,
}

let phase: Phase = Phase.searchInstruction;
let cicle: number = 0;
let inMiddleInst: boolean = false;
let unsavedChanges: boolean = false;

// Variáveis com uso mais frequente que renderização
let currentMemory = new MemoryModel();
let currentRunning = false;
let currentClock = 1;
let currentIOBegin = 0xf0;
let currentIOEnd = 0xff;

let port: SerialPort | null = null;
let reader: ReadableStreamDefaultReader<string> | null = null;
let writer: WritableStreamDefaultWriter<string> | null = null;

function App() {
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("bisk8-theme") === "dark"
  );
  const [registers, setRegisters] = useState<RegisterFile>(new RegisterFile());
  const [memory, setMemory] = useState<MemoryModel>(new MemoryModel());
  const [manualMemoryModified, setManualMemoryModified] = useState(false);
  const [highlightInstructionRegister, setHighlightInstructionRegister] =
    useState(false);
  const [rtl, setRtl] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [clock, setClock] = useState(1);
  const [connected, setConnected] = useState(false);
  const [IOBegin, setIOBegin] = useState<number>(0xf0);
  const [IOEnd, setIOEnd] = useState<number>(0xff);
  const [aboutOpen, setAboutOpen] = useState(false);
  const isa = new InstructionSet();

  function isCPUHalted(): boolean {
    if (registers.registers["Halted"].value === 1) {
      alert("🔴 Halted!\nNão é possível executar sem reiniciar.\n\nO que você pode fazer:\n  1. Recarregar o programa atual para executar novamente.\n  2. Limpar tudo e digitar um novo programa.\n");
      return true;
    }

    return false;
  }

  function runCycleByCycle() {
    if (isCPUHalted()) {
      return;
    }

    setHighlightInstructionRegister(true);
    const newRegisters = registers.clone();
    const newRtl: string[] = [...rtl];
    inMiddleInst = true;

    if (phase === Phase.searchInstruction) {
      const length = searchInstruction.length;
      if (cicle == 0) newRtl.push("#Busca do opcode");

      newRtl.push(searchInstruction[cicle](newRegisters, currentMemory));

      // Testa se terminou fase
      if (cicle === length - 1) {
        // Determina instrução para saber se precisa buscar endereço
        const instruction =
          isa.instructions[newRegisters.registers["IR"].value];

        cicle = 0;
        if (instruction.requiresAddress) {
          phase = Phase.searchAddress;
        } else {
          phase = Phase.executeInstruction;
        }
      } else {
        cicle++;
      }
    } else if (phase === Phase.searchAddress) {
      const length = searchAddress.length;
      if (cicle == 0) newRtl.push("#Busca do operando");

      newRtl.push(searchAddress[cicle](newRegisters, currentMemory));

      // Testa se terminou fase
      if (cicle === length - 1) {
        cicle = 0;
        phase = Phase.executeInstruction;
      } else {
        cicle++;
      }
    } else {
      const instruction = isa.instructions[newRegisters.registers["IR"].value];

      const length = instruction.operation.length;

      if (cicle == 0) newRtl.push("#Execução da instrução");

      newRtl.push(instruction.operation[cicle](newRegisters, currentMemory));

      // Testa se terminou fase
      if (cicle === length - 1) {
        cicle = 0;
        phase = Phase.searchInstruction;
        inMiddleInst = false;
      } else {
        cicle++;
      }
    }

    // Atualiza estado para refletir na interface
    setRegisters(newRegisters);
    setMemory(currentMemory);
    setRtl(newRtl);
  }

  function runInstByInst() {
    if (isCPUHalted()) {
      return;
    }
    setHighlightInstructionRegister(false);
    const newRegisters = registers.clone();
    const newRtl: string[] = [...rtl];

    runInstruction(newRegisters, currentMemory, newRtl);

    // Atualiza estado para refletir na interface
    setRegisters(newRegisters);
    setMemory(currentMemory);
    setRtl(newRtl);
  }

  function hasState(): boolean {
    // Identifica se algum registrador tem valor
    for (const register in registers.registers) {
      if (registers.registers[register].value !== 0) return true;
    }
    return false;
  }

  function stopExecution() {
    setRunning(false);
    currentRunning = false;
  }

  async function runAll() {
    if (isCPUHalted()) {
      return;
    }

    const newRegisters = new RegisterFile();
    const newRtl: string[] = [];

    // Confirma limpeza de estado
    if (
      hasState() &&
      !window.confirm(
        "Ao executar tudo, os registradores serão resetados. Deseja continuar?"
      )
    ) {
      return;
    }

    setHighlightInstructionRegister(false);

    // Ativa flag de executando
    setRunning(true);
    currentRunning = true;

    try {
      do {
        const startTime = performance.now();
        runInstruction(newRegisters, currentMemory, newRtl);
        const elapsedTime = performance.now() - startTime;

        const clockPeriod = 1000 / currentClock;
        const delayTime = clockPeriod - elapsedTime;

        // Clock
        await new Promise((resolve) =>
          setTimeout(resolve, Math.max(0, delayTime))
        );

        // Atualiza estado para refletir na interface
        setRegisters(newRegisters);
        setMemory(currentMemory);
        // Mostra apenas 100 últimos passos
        setRtl(newRtl.slice(-100));
      } while (newRegisters.registers["Halted"].value !== 1 && currentRunning);
    } finally {
      stopExecution();
    }
  }

  function runInstruction(
    newRegisters: RegisterFile,
    newMemory: MemoryModel,
    newRtl: string[]
  ) {
    newRtl.push("#Busca do opcode");
    // Realiza etapas de busca de instrução
    searchInstruction.forEach((cicle) => {
      newRtl.push(cicle(newRegisters, newMemory));
    });

    const instruction = isa.instructions[newRegisters.registers["IR"].value];

    // Realiza etapas de busca de endereço (instruções de 2 bytes)
    if (instruction.requiresAddress) {
      newRtl.push("#Busca do endereço");
      searchAddress.forEach((cicle) => {
        newRtl.push(cicle(newRegisters, newMemory));
      });
    }

    newRtl.push("#Execução da instrução");
    // Executa operação da instrução
    instruction.operation.forEach((cicle) => {
      newRtl.push(cicle(newRegisters, newMemory));
    });
  }

  function clear() {
    cicle = 0;
    memoryImageService.clearFileHandle();
    inMiddleInst = false;
    setManualMemoryModified(false);
    setRegisters(new RegisterFile());
    currentMemory.clear();
    setMemory(currentMemory);
    setRtl([]);
  }

  function getCurrentDateTime() {
    const now = new Date();

    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are zero-based
    const year = now.getFullYear();

    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    return `${day}-${month}-${year} ${hours}-${minutes}`;
  }

  async function save() {
    await memoryImageService.save(
      memory,
      "Bisk-8 Memory " + getCurrentDateTime() + ".json"
    );
    setManualMemoryModified(false);
    unsavedChanges = false;
  }

  async function copyMemory() {
    try {
      await memoryImageService.copy(memory);
    } catch (error) {
      alert("Não foi possível copiar a memória para a área de transferência.");
      console.error("Error copying memory to clipboard:", error);
    }
  }

  const confirmMemoryReplacement = useCallback(() => {
    if (
      manualMemoryModified &&
      !window.confirm(
        "Ao carregar uma imagem de memória, as modificações feitas na memória que não foram salvas serão perdidas.\nDeseja continuar?"
      )
    ) {
      return false;
    }

    return true;
  }, [manualMemoryModified]);

  async function uploadMemory() {
    if (!confirmMemoryReplacement()) return;

    try {
      const newMemory = await memoryImageService.upload();
      if (newMemory) loadMemoryImage(newMemory);
    } catch (error) {
      if (error instanceof InvalidMemoryImageError) {
        alert("O arquivo não contém uma imagem de memória válida.");
      } else {
        alert("Ocorreu um erro ao fazer upload do arquivo!");
        console.error("Error uploading memory:", error);
      }
    }
  }

  const clearRegisters = useCallback(() => {
    cicle = 0;
    inMiddleInst = false;
    setRegisters(new RegisterFile());
    setRtl([]);
  }, []);

  async function openConnection() {
    if (port) {
      reader!.cancel();
      writer!.close();

      setTimeout(async () => {
        await port!.close();
        setConnected(false);
        port = null;
        writer = null;
        reader = null;
      }, 100);

      return;
    }
    try {
      port = await navigator.serial.requestPort();
      await port.open({ baudRate: 9600 });

      const textEncoder = new TextEncoderStream();
      textEncoder.readable.pipeTo(port.writable!);
      writer = textEncoder.writable.getWriter();

      const textDecoder = new TextDecoderStream();
      port.readable!.pipeTo(textDecoder.writable);
      reader = textDecoder.readable.getReader();

      setConnected(true);

      readSerialData();
    } catch (error) {
      if ((error as DOMException).name == "NotFoundError") return;

      setConnected(false);
      alert("Erro ao abrir conexão serial!");
      console.error("Error connecting to serial port:", error);
    }
  }

  async function readSerialData() {
    if (!reader) return;

    try {
      let buffer = "";

      while (port!.readable) {
        const { value, done } = await reader.read();
        if (done) {
          reader.releaseLock();
          break;
        }

        if (value) {
          buffer += value;

          let newlineIndex = buffer.indexOf("\n");
          while (newlineIndex !== -1 && port!.readable) {
            const message = buffer.slice(0, newlineIndex).trim();
            handleSerialRequest(message);
            buffer = buffer.slice(newlineIndex + 1);
            newlineIndex = buffer.indexOf("\n");
          }
        }
      }
    } catch (error) {
      setConnected(false);
      console.error("Error reading serial data:", error);
    }
  }

  function handleSerialRequest(message: string) {
    // Operação (0 read, 1 write) + endereço 8 bits hexa
    // + [valor 8 bits hexa] e \n no final

    // Regex para validar mensagem
    const regex = /^(0[\da-fA-F]{2}|1[\da-fA-F]{4})$/;

    if (regex.test(message)) {
      const data = message.split("");

      // Endereço para escrita ou leitura com offset do início de IO
      const operation = parseInt(data[0]);
      const address = currentIOBegin + parseInt(data[1] + data[2], 16);

      if (address < currentIOBegin || address > currentIOEnd) {
        console.error(`Endereço fora do intervalo de IO: ${address}!`);
        return;
      }

      // Escrita
      if (operation === 0x01 && data.length >= 4) {
        const value = parseInt(data[3] + data[4], 16);

        const newMemory = currentMemory.clone();
        newMemory.data[address] = value;

        setMemoryChange(newMemory);

        // console.log(`Write: Memory[${address}] = ${value}`);
      }
      // Leitura
      else if (operation === 0x00) {
        const valueToSend: number = currentMemory.data[address];
        sendDataToSerial(
          `${valueToSend.toString(16).padStart(2, "0").toUpperCase()}\n`
        );

        // console.log(`Read: Memory[${address}] = ${valueToSend}`);
      }
    } else {
      console.error(`Invalid message received: ${message}`);
    }
  }

  async function sendDataToSerial(data: string) {
    if (writer) {
      await writer.write(data);
    }
  }

  const setMemoryChange = useCallback((memory: MemoryModel) => {
    currentMemory = memory;
    setMemory(currentMemory);
  }, []);

  const loadMemoryImage = useCallback((newMemory: MemoryModel) => {
    setMemoryChange(newMemory);
    setManualMemoryModified(false);
    clearRegisters();
  }, [clearRegisters, setMemoryChange]);

  const pasteMemory = useCallback(async () => {
    if (!confirmMemoryReplacement()) return;

    try {
      loadMemoryImage(await memoryImageService.paste());
    } catch (error) {
      if (error instanceof InvalidMemoryImageError) {
        alert("A área de transferência não contém uma imagem de memória válida.");
      } else {
        alert("Não foi possível acessar a área de transferência.");
        console.error("Error pasting memory from clipboard:", error);
      }
    }
  }, [confirmMemoryReplacement, loadMemoryImage]);

  function toggleTheme() {
    setDarkMode((current) => {
      const next = !current;
      localStorage.setItem("bisk8-theme", next ? "dark" : "light");
      return next;
    });
  }

  // Avisa de saída sem salvar
  useEffect(() => {
    unsavedChanges = true;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (unsavedChanges) {
        event.preventDefault();
        return "Você tem certeza que deseja sair?";
      }
    };

    if (memory.data.some((value) => value !== 0))
      window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [memory]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target;
      const isEditable =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.matches("input, textarea, select"));

      if (
        !(event.ctrlKey || event.metaKey) ||
        event.key.toLowerCase() !== "v" ||
        event.altKey ||
        event.shiftKey ||
        isEditable
      ) {
        return;
      }

      event.preventDefault();
      void pasteMemory();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pasteMemory]);

  const canStepInstruction = !inMiddleInst;

  const toolbarActions = [
    {
      id: "memory-clear",
      align: "left" as const,
      element: (
        <button className={toolbarStyles.button} onClick={clear} title="Limpar">
          <span className="material-symbols-outlined">delete</span>
        </button>
      ),
    },
    {
      id: "memory-upload",
      align: "left" as const,
      element: (
        <button
          className={toolbarStyles.button}
          onClick={uploadMemory}
          title="Abrir arquivo de memória"
        >
          <span className="material-symbols-outlined">upload_file</span>
        </button>
      ),
    },
    {
      id: "memory-save",
      align: "left" as const,
      element: (
        <button className={toolbarStyles.button} onClick={save} title="Salvar memória">
          <span className="material-symbols-outlined">save</span>
        </button>
      ),
    },
    {
      id: "memory-copy",
      align: "left" as const,
      element: (
        <button
          className={toolbarStyles.button}
          onClick={copyMemory}
          title="Copiar memória para a área de transferência"
          aria-label="Copiar memória para a área de transferência"
        >
          <span className="material-symbols-outlined">content_copy</span>
        </button>
      ),
    },
    {
      id: "simulation-reset",
      align: "left" as const,
      element: (
        <button
          className={toolbarStyles.button}
          onClick={clearRegisters}
          title="Resetar registradores"
        >
          <span className="material-symbols-outlined">restart_alt</span>
        </button>
      ),
    },
    {
      id: "simulation-clock",
      align: "left" as const,
      element: (
        <div className={toolbarStyles.dropdown}>
          <button className={toolbarStyles.button} title="Alterar clock">
            <span className="material-symbols-outlined">schedule</span>
          </button>

          <div className={toolbarStyles.dropdownContent}>
            {[4100, 2000, 1000, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1, 0.5, 0.25].map(
              (option) => (
                <a
                  key={option}
                  className={option == clock ? toolbarStyles.selected : ""}
                  onClick={() => {
                    setClock(option);
                    currentClock = option;
                  }}
                >
                  {option >= 1000 ? (option / 1000).toLocaleString() : option}
                  <span> </span>
                  {option >= 1000 ? "KHz" : "Hz"}
                </a>
              )
            )}
          </div>
        </div>
      ),
    },
    {
      id: "memory-run-all",
      align: "left" as const,
      element: running ? (
        <button className={toolbarStyles.button} onClick={stopExecution} title="Parar">
          <span className="material-symbols-outlined">stop</span>
        </button>
      ) : (
        <button className={toolbarStyles.button} onClick={runAll} title="Executar tudo">
          <span className="material-symbols-outlined">play_arrow</span>
        </button>
      ),
    },
    {
      id: "memory-step-over",
      align: "left" as const,
      element: (
        <button
          type="button"
          className={toolbarStyles.button}
          onClick={runInstByInst}
          disabled={!canStepInstruction}
          title={
            canStepInstruction
              ? "Executar instrução por instrução"
              : "Executar instrução por instrução indisponível"
          }
        >
          <span className="material-symbols-outlined">step_over</span>
        </button>
      ),
    },
    {
      id: "memory-step-into",
      align: "left" as const,
      element: (
        <button className={toolbarStyles.button} onClick={runCycleByCycle} title="Executar ciclo por ciclo">
          <span className="material-symbols-outlined">step_into</span>
        </button>
      ),
    },
    {
      id: "theme-toggle",
      align: "right" as const,
      element: (
        <button
          className={toolbarStyles.button}
          onClick={toggleTheme}
          title={darkMode ? "Ativar modo claro" : "Ativar modo escuro"}
          aria-label={darkMode ? "Ativar modo claro" : "Ativar modo escuro"}
          aria-pressed={darkMode}
        >
          <span className="material-symbols-outlined">
            {darkMode ? "light_mode" : "dark_mode"}
          </span>
        </button>
      ),
    },
    {
      id: "about",
      align: "right" as const,
      element: (
        <button className={toolbarStyles.button} onClick={() => setAboutOpen(true)} title="Sobre">
          <span className="material-symbols-outlined">info</span>
        </button>
      ),
    },
  ];

  return (
    <div id="app" data-theme={darkMode ? "dark" : "light"}>
      <Header
        openConnection={"serial" in navigator ? openConnection : null}
        connected={connected}
        IOBegin={IOBegin}
        setIOBegin={(begin) => {
          setIOBegin(begin);
          currentIOBegin = begin;
        }}
        IOEnd={IOEnd}
        setIOEnd={(end) => {
          setIOEnd(end);
          currentIOEnd = end;
        }}
        toolbarActions={toolbarActions}
      />
      <main>
        <section>
          <Memory
            memory={memory}
            setMemory={setMemoryChange}
            file={registers}
            onManualMemoryChange={() => setManualMemoryModified(true)}
          />
        </section>
        <section>
          <Simulation registers={registers} isa={isa} rtl={rtl} />
        </section>
        <section>
          <ISA
            isa={isa}
            field={
              highlightInstructionRegister
                ? registers.registers["IR"].value
                : memory.data[registers.registers["PC"].value]
            }
          />
        </section>
      </main>
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}

export default App;
