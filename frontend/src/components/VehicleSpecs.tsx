export function VehicleSpecs({ rows }: { rows: { label: string; value: string | null }[] }) {
  return <dl className="vehicle-specs type-ui">{rows.filter((row) => row.value !== null && row.value !== '').map((row, index) =>
    <div key={`${row.label}-${index}`}><dt>{row.label}</dt><dd className="type-numeric">{row.value}</dd></div>,
  )}</dl>;
}
