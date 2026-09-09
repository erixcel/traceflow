export function getMethodParameterNames(method: object): string[] {
  const source = Function.prototype.toString.call(method);
  const openingIndex = source.indexOf('(');
  const closingIndex = openingIndex >= 0 ? findClosingParenthesis(source, openingIndex) : -1;

  if (openingIndex < 0 || closingIndex < 0) {
    return [];
  }

  return splitMethodParameters(source.slice(openingIndex + 1, closingIndex)).map(normalizeParameterName);
}

export function mapMethodArguments(parameterNames: readonly string[], args: readonly unknown[]): Record<string, unknown> | undefined {
  if (args.length === 0) {
    return undefined;
  }

  return Object.fromEntries(args.map((value, index) => [parameterNames[index] || `arg${index + 1}`, value]));
}

function findClosingParenthesis(source: string, openingIndex: number): number {
  let depth = 0;
  let quote = '';

  for (let index = openingIndex; index < source.length; index += 1) {
    const character = source[index] ?? '';
    const previous = source[index - 1] ?? '';

    if (quote) {
      if (character === quote && previous !== '\\') {
        quote = '';
      }
      continue;
    }

    if (character === '"' || character === "'" || character === '`') {
      quote = character;
    } else if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function splitMethodParameters(source: string): string[] {
  const parameters: string[] = [];
  let current = '';
  let depth = 0;
  let quote = '';

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index] ?? '';
    const previous = source[index - 1] ?? '';

    if (quote) {
      current += character;
      if (character === quote && previous !== '\\') {
        quote = '';
      }
      continue;
    }

    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      current += character;
    } else if (character === '(' || character === '[' || character === '{') {
      depth += 1;
      current += character;
    } else if (character === ')' || character === ']' || character === '}') {
      depth -= 1;
      current += character;
    } else if (character === ',' && depth === 0) {
      parameters.push(current);
      current = '';
    } else {
      current += character;
    }
  }

  if (current.trim()) {
    parameters.push(current);
  }

  return parameters;
}

function normalizeParameterName(parameter: string, index: number): string {
  const withoutDefault = removeDefaultValue(parameter)
    .trim()
    .replace(/^\.\.\./, '');
  return /^[A-Za-z_$][\w$]*$/.test(withoutDefault) ? withoutDefault : `arg${index + 1}`;
}

function removeDefaultValue(parameter: string): string {
  let depth = 0;
  let quote = '';

  for (let index = 0; index < parameter.length; index += 1) {
    const character = parameter[index] ?? '';
    const previous = parameter[index - 1] ?? '';

    if (quote) {
      if (character === quote && previous !== '\\') {
        quote = '';
      }
      continue;
    }

    if (character === '"' || character === "'" || character === '`') {
      quote = character;
    } else if (character === '(' || character === '[' || character === '{') {
      depth += 1;
    } else if (character === ')' || character === ']' || character === '}') {
      depth -= 1;
    } else if (character === '=' && depth === 0) {
      return parameter.slice(0, index);
    }
  }

  return parameter;
}
