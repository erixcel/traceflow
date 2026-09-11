# traceflow

Los métodos `@Trace({ type: 'controller' })` en Nest conservan los metadatos de
otros decoradores (rutas, permisos y documentación) en cualquier orden. Cuando
están disponibles, exportan `http.request.method` y `traceflow.controller.route`
con la ruta declarada del controller, sin inferir prefijos globales o versionado.
No se añade una dependencia de Nest al runtime.

Los spans incluyen `traceflow.timing.startUnixMs` y `traceflow.timing.endUnixMs`
en sus atributos para conservar fracciones de milisegundo al visualizar
concurrencia. Las fechas ISO y el protocolo existente se mantienen compatibles.
`@Trace()` toma inicio, final y excepciones del mismo reloj
monotónico (`performance.timeOrigin` + `performance.now()`), enviado a OpenTelemetry
como `HrTime`. Esto evita mezclar inicios enteros de `Date.now()` con finales
fraccionarios y conserva el orden de los `await`, incluso en llamadas inmediatas.
Estas capturas incluyen `traceflow.timing.clock: "monotonic"`.

Runtime de trazabilidad para Node.js basado en OpenTelemetry. No depende de
NestJS, Express ni Fastify.

```bash
npm install traceflow
```

```ts
import { startTraceFlow, Trace } from 'traceflow';

startTraceFlow({
  serviceName: 'mi-api',
  studioUrl: 'http://127.0.0.1:4789',
});

class CustomerService {
  @Trace({
    name: 'Listar clientes',
    type: 'service',
    labels: ['customers', 'select'],
  })
  findAll(filters: { page: number; limit: number }) {
    return [];
  }
}
```

`@Trace()` es un decorador de métodos. TypeScript no admite decoradores
directamente sobre funciones sueltas; agrupa las utilidades en una clase de
métodos estáticos:

```ts
import { Trace } from 'traceflow';

export class PaginationFunction {
  @Trace({ name: 'Crear paginación', type: 'method', labels: ['module'] })
  static createPaginationMeta(total: number, page: number, limit: number) {
    return { total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
```

Los métodos estáticos mantienen la firma, el retorno y los errores originales, y
capturan los argumentos y la salida con las opciones de `@Trace()`.

Las clases que representan una tabla pueden instrumentarse una sola vez. `@Table`
envuelve sus métodos propios, usa el tipo visual `table`, conserva el nombre del
método e infiere una etiqueta de operación como `select`, `insert`, `update`,
`delete` o `aggregate`:

```ts
import { Table } from 'traceflow';

@Table({ name: 'users', system: 'postgresql' })
class UserStore {
  async findById(id: number) {
    return database.select().from(users).where(eq(users.id, id));
  }
}
```

Usa `exclude: ['health']` para omitir métodos auxiliares. Un método que ya tenga
`@Trace()` conserva su configuración específica y no se instrumenta dos veces.
Usa `table` para consultas y `method` para métodos internos relevantes que no
representan un controller, un service o una transformación.

Los tipos del protocolo están disponibles en `traceflow/protocol`.

Para instrumentar PostgreSQL (`pg` o Drizzle/TypeORM sobre pool), importa `traceflow/pg`. Puedes habilitar la captura de la consulta SQL y sus filas devueltas:

```ts
import { instrumentPgPool } from 'traceflow/pg';

instrumentPgPool(pool, {
  capture: {
    statement: true, // Captura la sentencia SQL
    parameters: true, // Captura los parámetros en Entrada
    result: true, // Captura las filas devueltas en Salida (o usa rows: true)
  },
});
```

Para abarcar guards, Passport, controllers y servicios en una sola traza, registra
el middleware HTTP antes de las rutas. Es compatible con Nest/Express y reutiliza
un span HTTP automático activo cuando ya existe, por lo que no duplica la raíz:

```ts
import { createTraceFlowHttpMiddleware } from 'traceflow';

app.use(
  createTraceFlowHttpMiddleware({
    capture: {
      query: true,
      body: true,
      formData: true,
      cookies: true,
      authorization: 'scheme',
      headers: ['accept', 'content-type', 'x-request-id'],
    },
  }),
);
```

El middleware elimina la query del nombre y de `url.path`, termina la traza con la
respuesta, asigna internamente el tipo de nodo `http` (manejado de forma automática e
interna sin requerir `@Trace(type='http')` en tus métodos) y marca cierres prematuros o
respuestas 5xx como error. Las seis secciones HTTP se capturan por defecto y las vacías
no se envían. `headers` acepta `true`, `false` o una lista de nombres. `authorization`
acepta `none`, `scheme` o `full`; el valor predeterminado `scheme` conserva únicamente
`Bearer`. Usa `full` solo cuando Studio deba recibir la credencial completa.
`authorization` y `cookie` se presentan en secciones propias y no se duplican dentro
de `headers`.

`labels` son etiquetas visuales opcionales que Studio muestra como badges en
la tarjeta del span. `@Trace()` captura por defecto los argumentos con sus
nombres y el resultado; Studio los presenta como `Input` y `Output`, separados
de los atributos documentales. Usa `capture: { input: false }` o
`capture: { output: false }` cuando no quieras guardar una de las dos partes.
Si el JavaScript compilado no conserva un nombre de parámetro, TraceFlow utiliza
`arg1`, `arg2`, etc.

La implementación está separada por features dentro de `modules/`: `settings/`
contiene la configuración e inicialización de OpenTelemetry; `traces/normal/`
contiene `@Trace()`, `@Table()` y `traces/shared/` contiene las piezas reutilizadas
por los decoradores. Los archivos
siguen extensiones descriptivas como `.constant.ts`, `.interface.ts`,
`.function.ts`, `.type.ts` y `.runtime.ts`. Los archivos `.function.ts` solo
declaran funciones; el estado mutable y las instancias compartidas viven en
archivos `.runtime.ts` o `.constant.ts`.

`src/protocol.ts` es la fachada del subpath público `traceflow/protocol`; no
contiene la implementación del runtime.

Si necesitas importar una pieza concreta, también existen subpaths explícitos:

```ts
import { TRACEFLOW_PROTOCOL_VERSION } from 'traceflow/constants';
import { normalizeAttributes } from 'traceflow/functions';
import type { TraceFlowSpanDto } from 'traceflow/types';
```
