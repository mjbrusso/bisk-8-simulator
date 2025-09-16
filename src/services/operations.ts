import Memory from "../models/memory";
import RegisterFile from "../models/registerFile";

// Busca instrução (ciclo 0 a 3)
// 0 MAR ← PC
// 1 MDR ← MEM[MAR]
// 2 PC ← PC + 1
// 3 IR ← MDR
export const searchInstruction = [
  (file: RegisterFile): string => {
    file.registers["MAR"].value = file.registers["PC"].value;
    return formatLogLine("MAR ← PC", "MARw, PCr");
  },
  (file: RegisterFile, memory: Memory): string => {
    file.registers["MDR"].value = memory.data[file.registers["MAR"].value];
    return formatLogLine("MDR ← MEM[MAR]", "CS, R, MDRwx");
  },
  (file: RegisterFile): string => {
    // Se PC chegou ao fim, volta para o início
    if (file.registers["PC"].value === 2 ** file.registers["PC"].bitLength - 1)
      file.registers["PC"].value = 0;
    else file.registers["PC"].value += 1;
    return formatLogLine("PC ← PC + 1", "PC+");
  },
  (file: RegisterFile): string => {
    file.registers["IR"].value = file.registers["MDR"].value & 0x0f;
    return formatLogLine("IR ← MDR", "MDRr, IRw");
  },
];

// Busca endereço (ciclo 4 a 6, intruções com endereço)
// 4 MAR ← PC
// 5 MDR ← MEM[MAR]
// 6 PC ← PC + 1
export const searchAddress = [
  (file: RegisterFile): string => {
    file.registers["MAR"].value = file.registers["PC"].value;
    return formatLogLine("MAR ← PC", "PCr, MARw");
  },
  (file: RegisterFile, memory: Memory): string => {
    file.registers["MDR"].value = memory.data[file.registers["MAR"].value];
    return formatLogLine("MDR ← MEM[MAR]", "CS, R, MDRwx");
  },
  (file: RegisterFile): string => {
    // Se PC chegou ao fim, volta para o início
    if (file.registers["PC"].value === 2 ** file.registers["PC"].bitLength)
      file.registers["PC"].value = 0;
    else file.registers["PC"].value += 1;
    return formatLogLine("PC ← PC + 1", "PC+");
  },
];

// Instrução NOP
export const nop = [
  (): string => {
    return formatLogLine("-");
  },
];

// Instrução LDA
// 7 MAR ← MDR
// 8 MDR ← MEM[MAR]
// 9 ACC  ← MDR
export const lda = [
  (file: RegisterFile): string => {
    file.registers["MAR"].value = file.registers["MDR"].value;
    return formatLogLine("MAR ← MDR", "MDRr, MARw");
  },
  (file: RegisterFile, memory: Memory): string => {
    file.registers["MDR"].value = toSigned8Bit(memory.data[file.registers["MAR"].value]);
    return formatLogLine("MDR ← MEM[MAR]", "CS, R, MDRwx");
  },
  (file: RegisterFile): string => {
    file.registers["ACC"].value = file.registers["MDR"].value;
    return formatLogLine("ACC ← MDR", "MDRr, ACCw");
  },
];

// Instrução STA
// 7 MAR ← MDR
// 8 MDR ← ACC
// 9 MEM[MAR] ← MDR
export const sta = [
  (file: RegisterFile): string => {
    file.registers["MAR"].value = file.registers["MDR"].value;
    return formatLogLine("MAR ← MDR", "MDRr, MARw");
  },
  (file: RegisterFile): string => {
    file.registers["MDR"].value = file.registers["ACC"].value;
    return formatLogLine("MDR ← ACC", "ACCr, MDRw");
  },
  (file: RegisterFile, memory: Memory): string => {
    memory.data[file.registers["MAR"].value] = toSigned8Bit(file.registers["MDR"].value);
    return formatLogLine("MEM[MAR] ← MDR", "CS, W, MDRrx");
  },
];

