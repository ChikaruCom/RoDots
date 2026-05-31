export type InputValues = Record<string, string>;

export type InlineToken =
  | { kind: 'text'; text: string }
  | { kind: 'copy'; text: string }
  | { kind: 'date'; text: string; copy: boolean; alias?: string; offsetAmount: number; offsetUnit: 'D' | 'M' | 'Y' }
  | { kind: 'input'; alias: string; inputType: string; placeholder: string; value: string }
  | { kind: 'link'; href: string; label: string; linkType: 'file' | 'web' };

export type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; tokens: InlineToken[] }
  | { kind: 'paragraph'; tokens: InlineToken[] }
  | { kind: 'list'; tokens: InlineToken[] }
  | { kind: 'code'; text: string }
  | { kind: 'blank' };

export type ParsedDocument = {
  blocks: Block[];
  aliases: Record<string, string>;
  meta: Record<string, string>;
  todos: string[];
};

type EvalResult = {
  tokens: InlineToken[];
  value: string;
  alias?: string;
  aliasValue?: string;
  todo?: string;
};

type RepeatRange = {
  start: number;
  end: number;
  unit: 'D' | 'M' | 'Y';
};

const commandPattern = /\{\{\s*([a-zA-Z]+)\s*#([^{}]*?)\s*(?:@([a-zA-Z0-9_-]+))?\s*\}\}/g;
const inlinePattern = /(file:\/\/[^\s)]+|file:\.\/[^\s)]+|https?:\/\/[^\s)]+)|@([a-zA-Z0-9_-]+)/g;

export function parseRawDots(source: string, inputs: InputValues = {}): ParsedDocument {
  const aliases: Record<string, string> = {};
  const meta: Record<string, string> = {};
  const todos: string[] = [];
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  let codeBuffer: string[] | null = null;

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (codeBuffer) {
        blocks.push({ kind: 'code', text: codeBuffer.join('\n') });
        codeBuffer = null;
      } else {
        codeBuffer = [];
      }
      continue;
    }

    if (codeBuffer) {
      codeBuffer.push(line);
      continue;
    }

    const metaValues = parseMetaLine(line);
    if (metaValues) {
      Object.assign(meta, metaValues);
      continue;
    }

    for (const expandedLine of expandRepeatedLine(line)) {
      pushParsedLine(expandedLine, aliases, inputs, todos, blocks);
    }
  }

  if (codeBuffer) {
    blocks.push({ kind: 'code', text: codeBuffer.join('\n') });
  }

  return { blocks, aliases, meta, todos: Array.from(new Set(todos)) };
}

export function updateDateBaseInSource(source: string, alias: string | undefined, selectedIsoDate: string, offsetAmount = 0, offsetUnit: 'D' | 'M' | 'Y' = 'D'): string {
  let updated = false;
  const baseDate = applyDateOffset(parseDateLikeText(selectedIsoDate), formatOffset(-offsetAmount, offsetUnit));

  return source.replace(commandPattern, (raw, command: string, rawArgs: string, commandAlias: string | undefined) => {
    if (updated || command.toLowerCase() !== 'date') return raw;
    if (alias && commandAlias !== alias) return raw;

    const args = splitArgs(rawArgs);
    args[0] = toIsoDate(baseDate);
    updated = true;
    return `{{ ${command} # ${args.join(', ')}${commandAlias ? ` @${commandAlias}` : ''} }}`;
  });
}

