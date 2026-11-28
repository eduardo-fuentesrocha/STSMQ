'use client';

import { useEffect, useState } from 'react';

interface ProcedimientoItem {
  key: string;
  archivo: string;
  titulo: string;
  size: number;
  lastModified: string | null;
}

function formatearTamano(bytes: number) {
  if (!bytes) return '—';
  const kb = bytes / 1024;
  return kb >= 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(1)} KB`;
}

export default function ProcedimientosAdmin() {
  const [archivos, setArchivos] = useState<ProcedimientoItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    async function cargarProcedimientos() {
      try {
        setCargando(true);
        setError(null);

        const res = await fetch('/api/admin/procedimientos', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error('No se pudieron cargar los procedimientos internos.');
        }

        const data = await res.json();
        if (activo) {
          setArchivos(Array.isArray(data.archivos) ? data.archivos : []);
        }
      } catch (err: any) {
        if (activo) {
          setError(err?.message || 'Error al consultar los procedimientos.');
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarProcedimientos();
    return () => {
      activo = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      {cargando && (
        <p className="text-sm text-zinc-500 py-6">Cargando procedimientos...</p>
      )}

      {!cargando && error && (
        <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
          {error}
        </div>
      )}

      {!cargando && !error && archivos.length === 0 && (
        <p className="text-sm text-zinc-500 py-6">
          No hay procedimientos disponibles.
        </p>
      )}

      {!cargando && !error && archivos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {archivos.map((item) => {
            const urlVisor = `/api/admin/ver-archivo?url=${encodeURIComponent(item.key)}`;

            return (
              <div
                key={item.key}
                className="flex flex-col justify-between gap-4 p-4 bg-white border border-zinc-200 rounded-xl"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-zinc-900 break-words">
                    {item.titulo}
                  </p>
                  <p className="text-xs text-zinc-500 truncate" title={item.archivo}>
                    {item.archivo} · {formatearTamano(item.size)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={urlVisor}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-900 text-white hover:bg-zinc-800"
                  >
                    Abrir PDF
                  </a>
                  <a
                    href={`${urlVisor}&download=1`}
                    download={item.archivo}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                  >
                    Descargar
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}