// Instrução ADD
// 7 MAR ← MDR
// 8 MDR ← MEM[MAR]
// 9 ACC ← ACC + MDR
export const add = [
  (file: RegisterFile): string => {
    file.registers["MAR"].value = file.registers["MDR"].value;
    return formatLogLine("MAR ← MDR", "MDRr, MARw");
  },
  (file: RegisterFile, memory: Memory): string => {
    file.registers["MDR"].value = memory.data[file.registers["MAR"].value];
    return formatLogLine("MDR ← MEM[MAR]", "CS, R, MDRwx");
  },
  (file: RegisterFile): string => {
    file.registers["ACC"].value = toSigned8Bit(
      file.registers["ACC"].value + file.registers["MDR"].value
    );
    testFlags(file);
    return formatLogLine("ACC ← ACC + MDR", "MDRr, ULAop=add, ACCwc");
  },
];

// Instrução SUB
// 7 MAR ← MDR
// 8 MDR ← MEM[MAR]
// 9 ACC ← ACC - MDR
export const sub = [
  (file: RegisterFile): string => {
    file.registers["MAR"].value = file.registers["MDR"].value;
    return formatLogLine("MAR ← MDR", "MDRr, MARw");
  },
  (file: RegisterFile, memory: Memory): string => {
    file.registers["MDR"].value = memory.data[file.registers["MAR"].value];
    return formatLogLine("MDR ← MEM[MAR]", "CS, R, MDRwx");
  },
  (file: RegisterFile): string => {
    file.registers["ACC"].value = toSigned8Bit(
      file.registers["ACC"].value - file.registers["MDR"].value
    );
    testFlags(file);
    return formatLogLine("ACC ← ACC - MDR", "MDRr, ULAop=sub, ACCwc");
  },
];

// Instrução MUL
// 7 MAR ← MDR
// 8 MDR ← MEM[MAR]
// 9 ACC ← ACC * MDR
export const mul = [
  (file: RegisterFile): string => {
    file.registers["MAR"].value = file.registers["MDR"].value;
    return formatLogLine("MAR ← MDR", "MDRr, MARw");
  },
  (file: RegisterFile, memory: Memory): string => {
    file.registers["MDR"].value = memory.data[file.registers["MAR"].value];
    return formatLogLine("MDR ← MEM[MAR]", "CS, R, MDRwx");
  },
  (file: RegisterFile): string => {
    file.registers["ACC"].value = toSigned8Bit(
      file.registers["ACC"].value * file.registers["MDR"].value
    );
    testFlags(file);
    return formatLogLine("ACC ← ACC * MDR", "MDRr, ULAop=mul, ACCwc");
  },
];

// Instrução DIV
// TODO: Divide by zero???
// 7 MAR ← MDR
// 8 MDR ← MEM[MAR]
// 9 ACC ← ACC / MDR
export const div = [
  (file: RegisterFile): string => {
    file.registers["MAR"].value = file.registers["MDR"].value;
    return formatLogLine("MAR ← MDR", "MDRr, MARw");
  },
  (file: RegisterFile, memory: Memory): string => {
    file.registers["MDR"].value = memory.data[file.registers["MAR"].value];
    return formatLogLine("MDR ← MEM[MAR]", "CS, R, MDRwx");
  },
  (file: RegisterFile): string => {
    file.registers["ACC"].value = toSigned8Bit(
      file.registers["ACC"].value / file.registers["MDR"].value
    );
    testFlags(file);
    return formatLogLine("ACC ← ACC / MDR" + (file.registers["MDR"].value==0 ? " !Div/0" : ""), "MDRr, ULAop=div, ACCwc");
  },
];

// Instrução NOT
// 4 ACC ← ~ACC
export const not = [
  (file: RegisterFile): string => {
    file.registers["ACC"].value = toSigned8Bit(~file.registers["ACC"].value);
    testFlags(file);
    return formatLogLine("ACC ← ~ACC", "ULAop=not, ACCwc");
  },
];

// Instrução AND
// 7 MAR ← MDR
// 8 MDR ← MEM[MAR]
// 9 ACC ← ACC & MDR
export const and = [
  (file: RegisterFile): string => {
    file.registers["MAR"].value = file.registers["MDR"].value;
    return formatLogLine("MAR ← MDR", "MDRr, MARw");
  },
  (file: RegisterFile, memory: Memory): string => {
    file.registers["MDR"].value = memory.data[file.registers["MAR"].value];
    return formatLogLine("MDR ← MEM[MAR]", "CS, R, MDRwx");
  },
  (file: RegisterFile): string => {
    file.registers["ACC"].value =
      file.registers["ACC"].value & file.registers["MDR"].value;
    testFlags(file);
    return formatLogLine("ACC ← ACC & MDR", "MDRr, ULAop=and, ACCwc");
  },
];

