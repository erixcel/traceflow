# traceflow-kit

CLI, API local, Swagger y Studio visual para desarrollar con TraceFlow.

```bash
npm install -D traceflow-kit
npx traceflow-kit studio
```

El servidor se inicia en `http://127.0.0.1:4789` y su documentación Swagger en
`http://127.0.0.1:4789/docs`.

## Estructura

El kit sigue una estructura NestJS tradicional, sin conexión a base de datos:

```text
src/
├── core/                         # configuraciones globales de Nest/Fastify
│   ├── cors.server.ts
│   ├── swagger.server.ts
│   ├── validation.server.ts
│   ├── static.server.ts
│   └── traceflow-exception.server.ts
├── functions/                    # funciones reutilizables sin estado
├── modules/
│   └── traces/                   # único feature del kit
│       ├── dto/
│       │   ├── trace-list.dto.ts
│       │   └── trace-span-batch.dto.ts
│       ├── types/
│       ├── validation/
│       ├── trace.controller.ts   # solo enruta
│       ├── trace.service.ts      # coordina el caso de uso
│       ├── trace.store.ts        # almacenamiento en memoria
│       └── trace.module.ts
├── app.controller.ts
├── app.service.ts
├── app.module.ts
├── main.ts
└── server.ts
```

El frontend de `studio/` está organizado por módulos y rutas anidadas:

```text
studio/src/
├── routes.tsx                    # router raíz de la aplicación
├── modules/
│   └── admin/
│       ├── components/           # piezas reutilizables del módulo
│       ├── layout/               # navbar y sidebar compartidos
│       ├── stores/               # estado global visual con Zustand
│       └── page/
│           ├── flows/
│           │   ├── components/   # cards y visor JSON reutilizables
│           │   ├── layout/       # historial, canvas y panel lateral
│           │   └── index.tsx     # entrada y coordinación de la página
│           └── studio/
│               ├── layout/       # estructura visual de la página futura
│               └── index.tsx     # entrada de la página
└── tailwind.css                  # entrada del compilador de Tailwind
```

Las rutas disponibles son `/admin/flows` y `/admin/studio`; `/` y `/admin`
redirigen a Flows. Cada página mantiene juntos sus componentes, funciones,
contratos, hooks y stores. Los archivos visuales usan sufijos explícitos:
`.layout.tsx` para regiones fijas de una vista y `.component.tsx` para piezas
reutilizables o repetidas. La interfaz utiliza Tailwind CSS directamente en los
componentes; la vista de recorrido no necesita una hoja de estilos manual.

## Leer una ejecución

`/admin/flows` abre **Flujo agrupado**, un lienzo de React Flow con tres columnas:
**Entrada**, **Proceso** y **Salida**. La entrada conserva el controller y el proceso
muestra sus llamadas directas. Cada servicio contiene su árbol de pasos completo:
servicios hijos, consultas y métodos permanecen anidados bajo quien los ejecutó.
La numeración se lee de arriba abajo; los intervalos solapados se agrupan como
**En paralelo**, y **Después** separa las operaciones posteriores, como crear la
paginación tras esperar las consultas. Sin tiempos precisos, el solapamiento se
identifica como estimado.

Al pulsar un paso numerado se abre su tarjeta completa a la derecha, conectada por
una **flecha discontinua «Detalle»** desde la fila seleccionada. Es una exploración,
no otra etapa de ejecución: las conexiones del recorrido siguen siendo las mismas.
Puedes continuar abriendo sus hijos; elegir otro paso sustituye la rama de detalles
anterior. La × de cada tarjeta cierra ese nivel y sus descendientes, y **Cerrar
detalles** vuelve al resumen. Los accesos Entrada, Salida y Detalles abren los datos
capturados en el panel lateral. Esto también funciona con auth y sus consultas.
Los pasos sin padre conservan sus tarjetas sin inventar conexiones a una respuesta.

Las tarjetas usan un acento distinto según el tipo semántico del nodo:
controller, service, método, table, validación, transformación, API externa u
operación personalizada.

Al abrir o cerrar detalles se recoloca y encuadra el recorrido para mantener visibles
las tarjetas. **Contraer pasos** oculta los niveles internos sin quitar las llamadas
directas ni alterar su orden. **Ajustar vista** encuadra todo el lienzo.
La búsqueda por método, clase o recurso resalta los grupos
coincidentes y abre sus pasos, conservando todos los nodos y conexiones.
**Todos los pasos** mantiene la exploración libre del grafo sin agrupar.