function pushParsedLine(
  line: string,
  aliases: Record<string, string>,
  inputs: InputValues,
  todos: string[],
  blocks: Block[],
): void {
  if (!line.trim()) {
    blocks.push({ kind: 'blank' });
    return;
  }

  const heading = /^(#{1,3})\s+(.*)$/.exec(line);
  if (heading) {
    const content = evaluateInline(heading[2], aliases, inputs);
    updateLineState(content, aliases, todos);
    blocks.push({ kind: 'heading', level: heading[1].length as 1 | 2 | 3, tokens: content.tokens });
    return;
  }

  const list = /^[-*]\s+(.*)$/.exec(line);
  if (list) {
    const content = evaluateInline(list[1], aliases, inputs);
    updateLineState(content, aliases, todos);
    blocks.push({ kind: 'list', tokens: content.tokens });
    return;
  }

  const result = evaluateInline(line, aliases, inputs);
  updateLineState(result, aliases, todos);
  blocks.push({ kind: 'paragraph', tokens: result.tokens });
}

function updateLineState(result: EvalResult, aliases: Record<string, string>, todos: string[]): void {
  if (result.todo) todos.push(result.todo);
  if (result.alias) aliases[result.alias] = result.aliasValue ?? result.value;
}

function expandRepeatedLine(line: string): string[] {
  const range = findRepeatRange(line);
  if (!range) return [line];

  const start = Math.min(range.start, range.end);
  const end = Math.max(range.start, range.end);
  const lines: string[] = [];
  for (let n = start; n <= end; n += 1) {
    lines.push(rewriteRepeatOffsets(line, n));
  }
  return lines;
}

function findRepeatRange(line: string): RepeatRange | null {
  for (const match of line.matchAll(commandPattern)) {
    if (match[1].toLowerCase() !== 'date') continue;
    const range = parseRepeatOffset(splitArgs(match[2])[2]);
    if (range) return range;
  }
  return null;
}

function rewriteRepeatOffsets(line: string, n: number): string {
  return line.replace(commandPattern, (raw, command: string, rawArgs: string, alias: string | undefined) => {
    if (command.toLowerCase() !== 'date') return raw;

    const args = splitArgs(rawArgs);
    const range = parseRepeatOffset(args[2]);
    if (!range) return raw;

    args[2] = formatOffset(n, range.unit);
    return `{{ ${command} # ${args.join(', ')}${alias ? ` @${alias}` : ''} }}`;
  });
}

function parseRepeatOffset(raw: string | undefined): RepeatRange | null {
  if (!raw) return null;
  const compact = raw.replace(/\s+/g, '');

  const forward = /^([+-])(\d+)n([DMY])$/i.exec(compact);
  if (forward) {
    const amount = Number(forward[2]) * (forward[1] === '-' ? -1 : 1);
    return { start: 0, end: amount, unit: forward[3].toUpperCase() as 'D' | 'M' | 'Y' };
  }

  const dotted = /^([+-]\d+)n([DMY])?\.\.([+-]\d+)n([DMY])$/i.exec(compact);
  if (dotted) {
    const unit = (dotted[2] ?? dotted[4]).toUpperCase() as 'D' | 'M' | 'Y';
    return { start: Number(dotted[1]), end: Number(dotted[3]), unit };
  }

  const paired = /^([+-]\d+)n([+-]\d+)n([DMY])$/i.exec(compact);
  if (paired) {
    return { start: Number(paired[1]), end: Number(paired[2]), unit: paired[3].toUpperCase() as 'D' | 'M' | 'Y' };
  }

  return null;
}

function formatOffset(amount: number, unit: 'D' | 'M' | 'Y'): string {
  return `${amount >= 0 ? '+' : ''}${amount}${unit}`;
}

function evaluateInline(line: string, aliases: Record<string, string>, inputs: InputValues): EvalResult {
  const tokens: InlineToken[] = [];
  const textParts: string[] = [];
  let cursor = 0;
  let alias: string | undefined;
  let aliasValue: string | undefined;
  let todo: string | undefined;

  for (const match of line.matchAll(commandPattern)) {
    const index = match.index ?? 0;
    pushLinkedText(tokens, line.slice(cursor, index), aliases);

    const command = match[1].toLowerCase();
    const args = splitArgs(match[2]);
    const commandAlias = match[3];

    if (command === 'date') {
      const value = evaluateDate(args, aliases);
      const mode = (args[3] ?? 'normal').trim().toLowerCase();
      const offset = parseConcreteOffset(args[2]);
      tokens.push({
        kind: 'date',
        text: value,
        copy: mode === 'copy',
        alias: commandAlias,
        offsetAmount: offset.amount,
        offsetUnit: offset.unit,
      });
      if (commandAlias) {
        alias = commandAlias;
        aliasValue = value;
      }
    } else if (command === 'input') {
      const inputType = args[0] || 'text';
      const placeholder = args[1] || '入力してください';
      const inputAlias = commandAlias || `input_${Object.keys(inputs).length + 1}`;
      const value = inputs[inputAlias] ?? '';
      tokens.push({ kind: 'input', alias: inputAlias, inputType, placeholder, value });
      if (!value.trim()) todo = inputAlias;
      if (commandAlias) {
        alias = commandAlias;
        aliasValue = value;
      }
    } else {
      const raw = match[0];
      tokens.push({ kind: 'text', text: raw });
      textParts.push(raw);
    }

    cursor = index + match[0].length;
  }

  pushLinkedText(tokens, line.slice(cursor), aliases);

  for (const token of tokens) {
    if (token.kind === 'text' || token.kind === 'copy' || token.kind === 'date') textParts.push(token.text);
    if (token.kind === 'input') textParts.push(token.value);
    if (token.kind === 'link') textParts.push(token.label);
  }

  return { tokens, value: textParts.join(''), alias, aliasValue, todo };
}

function pushLinkedText(tokens: InlineToken[], text: string, aliases: Record<string, string>): void {
  let cursor = 0;
  for (const match of text.matchAll(inlinePattern)) {
    const index = match.index ?? 0;
    if (index > cursor) tokens.push({ kind: 'text', text: text.slice(cursor, index) });
    if (match[1]) {
      const href = match[1];
      tokens.push({ kind: 'link', href, label: href, linkType: href.startsWith('file:') ? 'file' : 'web' });
    } else if (match[2] && aliases[match[2]] !== undefined) {
      tokens.push({ kind: 'text', text: aliases[match[2]] });
    } else {
      tokens.push({ kind: 'text', text: match[0] });
    }
    cursor = index + match[0].length;
  }
  if (cursor < text.length) tokens.push({ kind: 'text', text: text.slice(cursor) });
}

function splitArgs(raw: string): string[] {
  return raw.split(',').map((arg) => arg.trim()).filter(Boolean);
}

function parseMetaLine(line: string): Record<string, string> | null {
  const match = /^\s*\{\{\s*meta\s*#([^{}]*?)\s*\}\}\s*$/i.exec(line);
  if (!match) return null;

  return splitArgs(match[1]).reduce<Record<string, string>>((values, item) => {
    const [key, ...rest] = item.split('=');
    if (key && rest.length > 0) values[key.trim()] = rest.join('=').trim();
    return values;
  }, {});
}

function evaluateDate(args: string[], aliases: Record<string, string>): string {
  const base = parseBaseDate(args[0], aliases);
  const shifted = applyDateOffset(base, args[2] ?? '+0D');
  return formatDate(shifted, args[1] ?? 'yyyy-mm-dd');
}

function parseBaseDate(raw: string | undefined, aliases: Record<string, string>): Date {
  if (!raw || raw === 'today') return startOfToday();
  const resolved = raw.startsWith('@') ? aliases[raw.slice(1)] : raw;
  const date = resolved ? parseDateLikeText(resolved) : new Date(NaN);
  return Number.isNaN(date.getTime()) ? startOfToday() : date;
}

function parseDateLikeText(text: string): Date {
  const reiwa = /令和(\d+)年(\d{1,2})月(\d{1,2})日/.exec(text);
  if (reiwa) return new Date(Number(reiwa[1]) + 2018, Number(reiwa[2]) - 1, Number(reiwa[3]));

  const japanese = /(\d{4})年(\d{1,2})月(\d{1,2})日/.exec(text);
  if (japanese) return new Date(Number(japanese[1]), Number(japanese[2]) - 1, Number(japanese[3]));

  const iso = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  return new Date(text);
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function applyDateOffset(date: Date, offset: string): Date {
  const result = new Date(date);
  const match = /^([+-])(\d+)([DMY])$/i.exec(offset.trim());
  if (!match) return result;

  const amount = Number(match[2]) * (match[1] === '-' ? -1 : 1);
  const unit = match[3].toUpperCase();
  if (unit === 'D') result.setDate(result.getDate() + amount);
  if (unit === 'M') result.setMonth(result.getMonth() + amount);
  if (unit === 'Y') result.setFullYear(result.getFullYear() + amount);
  return result;
}

function parseConcreteOffset(offset: string | undefined): { amount: number; unit: 'D' | 'M' | 'Y' } {
  const match = /^([+-])(\d+)([DMY])$/i.exec((offset ?? '+0D').trim());
  if (!match) return { amount: 0, unit: 'D' };

  const amount = Number(match[2]) * (match[1] === '-' ? -1 : 1);
  return { amount, unit: match[3].toUpperCase() as 'D' | 'M' | 'Y' };
}

function toIsoDate(date: Date): string {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDate(date: Date, format: string): string {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const wareki = toWareki(date);
  const rokuyo = toRokuyo(date);

  return format
    .replace(/令和N年/g, wareki)
    .replace(/yyyy/g, yyyy)
    .replace(/mm/g, mm)
    .replace(/dd/g, dd)
    .replace(/六曜/g, rokuyo);
}

function toWareki(date: Date): string {
  const reiwaStart = new Date(2019, 4, 1);
  if (date >= reiwaStart) return `令和${date.getFullYear() - 2018}年`;
  return `${date.getFullYear()}年`;
}

function toRokuyo(date: Date): string {
  const names = ['先勝', '友引', '先負', '仏滅', '大安', '赤口'];
  const index = Math.abs(Math.floor(date.getTime() / 86_400_000)) % names.length;
  return names[index];
}
