# Bisk-8 Simulator

Simulador didático da arquitetura hipotética Bisk-8. Execute programas em linguagem de máquina e acompanhe, na interface, a memória, os registradores e cada etapa do ciclo de instrução.

- **Demonstração:** [mjbrusso.github.io/bisk8web](https://mjbrusso.github.io/bisk8web)
- **Código-fonte:** [github.com/mjbrusso/bisk-8-simulator](https://github.com/mjbrusso/bisk-8-simulator)

## Funcionalidades

- Edite os 256 bytes da memória em binário ou hexadecimal.
- Execute um programa até `HLT`, uma instrução completa por vez ou ciclo por ciclo.
- Observe os registradores, as flags e o log de transferências RTL.
- Ajuste a velocidade do clock da simulação.
- Copie, cole, importe e salve imagens da memória em JSON.
- Alterne entre os temas claro e escuro.

## Arquitetura Bisk-8

A Bisk-8 é uma arquitetura didática de 8 bits, com organização von Neumann e arquitetura de acumulador. Instruções e dados compartilham a mesma memória.

| Característica | Especificação |
| --- | --- |
| Palavra e dados | 8 bits |
| Memória | 256 bytes, endereços `00` a `FF` (hexadecimal) |
| Números com sinal | Complemento de dois, de −128 a +127 |
| Registrador visível ao programa | `ACC` (acumulador) |
| Opcode | 4 bits; 16 instruções |
| Formatos | 1 ou 2 bytes |
| Endereçamento | Direto |

O `PC` aponta para a próxima instrução. `MAR` e `MDR` fazem a interface com a memória; `IR` guarda o opcode; `PSR` contém as flags `ZF` (resultado zero) e `SF` (resultado negativo). `Halted` indica que a execução foi encerrada por `HLT`. Não há flag de overflow: os resultados das operações aritméticas são limitados a 8 bits.

### Conjunto de instruções

Os opcodes são apresentados em hexadecimal. Instruções com `op` ocupam dois bytes: opcode seguido pelo endereço do operando. Em operações de dados, esse endereço é lido ou escrito; nos desvios, é o destino atribuído ao `PC`.

| Instrução | Opcode | Bytes | Operação | Atualiza flags |
| --- | ---: | ---: | --- | :---: |
| `NOP` | `00` | 1 | Nenhuma operação | Não |
| `LDA op` | `01` | 2 | `ACC ← MEM[op]` | Não |
| `STA op` | `02` | 2 | `MEM[op] ← ACC` | Não |
| `ADD op` | `03` | 2 | `ACC ← ACC + MEM[op]` | Sim |
| `SUB op` | `04` | 2 | `ACC ← ACC - MEM[op]` | Sim |
| `MUL op` | `05` | 2 | `ACC ← ACC * MEM[op]` | Sim |
| `DIV op` | `06` | 2 | `ACC ← ACC / MEM[op]` | Sim |
| `NOT` | `07` | 1 | `ACC ← ~ACC` | Sim |
| `AND op` | `08` | 2 | `ACC ← ACC & MEM[op]` | Sim |
| `OR op` | `09` | 2 | `ACC ← ACC \| MEM[op]` | Sim |
| `XOR op` | `0A` | 2 | `ACC ← ACC ^ MEM[op]` | Sim |
| `TST` | `0B` | 1 | Atualiza as flags com o valor de `ACC` | Sim |
| `JMP op` | `0C` | 2 | `PC ← op` | Não |
| `JZF op` | `0D` | 2 | Desvia se `ZF = 1` | Não |
| `JSF op` | `0E` | 2 | Desvia se `SF = 1` | Não |
| `HLT` | `0F` | 1 | Encerra a execução | Não |

`ZF` e `SF` são atualizadas pelas operações da ULA indicadas na tabela e permanecem com o último valor até outra operação que altere flags. A ISA não define divisão por zero; nesta implementação, o resultado é zero e o evento aparece no log.

## Como programar e executar

O simulador não possui montador: o programa é escrito diretamente na memória como bytes binários ou hexadecimais. O byte de opcode usa os 4 bits menos significativos; por convenção, os 4 bits mais significativos ficam zerados. Nas instruções de dois bytes, o segundo byte é um endereço de memória, não um valor imediato.

Exemplo: somar `MEM[10]` e `MEM[11]` e armazenar o resultado em `MEM[12]`. Todos os endereços e valores abaixo estão em hexadecimal.

| Endereço | Byte | Significado |
| ---: | ---: | --- |
| `00` | `01` | `LDA` |
| `01` | `10` | Operando: endereço de `A` |
| `02` | `03` | `ADD` |
| `03` | `11` | Operando: endereço de `B` |
| `04` | `02` | `STA` |
| `05` | `12` | Operando: endereço do resultado |
| `06` | `0F` | `HLT` |
| `10` | `05` | `A = 5` |
| `11` | `07` | `B = 7` |
| `12` | `00` | Resultado, que será `0C` |

Para executar:

1. Edite os bytes na tabela **Memória**, em binário ou hexadecimal.
2. Selecione **Executar tudo**, **Executar instrução por instrução** ou **Executar ciclo por ciclo** na barra de ferramentas.
3. Acompanhe o `PC`, o `ACC`, os demais registradores, as flags e o log RTL. O programa começa no endereço `00` e deve terminar com `HLT`.

Use **Resetar registradores** para reiniciar o estado da CPU sem apagar a memória. **Limpar** apaga a memória. O controle de clock oferece velocidades de 0,25 Hz a 4,1 KHz.

## Imagens de memória

Uma imagem de memória é um arquivo `.b8` cujo conteúdo é JSON: um objeto `data` com endereços e valores em hexadecimal maiúsculo, ambos com dois dígitos:

```json
{
  "data": {
    "00": "01",
    "01": "A8",
    "10": "FF"
  }
}
```

Endereços ausentes são carregados como `00`. Ao carregar uma imagem, toda a memória é zerada antes de aplicar os endereços presentes; portanto, dados de uma imagem anteriormente carregada não permanecem nos endereços omitidos. Na saída, endereços com valor `00` são omitidos. O simulador permite importar um arquivo ou copiar/colar o JSON pela área de transferência. O atalho `Ctrl+V` (ou `⌘V` no macOS), fora de campos editáveis, tenta carregar uma imagem válida da área de transferência.

O botão de salvar usa o seletor de arquivos do navegador quando disponível; caso contrário, baixa um arquivo `.b8`. O navegador pode solicitar permissão para acessar a área de transferência ou gravar arquivos.

## Executar localmente

Requisitos: Node.js 18 ou superior e npm.

```bash
git clone https://github.com/mjbrusso/bisk-8-simulator.git
cd bisk-8-simulator
npm ci
npm run dev
```

O Vite informa no terminal o endereço local para abrir no navegador. Os comandos disponíveis são:

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento na porta 3000. |
| `npm run build` | Verifica os tipos TypeScript e gera a versão de produção em `dist/`. |
| `npm run preview` | Serve localmente a versão já compilada. |
| `npm run lint` | Executa o ESLint. |
| `npm run deploy` | Compila para o caminho do GitHub Pages e publica `dist/` usando `gh-pages`. |
| `npm run sloc:update` | Atualiza a tabela de SLOC deste README. |

## Estrutura do projeto

- `src/models/`: memória, registradores e conjunto de instruções.
- `src/services/`: operações da CPU e leitura, gravação e validação de imagens de memória.
- `src/pages/` e `src/components/`: interface do simulador.
- `src/App.tsx`: estado da aplicação e controle dos ciclos de execução.

## Créditos

A arquitetura e o simulador têm origem no trabalho de conclusão de curso de Engenharia de Computação de Lucas Fachinetto, orientado pelo professor Marcos José Brusso, na Universidade de Passo Fundo (UPF).

## SLOC por origem

<!-- SLOC_TABLE:START -->
| Autor | SLOC | % dos SLOCs |
| --- | ---: | ---: |
| Humano | 1347 | 59.89% |
| IA | 902 | 40.11% |
| **Total** | **2249** | **100.00%** |
<!-- SLOC_TABLE:END -->

Contagem de linhas-fonte não vazias (comentários incluídos) nos arquivos de código da aplicação versionados em `HEAD`, atribuídas pela origem indicada por `git blame`. O script de geração não entra na contagem. O commit `79b29ff04e6768e8aa2ef93fad122e393f32bd87` e seus ancestrais são classificados como humanos; os commits posteriores, como IA. Para atualizar a tabela após novos commits, execute `npm run sloc:update`.

## Licença

Este projeto está sob a licença [MIT](./LICENSE).
