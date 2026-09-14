import type { TraceFlowAttributes } from '../types/protocol.type';
import type { TraceFlowParameterSchemaDto, TraceFlowValidationContractDto, TraceFlowValidationRuleDto } from '../interfaces/protocol.interface';
import type { MetadataReflection } from '../interfaces/framework-metadata.interface';
import { NEST_REQUEST_METHODS } from '../constants/framework-metadata.constant';
import { tracedDtoRegistry } from '../validation-schema.runtime';

interface SwaggerPropertyMetadata {
  description?: string;
  example?: unknown;
  default?: unknown;
  required?: boolean;
  type?: unknown;
  enum?: unknown[];
  isArray?: boolean;
}

interface ClassValidatorRuleMetadata {
  type?: string;
  name?: string;
  propertyName?: string;
  constraints?: unknown[];
}

interface ClassValidatorMetadataStorage {
  getTargetValidationMetadatas?: (target: object, targetPath?: string, always?: boolean, strictGroups?: boolean) => ClassValidatorRuleMetadata[];
}

const NEST_ROUTE_PARAMTYPES: Record<number, 'query' | 'body' | 'param' | 'header'> = {
  3: 'body',
  4: 'query',
  5: 'param',
  6: 'header',
};

const COMMON_RULE_DESCRIPTIONS: Record<string, string | ((constraints?: unknown[]) => string)> = {
  isDateString: 'Fecha ISO 8601 (YYYY-MM-DD)',
  isNotEmpty: 'No vacío',
  isInt: 'Número entero',
  isNumber: 'Número',
  isString: 'Texto',
  isBoolean: 'Booleano',
  isEmail: 'Correo electrónico válido',
  isUUID: 'Identificador UUID',
  isPositive: 'Número positivo (> 0)',
  isNegative: 'Número negativo (< 0)',
  isUrl: 'URL válida',
  arrayNotEmpty: 'Lista no vacía',
  min: (c) => `Mínimo ${formatConstraint(c?.[0])}`,
  max: (c) => `Máximo ${formatConstraint(c?.[0])}`,
  minLength: (c) => `Longitud mín. ${formatConstraint(c?.[0])}`,
  maxLength: (c) => `Longitud máx. ${formatConstraint(c?.[0])}`,
  arrayMinSize: (c) => `Tamaño mín. ${formatConstraint(c?.[0])}`,
  arrayMaxSize: (c) => `Tamaño máx. ${formatConstraint(c?.[0])}`,
  isIn: (c) => {
    const list = Array.isArray(c?.[0]) ? c[0] : c;
    return `Uno de: ${Array.isArray(list) ? list.join(', ') : String(list)}`;
  },
};

function formatConstraint(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function resolveRuleDescription(name: string, constraints?: unknown[]): string | undefined {
  const descriptor = COMMON_RULE_DESCRIPTIONS[name];
  if (typeof descriptor === 'function') {
    return descriptor(constraints);
  }
  if (typeof descriptor === 'string') {
    return descriptor;
  }
  return undefined;
}

function sanitizeConstraints(constraints?: unknown[]): (string | number | boolean)[] | undefined {
  if (!Array.isArray(constraints) || constraints.length === 0) return undefined;
  const sanitized: (string | number | boolean)[] = [];
  for (const item of constraints) {
    if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
      sanitized.push(item);
    } else if (Array.isArray(item)) {
      for (const sub of item) {
        if (typeof sub === 'string' || typeof sub === 'number' || typeof sub === 'boolean') {
          sanitized.push(sub);
        }
      }
    }
  }
  return sanitized.length > 0 ? sanitized : undefined;
}

