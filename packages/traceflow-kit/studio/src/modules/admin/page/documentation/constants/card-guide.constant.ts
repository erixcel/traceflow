import type { CardGuide } from '../interfaces/card-guide.interface';

export const CARD_GUIDES: readonly CardGuide[] = [
  {
    type: 'controller',
    purpose: 'Representa el endpoint que recibe la petición y define la entrada del recorrido.',
    placement: 'Siempre aparece en la columna Entrada junto al método, ruta y datos HTTP visibles.',
    content: 'Parámetros, autorización y pasos previos como guards o autenticación se muestran dentro de esta tarjeta.',
    interaction: 'Abre la entrada HTTP o selecciona un paso previo para inspeccionar sus datos.',
  },
  {
    type: 'service',
    purpose: 'Representa una unidad de negocio o coordinación ejecutada por la aplicación.',
    placement: 'Tiene una tarjeta propia. Si llama a otro service, el service descendiente abre una tarjeta nueva.',
    content: 'Las tablas, validaciones y transformaciones ejecutadas directamente por el service permanecen como pasos internos.',
    interaction: 'Usa “Ver pasos” para desplegar consultas y operaciones internas, o “Detalles” para inspeccionar el service.',
  },
  {
    type: 'method',
    purpose: 'Representa un método interno relevante que no constituye por sí mismo un service.',
    placement: 'Permanece dentro del service que lo invoca o forma una tarjeta propia cuando no existe un service padre.',
    content: 'Clase, nombre del método, duración, estado y los datos de entrada o salida capturados.',
    interaction: 'Selecciona el método para inspeccionar sus argumentos, respuesta y contexto de ejecución.',
  },
  {
    type: 'table',
    purpose: 'Representa una consulta real y enumera las tablas detectadas en el SQL.',
    placement: 'Permanece dentro del service propietario. Solo aparece como tarjeta si no existe un service que la contenga.',
    content: 'Operación SQL, tablas utilizadas, duración, orden y errores reportados por la base de datos.',
    interaction: 'Selecciona la consulta para revisar sus atributos y las tablas detectadas.',
  },
  {
    type: 'validation',
    purpose: 'Explica una regla que acepta, rechaza o condiciona los datos del recorrido.',
    placement: 'Se muestra como paso interno de su service o como tarjeta cuando actúa fuera de uno.',
    content: 'Nombre de la regla, duración, estado y error cuando la validación falla.',
    interaction: 'Selecciona el paso para inspeccionar la entrada que fue validada.',
  },
  {
    type: 'transformation',
    purpose: 'Señala una conversión, normalización o construcción de datos.',
    placement: 'Normalmente se conserva como paso interno del service que realiza la transformación.',
    content: 'Método responsable, duración, estado y datos capturados por el span.',
    interaction: 'Abre el detalle para comparar la entrada y la salida de la transformación.',
  },
  {
    type: 'external-api',
    purpose: 'Muestra una llamada saliente hacia otro servicio o proveedor HTTP.',
    placement: 'Aparece dentro del service que la invoca o como una operación independiente.',
    content: 'Destino, método, estado, duración y error de comunicación.',
    interaction: 'Selecciona la llamada para revisar petición, respuesta y contexto capturado.',
  },
  {
    type: 'custom',
    purpose: 'Cubre operaciones del dominio que no encajan en las categorías anteriores.',
    placement: 'Su posición depende del parent span registrado por la instrumentación.',
    content: 'Nombre, método, duración, estado y atributos personalizados.',
    interaction: 'Selecciona la tarjeta para explorar toda la información capturada.',
  },
] as const;
