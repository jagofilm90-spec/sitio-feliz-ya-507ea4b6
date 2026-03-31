
-- Re-link all attendance records using zk_mapeo (correct per-device mapping)
UPDATE public.asistencia a
SET empleado_id = m.empleado_id
FROM public.zk_mapeo m
WHERE a.zk_user_id = m.zk_user_id
  AND a.dispositivo = m.dispositivo;
