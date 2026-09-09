# TraceFlow

TraceFlow es un runtime ligero de trazabilidad para aplicaciones Node.js. Usa
OpenTelemetry para crear spans, propagar contexto y enviarlos a un Studio local
durante el desarrollo.

El repositorio se organiza como un workspace de npm, pero los consumidores solo
necesitan instalar el paquete que corresponda.

```text
traceflow       Runtime de producción: OpenTelemetry, tipos e instrumentación
traceflow-kit   CLI, API local, Swagger y servidor del Studio
traceflow-kit/studio/  Frontend React/Vite compilado dentro de traceflow-kit
```

Dentro de `packages/traceflow/src/modules`, el runtime se organiza por
features:

```text
settings/  configuración e inicialización de OpenTelemetry
traces/    trazas anotadas y piezas compartidas
```

`traces/normal` contiene `@Trace()` y `traces/shared` contiene únicamente
contratos y funciones utilizadas por el decorador. Las interfaces, tipos y
funciones siguen sufijos descriptivos como
`.interface.ts`, `.type.ts` y `.function.ts`. Los archivos `.function.ts` no
guardan estado ni constantes globales; esos valores viven en `.constant.ts` o
`.runtime.ts`.

El núcleo de `traceflow` no depende de NestJS, Fastify ni Express. El kit sí usa
NestJS sobre Fastify para mantener sus controladores y su API local ordenados,
sin añadir esas dependencias a las aplicaciones que solo instrumentan su código.

## Requisitos

- Node.js 20.19+ o 22.12+.
- npm 11+.

## Uso desde una aplicación Node.js

Instala solamente el runtime:

```bash
npm install traceflow
```

Inicializa TraceFlow antes de importar el resto de la aplicación:

```ts
// src/instrumentation.ts
import { startTraceFlow, Trace } from 'traceflow';

startTraceFlow({
  serviceName: 'mi-api',
  studioUrl: 'http://127.0.0.1:4789',
});

export class CustomerService {
  @Trace({
    name: 'customer.findAll',
    type: 'service',
    labels: ['customers', 'select'],
  })
  async listCustomers(filters: { page: number; limit: number }) {
    return customerRepository.findAll(filters);
  }
}
```

Marca operaciones de negocio con el decorador genérico `@Trace()`. Sus argumentos
y su respuesta se capturan por defecto:

```ts
import { Trace } from 'traceflow';

export class CustomerService {
  @Trace({
    name: 'Listar clientes',
    type: 'service',
  })
  async findAll(filters: { page: number; limit: number }) {
    return [];
  }
}
```

Studio muestra la entrada, la salida y los atributos documentales en secciones
separadas. TraceFlow intenta conservar los nombres de los parámetros del método;
si el JavaScript compilado no los conserva, utiliza `arg1`, `arg2`, etc. Para
desactivar una captura concreta usa `capture: { input: false }` o
`capture: { output: false }`.

`@TraceNode()` se conserva como alias para aplicaciones existentes:

```ts
import { TraceNode } from 'traceflow';
```

TypeScript solo permite decoradores en clases y sus miembros, no directamente en
funciones sueltas. Para instrumentar utilidades, agrúpalas en una clase de métodos
estáticos:

```ts
import { Trace } from 'traceflow';

export class PaginationFunction {
  @Trace({ name: 'Crear paginación', type: 'method', labels: ['module'] })
  static createPaginationMeta(total: number, page: number, limit: number) {
    const totalPages = Math.ceil(total / limit);
    return { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 };
  }
}
```

`@Trace()` soporta métodos estáticos y conserva los argumentos, el resultado, las
excepciones y la captura de entrada y salida.

Para una clase de acceso a datos basta un decorador. Cada método invocado produce
un span `table` con el nombre de la tabla, el método ejecutado y la operación
inferida:

```ts
import { Table } from 'traceflow';

@Table({ name: 'users', system: 'postgresql' })
export class UserStore {
  async findById(id: number) {
    return database.select().from(users).where(eq(users.id, id));
  }
}
```

`exclude` permite omitir métodos auxiliares. Si un método requiere un nombre o
tipo distinto, puede conservar su propio `@Trace()` sin crear un span duplicado.
Usa `table` para consultas y `method` para métodos internos relevantes que no
representan un controller, un service o una transformación.

También puedes desactivar la instrumentación automática de HTTP si solo quieres
usar spans creados por tus decoradores:

```ts
startTraceFlow({
  serviceName: 'worker',
  instrumentHttp: false,
});
```

La instrumentación HTTP se realiza sobre la capa de Node.js, por lo que no es
necesario registrar un plugin distinto para NestJS, Express o Fastify. Para
detalles específicos de un framework (por ejemplo, nombres exactos de
controladores) se puede añadir una integración en el futuro sin contaminar el
núcleo.

## Visualizar trazas

Instala el kit como dependencia de desarrollo:

```bash
npm install -D traceflow-kit
```

Añade un script:

```json
{
  "scripts": {
    "traceflow:studio": "traceflow-kit studio"
  }
}
```

Inicia la API local y la interfaz:

```bash
npm run traceflow:studio
```

Por defecto:

```text
Studio:  http://127.0.0.1:4789
Swagger: http://127.0.0.1:4789/docs
OpenAPI: http://127.0.0.1:4789/docs-json
Ingesta: http://127.0.0.1:4789/api/v1/spans/batch
```

Opciones del CLI:

```bash
npx traceflow-kit studio --no-open
npx traceflow-kit studio --host 127.0.0.1 --port 4789
npx traceflow-kit studio --debug
```

`traceflow-kit` contiene los controladores, el almacenamiento en memoria, la
validación del protocolo, Swagger y el servidor que sirve los assets compilados
de `studio/`. No tienes que instalar `traceflow-studio` por separado.

Su código sigue una composición NestJS convencional: `app.module.ts`,
`app.controller.ts` y `app.service.ts` forman la raíz; `core/` contiene las
configuraciones globales; `functions/` contiene helpers reutilizables; y
`modules/traces/` contiene el controller, service, módulo y store en memoria.
El kit no incluye Drizzle, PostgreSQL ni comandos de base de datos.

Sus controllers solo enrutan las peticiones; `TraceService` concentra la
validación, filtros, operaciones del store y el stream SSE.

## Protocolo compartido

Las aplicaciones y herramientas pueden reutilizar los tipos publicados:

```ts
import type { TraceFlowSpanDto, TraceFlowTraceDto } from 'traceflow/protocol';
```

`src/protocol.ts` es una fachada pública, no otro motor de trazabilidad. El
nombre refleja el subpath estable `traceflow/protocol` y evita que los
consumidores conozcan la estructura interna de `modules/`.

## Desarrollo de este repositorio

Instala todas las dependencias del workspace:

```bash
npm ci
```

Compila el runtime, el kit y el frontend:

```bash
npm run build
```

Desarrolla compilador, API del kit y Vite en paralelo:

```bash
npm run dev
```

Ejecuta las validaciones:

```bash
npm run verify
```

Empaqueta cada distribución por separado:

```bash
npm pack --workspace=traceflow
npm pack --workspace=traceflow-kit
```

## API del Studio

- `GET /health`
- `POST /api/v1/spans/batch`
- `GET /api/v1/traces`
- `GET /api/v1/traces/latest`
- `GET /api/v1/traces/:traceId`
- `DELETE /api/v1/traces`
- `DELETE /api/v1/traces/:traceId`
- `GET /api/v1/events`

El Studio mantiene las trazas en memoria y está pensado para desarrollo local.
No debe exponerse públicamente sin autenticación, TLS y controles de acceso.