Cuando la aplicación registra `createTraceFlowHttpMiddleware()` antes de sus
rutas, Studio usa el span HTTP como envoltura. La tarjeta de entrada conserva el
controller y muestra bajo **Antes del controller** los guards y validaciones
instrumentados, de modo que autenticación y ejecución comparten un solo `traceId`.

El control **Campos de entrada** permite mostrar u ocultar query params, form-data,
cookies, body, autorización y headers. Studio guarda la selección en el navegador
y oculta las secciones vacías por defecto; Cookies y Headers empiezan apagados.
Estas reglas se pueden cambiar desde el mismo control.
La tarjeta resume únicamente las secciones visibles y **Ver datos HTTP** abre sus
valores completos. Esta preferencia controla la presentación. La aplicación decide
qué se captura mediante `createTraceFlowHttpMiddleware({ capture: ... })`.

La entrada muestra los query params y, en controllers Nest instrumentados,
el método HTTP y la ruta declarada. Esa ruta no incluye prefijos globales ni
versionado. Los accesos **Ver datos HTTP** y **Ver salida** abren directamente
la pestaña correspondiente. **Contexto** reúne atributos, errores e identificadores.

Las consultas SQL instrumentadas muestran **Tablas usadas** y la operación en las
tarjetas, los pasos expandidos y el panel de detalles. Un JOIN conserva un solo
paso con todas sus tablas; los contadores suman una referencia por tabla y consulta,
aunque la misma tabla aparezca varias veces en esa consulta. La búsqueda encuentra
cualquiera de esas tablas. Si no fue posible identificar las tablas, Studio lo indica
sin convertir el nombre de la consulta en una tabla. Cuando se captura el SQL,
**Ver consulta SQL** permite abrirlo desde el panel de detalles.

Las duraciones incluyen los pasos internos y no se suman entre ramas paralelas.
Las trazas nuevas conservan tiempos con
fracciones de milisegundo; las anteriores usan los intervalos ISO disponibles.
La marca `traceflow.timing.clock: "monotonic"` identifica capturas con un mismo
reloj para el inicio y el final. En ellas, `await consulta; await Promise.all(3);
await clientes` conserva sus grupos 1–3–1, aunque las consultas devuelvan
inmediatamente arrays vacíos. Las trazas anteriores o sin esa marca mantienen
su visualización como estimación y Studio pide volver a ejecutar la API: sus
timestamps no permiten reconstruir con certeza el orden original. No se aplica
un umbral artificial que oculte el paralelismo real de las llamadas rápidas.
Los errores propagados conservan su estado, y los pasos definidos sin spans
se muestran como **sin observar**, separados de la ejecución registrada.

Para comprobar los modelos de agrupación, búsqueda y metadatos del controller,
ejecuta `npm test` desde la raíz del workspace. `npm run build:kit` actualiza el
frontend compilado que Studio sirve en el puerto 4789; durante `npm run dev`,
el frontend con recarga automática está en el puerto 5173. El servidor resuelve
los archivos en cada petición para admitir nuevos nombres de assets después de
recompilar; la conexión de eventos actualiza la lista de trazas al reconectar.

`app.module.ts`, `app.controller.ts` y `app.service.ts` son la composición raíz,
igual que en una aplicación NestJS convencional. `modules/traces` concentra la
API de trazas, el servicio y el store en memoria. No hay Drizzle, PostgreSQL ni
comandos de migración.

Si el consumidor también usa NestJS, puede reutilizar el módulo sin levantar un
segundo servidor:

```ts
import { Module } from '@nestjs/common';
import { TraceFlowKitModule } from 'traceflow-kit';

@Module({
  imports: [TraceFlowKitModule.forRoot()],
})
export class AppModule {}
```

Para ejecutar el Studio completo (API local, Swagger y frontend), usa el CLI
`traceflow-kit studio`. Esa ejecución crea su propio servidor Fastify y mantiene
las trazas en memoria.

Los endpoints se mantienen iguales:

- `GET /` (Studio visual cuando `serveStudio` está activo)
- `GET /api`
- `GET /health`
- `POST /api/v1/spans/batch`
- `GET /api/v1/traces`
- `GET /api/v1/traces/latest`
- `GET /api/v1/traces/:traceId`
- `DELETE /api/v1/traces`
- `DELETE /api/v1/traces/:traceId`
- `GET /api/v1/events`
