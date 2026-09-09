import { CardGuideComponent } from '../components/card-guide.component';
import { JourneyExampleComponent } from '../components/journey-example.component';
import { CARD_GUIDES } from '../constants/card-guide.constant';

export function DocumentationLayout(): React.JSX.Element {
  return (
    <section className="h-full overflow-y-auto bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10 lg:py-10">
        <div className="max-w-3xl">
          <span className="text-[10px] font-extrabold tracking-[0.16em] text-pink-600 uppercase dark:text-pink-400">Guía visual</span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">Cómo leer un recorrido</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Este recorrido de ejemplo representa la creación de un pedido, desde la petición HTTP hasta el resultado. Está construido con el mismo canvas de TraceFlow Studio: puedes buscar, expandir
            los pasos, ajustar la vista y abrir los detalles de cada operación.
          </p>
        </div>

        <JourneyExampleComponent />

        <section className="mt-8">
          <span className="text-[10px] font-bold tracking-[0.14em] text-pink-600 uppercase dark:text-pink-400">Estados y líneas</span>
          <div className="mt-4 grid gap-3 text-xs text-zinc-600 sm:grid-cols-2 lg:grid-cols-5 dark:text-zinc-400">
            <LegendStatusCard marker="✓" markerClass="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" title="Correcto" text="El paso terminó sin errores." />
            <LegendStatusCard marker="!" markerClass="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" title="Error" text="El paso o uno de sus descendientes falló." />
            <LegendStatusCard marker="·" markerClass="bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" title="Sin confirmar" text="La traza todavía no tiene un estado final." />
            <LegendLineCard title="Conexión" text="Indica una llamada observada entre dos tarjetas." />
            <LegendLineCard dashed title="Incompleta" text="La ejecución sigue abierta o no registró su cierre." />
          </div>
        </section>

        <div className="mt-10 flex items-end justify-between gap-5">
          <div>
            <span className="text-[10px] font-extrabold tracking-[0.16em] text-pink-600 uppercase dark:text-pink-400">Leyenda completa</span>
            <h3 className="mt-2 text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">Tipos de tarjeta</h3>
          </div>
          <p className="hidden max-w-md text-right text-xs leading-5 text-zinc-500 md:block dark:text-zinc-400">
            Cada color conserva el mismo significado en el encabezado, el borde, los conectores y los pasos internos.
          </p>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {CARD_GUIDES.map((guide) => (
            <CardGuideComponent key={guide.type} guide={guide} />
          ))}
        </div>
      </div>
    </section>
  );
}

function LegendStatusCard({ marker, markerClass, title, text }: { marker: string; markerClass: string; title: string; text: string }): React.JSX.Element {
  return (
    <article className="flex min-h-28 items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <span className={`grid size-8 shrink-0 place-items-center rounded-full font-bold ${markerClass}`}>{marker}</span>
      <div className="min-w-0">
        <strong className="text-zinc-800 dark:text-zinc-200">{title}</strong>
        <p className="mt-1 leading-4">{text}</p>
      </div>
    </article>
  );
}

function LegendLineCard({ dashed = false, title, text }: { dashed?: boolean; title: string; text: string }): React.JSX.Element {
  return (
    <article className="flex min-h-28 items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <span className="flex h-8 w-10 shrink-0 items-center" aria-hidden="true">
        <span className={`w-full border-t-2 ${dashed ? 'border-dashed' : ''} border-zinc-400 dark:border-zinc-500`} />
      </span>
      <div className="min-w-0">
        <strong className="text-zinc-800 dark:text-zinc-200">{title}</strong>
        <p className="mt-1 leading-4">{text}</p>
      </div>
    </article>
  );
}
