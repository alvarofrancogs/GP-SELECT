/** `lang` marks a row written in another language than the page (the Admin's Spanish custom specifications). */
export function VehicleSpecs({ rows }: { rows: { label: string; value: string | null; lang?: string }[] }) {
  return <dl className="vehicle-specs type-ui">{rows.filter((row) => row.value !== null && row.value !== '').map((row, index) =>
    <div key={`${row.label}-${index}`} lang={row.lang}><dt>{row.label}</dt><dd className="type-numeric">{row.value}</dd></div>,
  )}</dl>;
}