// Instrução OR
// 7 MAR ← MDR
// 8 MDR ← MEM[MAR]
// 9 ACC ← ACC | MDR
export const or = [
  (file: RegisterFile): string => {
    file.registers["MAR"].value = file.registers["MDR"].value;
    return formatLogLine("MAR ← MDR", "MDRr, MARw");
  },
  (file: RegisterFile, memory: Memory): string => {
    file.registers["MDR"].value = memory.data[file.registers["MAR"].value];
    return formatLogLine("MDR ← MEM[MAR]", "CS, R, MDRwx");
  },
  (file: RegisterFile): string => {
    file.registers["ACC"].value = toSigned8Bit(
      file.registers["ACC"].value | file.registers["MDR"].value
    );
    testFlags(file);
    return formatLogLine("ACC ← ACC | MDR", "MDRr, ULAop=or, ACCwc");
  },
];

// Instrução XOR
// 7 MAR ← MDR
// 8 MDR ← MEM[MAR]
// 9 ACC ← ACC ^ MDR
export const xor = [
  (file: RegisterFile): string => {
    file.registers["MAR"].value = file.registers["MDR"].value;
    return formatLogLine("MAR ← MDR", "MDRr, MARw");
  },
  (file: RegisterFile, memory: Memory): string => {
    file.registers["MDR"].value = memory.data[file.registers["MAR"].value];
    return formatLogLine("MDR ← MEM[MAR]", "CS, R, MDRwx");
  },
  (file: RegisterFile): string => {
    file.registers["ACC"].value = toSigned8Bit(
      file.registers["ACC"].value ^ file.registers["MDR"].value
    );
    testFlags(file);
    return formatLogLine("ACC ← ACC ^ MDR", "MDRr, ULAop=xor, ACCwc");
  },
];

// Instrução TST
// 7 _ ← AC
export const tst = [
  (file: RegisterFile): string => {
    testFlags(file);
    return formatLogLine("ACC ← ACC", "ULAop=tst, ACCwc");
  },
];

// Instrução JMP
// 7 PC ← MDR
export const jmp = [
  (file: RegisterFile): string => {
    file.registers["PC"].value = file.registers["MDR"].value;
    return formatLogLine("PC ← MDR", "MDRr, PCw");
  },
];

// Instrução JZF
// 7 Se (ZF==1) PC ← MDR
export const jzf = [
  (file: RegisterFile): string => {
    if (file.registers["PSR"].value & 0b01) {
      file.registers["PC"].value = file.registers["MDR"].value;
      return formatLogLine("if ZF: PC ← MDR", "MDRr, PCw");
    }
    return formatLogLine("", "");
  },
];

// Instrução JSF
// 7 Se (SF==1) PC ← MDR
export const jsf = [
  (file: RegisterFile): string => {
    if (file.registers["PSR"].value & 0b10) {
      file.registers["PC"].value = file.registers["MDR"].value;
      return formatLogLine("if SF: PC ← MDR", "MDRr, PCw");
    }
    return formatLogLine("", "");
  },
];



// Instrução HLT
// 7 HLT ← 1
export const hlt = [
  (file: RegisterFile): string => {
    file.registers["Halted"].value = 1;
    return formatLogLine("Halted ← 1", "");
  },
];

// Realiza testes para atualizar flags
// Origem: operações na ULA ou instrução TST
function testFlags(file: RegisterFile) {
  if (file.registers["ACC"].value == 0) {
    file.registers["PSR"].value |= 0b01;
  } else {
    file.registers["PSR"].value &= 0b10;
  }

  if (file.registers["ACC"].value < 0) {
    file.registers["PSR"].value |= 0b10;
  } else {
    file.registers["PSR"].value &= 0b01;
  }
}

// Função para garantir complemento de 2 de 8 bits
function toSigned8Bit(value: number) {
  const maskedValue = value & 0xff; // Aplica a máscara de 8 bits
  return maskedValue > 127 ? maskedValue - 256 : maskedValue; // Converte para complemento de 2
}

function formatLogLine(rtl: string, controlLines: string=""){
  return rtl.padEnd(15, ' ') + " ｜ " + controlLines; 
}