export function extractValidationContract(targetClass: unknown, fallbackLocation: 'query' | 'body' | 'param' | 'header' | 'custom' = 'query'): TraceFlowValidationContractDto | null {
  if (!targetClass || typeof targetClass !== 'function') {
    return null;
  }

  const constructor = targetClass as { name?: string; prototype?: object };
  const prototype = constructor.prototype;
  if (!prototype) {
    return null;
  }

  const metadata = Reflect as MetadataReflection;

  // 1. Swagger property names: 'swagger/apiModelPropertiesArray'
  const rawSwaggerProps = metadata.getMetadata?.('swagger/apiModelPropertiesArray', prototype);
  const swaggerPropNames = Array.isArray(rawSwaggerProps) ? rawSwaggerProps.map((item) => String(item).replace(/^:/, '')).filter(Boolean) : [];

  // 2. Class-validator metadata rules
  const globalStorage = (globalThis as Record<string, unknown>).classValidatorMetadataStorage as ClassValidatorMetadataStorage | undefined;
  const cvMetadatas: ClassValidatorRuleMetadata[] =
    typeof globalStorage?.getTargetValidationMetadatas === 'function' ? (globalStorage.getTargetValidationMetadatas(targetClass as object, '', false, false) ?? []) : [];

  const cvPropNames = cvMetadatas.map((m) => m.propertyName).filter((p): p is string => Boolean(p));

  const allPropNames = Array.from(new Set([...swaggerPropNames, ...cvPropNames]));
  if (allPropNames.length === 0) {
    return null;
  }

  const parameters: TraceFlowParameterSchemaDto[] = [];

  for (const propName of allPropNames) {
    const swaggerMeta = (metadata.getMetadata?.('swagger/apiModelProperties', prototype, propName) ?? {}) as SwaggerPropertyMetadata;

    const propRules = cvMetadatas.filter((m) => m.propertyName === propName);

    const hasOptionalRule = propRules.some((rule) => rule.name === 'isOptional' || rule.type === 'conditionalValidation');

    const isRequired = swaggerMeta.required !== undefined ? Boolean(swaggerMeta.required) : !hasOptionalRule && propRules.length > 0;

    // Resolve parameter type
    let type = 'string';
    if (typeof swaggerMeta.type === 'string') {
      type = swaggerMeta.type;
    } else if (typeof swaggerMeta.type === 'function') {
      const typeName = (swaggerMeta.type as { name?: string }).name?.toLowerCase();
      type = typeName && typeName !== 'object' ? typeName : 'object';
    } else if (propRules.some((r) => r.name === 'isInt' || r.name === 'isNumber')) {
      type = 'number';
    } else if (propRules.some((r) => r.name === 'isBoolean')) {
      type = 'boolean';
    } else if (propRules.some((r) => r.name === 'isArray' || r.name === 'arrayNotEmpty' || r.name === 'arrayMinSize') || swaggerMeta.isArray) {
      type = 'array';
    }

    // Enum extraction
    let enumValues: (string | number)[] | undefined = undefined;
    if (Array.isArray(swaggerMeta.enum) && swaggerMeta.enum.length > 0) {
      enumValues = swaggerMeta.enum.filter((e): e is string | number => typeof e === 'string' || typeof e === 'number');
    } else {
      const isInRule = propRules.find((r) => r.name === 'isIn');
      if (isInRule && Array.isArray(isInRule.constraints?.[0])) {
        enumValues = isInRule.constraints[0].filter((e): e is string | number => typeof e === 'string' || typeof e === 'number');
      }
    }

    const rules: TraceFlowValidationRuleDto[] = propRules
      .filter((rule) => rule.name && rule.name !== 'isOptional')
      .map((rule) => {
        const ruleName = rule.name!;
        const constraints = sanitizeConstraints(rule.constraints);
        const description = resolveRuleDescription(ruleName, rule.constraints);
        return {
          name: ruleName,
          ...(constraints ? { constraints } : {}),
          ...(description ? { description } : {}),
        };
      });

    parameters.push({
      name: propName,
      in: fallbackLocation,
      required: isRequired,
      type,
      ...(swaggerMeta.description ? { description: swaggerMeta.description } : {}),
      ...(swaggerMeta.example !== undefined && typeof swaggerMeta.example !== 'function' ? { example: swaggerMeta.example as string | number | boolean } : {}),
      ...(swaggerMeta.default !== undefined && typeof swaggerMeta.default !== 'function' ? { default: swaggerMeta.default as string | number | boolean } : {}),
      ...(enumValues && enumValues.length > 0 ? { enum: enumValues } : {}),
      rules,
    });
  }

  const dtoName = constructor.name && constructor.name !== 'Object' ? constructor.name : undefined;

  return {
    ...(dtoName ? { dtoName } : {}),
    location: fallbackLocation,
    parameters,
  };
}

