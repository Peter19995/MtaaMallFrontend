export const Map = () => {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <iframe
        title="Julian Interiors location map"
        src="https://www.openstreetmap.org/export/embed.html?bbox=36.7702%2C-1.3072%2C36.8427%2C-1.2488&layer=mapnik"
        className="h-72 w-full border-0"
        loading="lazy"
      />
      <div className="border-t border-border bg-background px-4 py-3 text-xs text-text-secondary">
        Nairobi, Kenya
      </div>
    </div>
  )
}

export default Map
