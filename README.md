<div align="center">

# TraceFlow

**Trazabilidad ligera para aplicaciones Node.js, impulsada por OpenTelemetry.**

Instrumenta operaciones, captura entradas y salidas y explora trazas en un Studio local, sin acoplar tu aplicación a un framework.

`Node.js 20.19+ / 22.12+` · `npm 11+` · `OpenTelemetry` · `TypeScript`

[Inicio rápido](#-inicio-rápido) · [Instrumentación](#-instrumentación) · [Studio](#-traceflow-studio) · [Desarrollo local](#-desarrollo-del-repositorio)

</div>

---

## ✨ ¿Qué ofrece?

| Funcionalidad | Descripción |
| :-- | :-- |
| **Trazas con OpenTelemetry** | Crea spans y propaga el contexto entre operaciones. |
| **Decoradores sencillos** | Instrumenta métodos con `@Trace()` y clases de acceso a datos con `@Table()`. |
| **Entrada y salida** | Captura argumentos, respuestas y excepciones de las operaciones. |
| **Studio local** | Inspecciona trazas mediante una interfaz web y una API documentada con Swagger. |
| **Runtime independiente** | No requiere NestJS, Express ni Fastify en la aplicación consumidora. |
| **HTTP opcional** | Permite instrumentación HTTP automática o trazas creadas solo con decoradores. |

> [!NOTE]
> TraceFlow Studio está diseñado para **desarrollo local**. Mantiene las trazas en memoria y no debe exponerse públicamente sin autenticación, TLS y controles de acceso.

## 📦 Paquetes

| Paquete | Responsabilidad | Instalación |
| :-- | :-- | :-- |
| **`traceflow`** | Runtime de producción, OpenTelemetry, decoradores, tipos y protocolo. | `npm install traceflow` |
| **`traceflow-kit`** | CLI, API local, Swagger y servidor del Studio. | `npm install -D traceflow-kit` |
| **`traceflow-kit/studio/`** | Frontend React/Vite integrado en el kit. | No se instala por separado. |

El repositorio es un **npm workspace**, pero cada consumidor instala únicamente los paquetes que necesita.

## 🚀 Inicio rápido

### 1. Instala el runtime

```bash
npm install traceflow
```

### 2. Inicializa TraceFlow

Hazlo **antes de importar el resto de la aplicación**.

```ts
// src/instrumentation.ts
import { startTraceFlow } from 'traceflow';

startTraceFlow({
  serviceName: 'mi-api',
  studioUrl: 'http://127.0.0.1:4789',
});
```

### 3. Instrumenta una operación

```ts
import { Trace } from 'traceflow';

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

`@Trace()` captura **argumentos y respuesta** por defecto. El Studio los presenta por separado, junto con los atributos documentales.

### 4. Abre el Studio

```bash
npm install -D traceflow-kit
```

Añade este script a tu `package.json`:

```json
{
  "scripts": {
    "traceflow:studio": "traceflow-kit studio"
  }
}
```

```bash
npm run traceflow:studio
```

| Recurso | URL local |
| :-- | :-- |
| **Studio** | http://127.0.0.1:4789 |
| Swagger | http://127.0.0.1:4789/docs |
| OpenAPI JSON | http://127.0.0.1:4789/docs-json |
| Ingesta de spans | http://127.0.0.1:4789/api/v1/spans/batch |

## 🧩 Instrumentación

### `@Trace()` — operaciones de negocio

```ts
import { Trace } from 'traceflow';

export class CustomerService {
  @Trace({ name: 'Listar clientes', type: 'service' })
  async findAll(filters: { page: number; limit: number }) {
    return [];
  }
}
```

| Comportamiento | Detalle |
| :-- | :-- |
| **Entrada** | Captura argumentos de manera predeterminada. |
| **Salida** | Captura el valor devuelto de manera predeterminada. |
| **Parámetros** | Conserva sus nombres si el JavaScript compilado lo permite; en caso contrario usa `arg1`, `arg2`, etc. |
| **Excepciones** | Las registra como parte de la operación instrumentada. |
| **Métodos estáticos** | Son compatibles con `@Trace()`. |
| **Compatibilidad** | `@TraceNode()` sigue disponible como alias. |

Desactiva una captura específica con `capture`:

```ts
@Trace({ name: 'Consultar clientes', type: 'service', capture: { input: false } })
```

Para desactivar la salida, utiliza `capture: { output: false }`.

> [!TIP]
> TypeScript no admite decoradores directamente sobre funciones independientes. Si necesitas instrumentar una utilidad, conviértela en un método estático.

```ts
import { Trace } from 'traceflow';

export class PaginationFunction {
  @Trace({ name: 'Crear paginación', type: 'method' })
  static createPaginationMeta(total: number, page: number, limit: number) {
    const totalPages = Math.ceil(total / limit);
    return {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
}
```

### `@Table()` — acceso a datos

Un decorador en la clase instrumenta sus métodos invocados y genera spans de tipo `table`.

```ts
import { Table } from 'traceflow';

@Table({ name: 'users', system: 'postgresql' })
export class UserStore {
  async findById(id: number) {
    return database.select().from(users).where(eq(users.id, id));
  }
}
```

Cada span incluye la **tabla**, el **método** y la **operación inferida**.

- Usa `exclude` para omitir métodos auxiliares.
- Si un método ya tiene su propio `@Trace()`, no se genera un span duplicado.
- Reserva `table` para consultas; usa `method` para operaciones internas relevantes que no sean controller, service o transformación.

### Instrumentación HTTP

TraceFlow instrumenta HTTP desde la capa de Node.js: **no necesitas plugins independientes** para NestJS, Express o Fastify.

Cuando se utiliza `createTraceFlowHttpMiddleware`, la petición entrante se identifica automáticamente como nodo `http` y se relaciona con el controller instrumentado mediante `@Trace({ type: 'controller' })`.

Si prefieres trabajar solo con decoradores:

```ts
startTraceFlow({
  serviceName: 'worker',
  instrumentHttp: false,
});
```

## 🖥️ TraceFlow Studio

El kit agrupa la interfaz React/Vite compilada, el servidor local y sus endpoints. **No necesitas instalar `traceflow-studio` por separado.**

### Comandos del CLI

| Comando | Uso |
| :-- | :-- |
| `npx traceflow-kit studio` | Inicia el Studio local. |
| `npx traceflow-kit studio --no-open` | No abre el navegador. |
| `npx traceflow-kit studio --host 127.0.0.1 --port 4789` | Configura host y puerto. |
| `npx traceflow-kit studio --debug` | Habilita el modo debug. |

### API disponible

| Método | Endpoint | Propósito |
| :-- | :-- | :-- |
| `GET` | `/health` | Estado del servidor. |
| `POST` | `/api/v1/spans/batch` | Recibir spans por lote. |
| `GET` | `/api/v1/traces` | Listar trazas. |
| `GET` | `/api/v1/traces/latest` | Consultar la traza más reciente. |
| `GET` | `/api/v1/traces/:traceId` | Consultar una traza por ID. |
| `DELETE` | `/api/v1/traces` | Eliminar las trazas almacenadas. |
| `DELETE` | `/api/v1/traces/:traceId` | Eliminar una traza. |
| `GET` | `/api/v1/events` | Stream de eventos SSE. |

## 🏗️ Arquitectura

```text
packages/
├── traceflow/                      # Runtime independiente de frameworks
│   └── src/
│       ├── modules/
│       │   ├── settings/           # Configuración y arranque OpenTelemetry
│       │   └── traces/
│       │       ├── normal/         # Decorador @Trace()
│       │       └── shared/         # Contratos y funciones del decorador
│       └── protocol.ts             # Fachada del protocolo público
└── traceflow-kit/                  # Herramientas de desarrollo
    └── studio/                     # Frontend React/Vite integrado
```

| Componente | Decisiones de diseño |
| :-- | :-- |
| **Runtime** | Sin dependencias de NestJS, Express ni Fastify. |
| **Kit** | Utiliza NestJS sobre Fastify; `app.module.ts`, `app.controller.ts` y `app.service.ts` forman la raíz. |
| **`core/` y `functions/`** | Configuración global y helpers reutilizables del kit. |
| **`modules/traces/`** | Controller, service, módulo y store en memoria. |
| **`TraceService`** | Centraliza validación, filtros, operaciones del store y stream SSE. Los controllers solo enrutan. |
| **Persistencia** | En memoria; el kit no incluye Drizzle, PostgreSQL ni comandos de base de datos. |

**Convenciones internas del runtime:** los contratos y utilidades siguen sufijos descriptivos como `.interface.ts`, `.type.ts` y `.function.ts`. Las funciones en archivos `.function.ts` no conservan estado ni constantes globales; dichos valores pertenecen a `.runtime.ts` o `.constant.ts`.

### Protocolo compartido

Puedes usar los DTO públicos sin importar rutas internas:

```ts
import type { TraceFlowSpanDto, TraceFlowTraceDto } from 'traceflow/protocol';
```

`src/protocol.ts` es una **fachada pública** que respalda el subpath estable `traceflow/protocol`; no implementa un segundo motor de trazabilidad.

## 🛠️ Desarrollo del repositorio

| Acción | Comando |
| :-- | :-- |
| Instalar el workspace | `npm ci` |
| Compilar runtime, kit y Studio | `npm run build` |
| Ejecutar compiladores, API y Vite en paralelo | `npm run dev` |
| Ejecutar validaciones | `npm run verify` |
| Empaquetar runtime | `npm pack --workspace=traceflow` |
| Empaquetar kit | `npm pack --workspace=traceflow-kit` |

## 🔗 Consumir TraceFlow sin publicarlo en npm

Puedes probar el proyecto desde otra aplicación usando paquetes `.tgz` o enlaces simbólicos.

### Opción A — paquetes `.tgz`

**En el repositorio de TraceFlow:**

```bash
git clone <url-del-repositorio>
cd traceflow
npm ci
npm run build
npm pack --workspace=traceflow
npm pack --workspace=traceflow-kit
```

Los archivos `.tgz` se generan en `packages/traceflow/` y `packages/traceflow-kit/`.

**En el proyecto consumidor:**

```bash
npm install /ruta/absoluta/traceflow/packages/traceflow/traceflow-0.1.0.tgz
npm install -D /ruta/absoluta/traceflow/packages/traceflow-kit/traceflow-kit-0.1.0.tgz
```

> [!IMPORTANT]
> Los nombres `traceflow-0.1.0.tgz` y `traceflow-kit-0.1.0.tgz` son ejemplos: reemplázalos por los archivos y versiones que genere `npm pack`.

Configura el script `traceflow:studio` indicado en [Inicio rápido](#-inicio-rápido) y levántalo en una terminal:

```bash
npm run traceflow:studio
```

En otra terminal, inicia tu aplicación, configurada con:

```ts
import { startTraceFlow } from 'traceflow';

startTraceFlow({
  serviceName: 'mi-proyecto',
  studioUrl: 'http://127.0.0.1:4789',
});
```

Si modificas el código de TraceFlow, **recompila, vuelve a empaquetar y reinstala** los `.tgz` para recibir los cambios.

### Opción B — `npm link`

Registra ambos paquetes desde el repositorio de TraceFlow:

```bash
cd /ruta/absoluta/traceflow
npm run build
```
```bash
cd packages/traceflow
npm link
```
```bash
cd ../traceflow-kit
npm link
```

Comando para hacer todo al mismo tiempo

```bash
cd /ruta/absoluta/traceflow
npm run dev
```

Enlázalos desde el consumidor:

```bash
cd /ruta/absoluta/mi-proyecto
npm link traceflow traceflow-kit
```
Desenlazar desde el consumidor:

```bash
cd /ruta/absoluta/mi-proyecto
npm unlink traceflow traceflow-kit
```


<div align="center">

**TraceFlow** · Instrumenta en tu aplicación. Explora en local.

</div>