export function getValidationSchemaAttributes(controllerOrTarget: object, method: object, args: unknown[] = [], explicitDto?: unknown | unknown[]): TraceFlowAttributes {
  const metadata = Reflect as MetadataReflection;

  // 1. Determine HTTP method & default location
  let location: 'query' | 'body' | 'param' | 'header' | 'custom' = 'query';
  const requestMethodNum = metadata.getMetadata?.('method', method);
  if (typeof requestMethodNum === 'number' && NEST_REQUEST_METHODS[requestMethodNum]) {
    const httpMethod = NEST_REQUEST_METHODS[requestMethodNum]!;
    location = httpMethod === 'GET' || httpMethod === 'DELETE' || httpMethod === 'HEAD' ? 'query' : 'body';
  }

  // 2. Determine location from NestJS __routeArguments__ if available
  const routeArgs = (metadata.getMetadata?.('__routeArguments__', controllerOrTarget, (method as { name?: string }).name ?? '') ||
    metadata.getMetadata?.('__routeArguments__', (controllerOrTarget as { constructor?: object }).constructor ?? controllerOrTarget, (method as { name?: string }).name ?? '')) as
    Record<string, { index: number }> | undefined;

  // 3. Collect candidate DTO classes
  const candidates: unknown[] = [];

  if (explicitDto) {
    if (Array.isArray(explicitDto)) {
      candidates.push(...explicitDto);
    } else {
      candidates.push(explicitDto);
    }
  }

  // Inspect design:paramtypes
  const methodName = (method as { name?: string }).name ?? '';
  const targetProto = (controllerOrTarget as { prototype?: object }).prototype ?? controllerOrTarget;
  const ctorProto = (controllerOrTarget as { constructor?: { prototype?: object } }).constructor?.prototype;
  const paramTypes =
    (metadata.getMetadata?.('design:paramtypes', targetProto, methodName) as unknown[] | undefined) ??
    (metadata.getMetadata?.('design:paramtypes', controllerOrTarget, methodName) as unknown[] | undefined) ??
    (ctorProto ? (metadata.getMetadata?.('design:paramtypes', ctorProto, methodName) as unknown[] | undefined) : undefined) ??
    (metadata.getMetadata?.('design:paramtypes', method) as unknown[] | undefined) ??
    [];

  if (Array.isArray(paramTypes)) {
    for (const pt of paramTypes) {
      if (isCustomClass(pt) && !candidates.includes(pt)) {
        candidates.push(pt);
      }
    }
  }

  // Inspect runtime arguments
  for (const arg of args) {
    if (arg && typeof arg === 'object' && isCustomClass(arg.constructor) && !candidates.includes(arg.constructor)) {
      candidates.push(arg.constructor);
    }
  }

  for (const candidate of candidates) {
    // If routeArgs found for candidate's index, refine location
    let candidateLocation: 'query' | 'body' | 'param' | 'header' | 'custom' = location;
    if (routeArgs) {
      for (const [key, value] of Object.entries(routeArgs)) {
        const paramTypeNum = Number(key.split(':')[0]);
        if (NEST_ROUTE_PARAMTYPES[paramTypeNum]) {
          const index = value.index;
          if (paramTypes[index] === candidate || args[index]?.constructor === candidate) {
            candidateLocation = NEST_ROUTE_PARAMTYPES[paramTypeNum]!;
            break;
          }
        }
      }
    }

    const contract = extractValidationContract(candidate, candidateLocation);
    if (contract && contract.parameters.length > 0) {
      return {
        ...(contract.dtoName ? { 'traceflow.controller.dto': contract.dtoName } : {}),
        'traceflow.validation.schema': JSON.stringify(contract),
      };
    }
  }

  return {};
}

function isCustomClass(value: unknown): boolean {
  if (typeof value !== 'function') return false;
  const name = value.name;
  if (!name || name === 'Object' || name === 'String' || name === 'Number' || name === 'Boolean' || name === 'Array' || name === 'Function') {
    return false;
  }
  return true;
}

export function registerTracedDto(targetClass: unknown, contract?: TraceFlowValidationContractDto | null): void {
  if (!targetClass || typeof targetClass !== 'function') return;
  const resolved = contract ?? extractValidationContract(targetClass);
  if (resolved) {
    tracedDtoRegistry.set((targetClass as { name: string }).name, { targetClass, contract: resolved });
  }
}

export function getTracedDtoContract(nameOrClass: unknown): TraceFlowValidationContractDto | null {
  if (typeof nameOrClass === 'string') {
    return tracedDtoRegistry.get(nameOrClass)?.contract ?? null;
  }
  if (typeof nameOrClass === 'function') {
    return tracedDtoRegistry.get((nameOrClass as { name: string }).name)?.contract ?? extractValidationContract(nameOrClass);
  }
  return null;
}

export function getAllTracedDtos(): TraceFlowValidationContractDto[] {
  return Array.from(tracedDtoRegistry.values()).map((entry) => entry.contract);
}

export function findMatchingTracedDto(options: {
  query?: Record<string, unknown> | undefined;
  body?: Record<string, unknown> | undefined;
  errorMessage?: string | undefined;
}): TraceFlowValidationContractDto | null {
  const registered = getAllTracedDtos();
  if (registered.length === 0) return null;

  let bestDto: TraceFlowValidationContractDto | null = null;
  let bestScore = 0;

  for (const contract of registered) {
    let score = 0;
    const paramNames = new Set(contract.parameters.map((p) => p.name));

    if (options.query && typeof options.query === 'object') {
      for (const key of Object.keys(options.query)) {
        if (paramNames.has(key)) score += 2;
      }
    }
    if (options.body && typeof options.body === 'object') {
      for (const key of Object.keys(options.body)) {
        if (paramNames.has(key)) score += 2;
      }
    }
    if (options.errorMessage) {
      for (const name of paramNames) {
        if (options.errorMessage.includes(name)) score += 3;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestDto = contract;
    }
  }

  return bestScore > 0 ? bestDto : null;
}
