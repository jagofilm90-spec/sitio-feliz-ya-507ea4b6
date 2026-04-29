import { NotasOperativas } from "./NotasOperativas";
import { EventosTimeline } from "./EventosTimeline";

interface Props {
  proveedorId: string;
  proveedorNombre: string;
}

export function TabMemoria({ proveedorId, proveedorNombre }: Props) {
  return (
    <div className="px-8 py-7">
      <div className="grid grid-cols-1 min-[980px]:grid-cols-[2fr_3fr] gap-5">
        <NotasOperativas proveedorId={proveedorId} />
        <EventosTimeline proveedorId={proveedorId} proveedorNombre={proveedorNombre} />
      </div>
    </div>
  );
}
