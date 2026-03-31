/**
 * Simulation page layout override.
 *
 * The simulation dashboard uses its own full-bleed layout with a parameter
 * sidebar. This layout breaks out of the parent's max-w-5xl/padding wrapper
 * using negative margins and viewport-relative sizing, so the simulation
 * page can use the full available width.
 */
export default function SimulateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="-mx-6 -my-8 h-[calc(100vh-3.5rem)] w-[calc(100%+3rem)]">
      {children}
    </div>
  );
}
