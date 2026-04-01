export function contarDiasVacaciones(fechaInicio: string, fechaFin: string): number {
  if (!fechaInicio || !fechaFin) return 0;

  const [inicioY, inicioM, inicioD] = fechaInicio.split("-").map(Number);
  const [finY, finM, finD] = fechaFin.split("-").map(Number);

  const inicio = new Date(Date.UTC(inicioY, inicioM - 1, inicioD));
  const fin = new Date(Date.UTC(finY, finM - 1, finD));

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime()) || fin < inicio) {
    return 0;
  }

  let count = 0;
  const cursor = new Date(inicio);

  while (cursor <= fin) {
    if (cursor.getUTCDay() !== 0) count++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return count;
}
