'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Award,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Loader2,
  Phone,
  RefreshCw,
} from 'lucide-react';
import { guardarSolicitudJubilacion } from '@/app/actions/jubilaciones';
import { formatearFechaHoraMX } from '@/app/lib/fechas';

export interface SolicitudJubilacionItem {
  id: string;
  folio: string;
  telefonoContacto: string;
  actaNacimientoUrl?: string;
  actaNacimientoEstatus?: string;
  actaNacimientoMotivo?: string | null;
  ineUrl?: string;
  ineEstatus?: string;
  ineMotivo?: string | null;
  semanasCotizadasImssUrl?: string;
  semanasCotizadasImssEstatus?: string;
  semanasCotizadasImssMotivo?: string | null;
  recibosNominaUrl?: string;
  recibosNominaEstatus?: string;
  recibosNominaMotivo?: string | null;
  estatus: string;
  motivoRechazo?: string | null;
  fecha: string;
}

interface UsuarioInfo {
  nombreCompleto: string;
  numeroEmpleado: string;
}

function normalizarNombreArchivo(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

export default function JubilacionesTab({
  initialSolicitud = null,
  usuario,
}: {
  initialSolicitud?: SolicitudJubilacionItem | null;
  usuario?: UsuarioInfo;
}) {
  const router = useRouter();
  const [solicitud, setSolicitud] = useState<SolicitudJubilacionItem | null>(initialSolicitud);
  const [telefonoContacto, setTelefonoContacto] = useState<string>(
    initialSolicitud?.telefonoContacto ?? ''
  );

  const [archivoActa, setArchivoActa] = useState<File | null>(null);
  const [archivoIne, setArchivoIne] = useState<File | null>(null);
  const [archivoSemanasImss, setArchivoSemanasImss] = useState<File | null>(null);
  const [archivoRecibosNomina, setArchivoRecibosNomina] = useState<File | null>(null);

  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const existeSolicitud = Boolean(solicitud);

  const documentos = [
    {
      key: 'actaNacimiento',
      formField: 'actaNacimiento',
      label: 'Copia Certificada del Acta de Nacimiento',
      sufijo: 'Acta_Nacimiento',
      archivo: archivoActa,
      setter: setArchivoActa,
      estatus: solicitud?.actaNacimientoEstatus || 'En Revisión',
      motivo: solicitud?.actaNacimientoMotivo ?? null,
    },
    {
      key: 'ine',
      formField: 'ine',
      label: 'Credencial del INE (Copia PDF)',
      sufijo: 'INE',
      archivo: archivoIne,
      setter: setArchivoIne,
      estatus: solicitud?.ineEstatus || 'En Revisión',
      motivo: solicitud?.ineMotivo ?? null,
    },
    {
      key: 'semanasCotizadasImss',
      formField: 'semanasCotizadasImss',
      label: 'Constancia de Semanas Cotizadas en el IMSS',
      sufijo: 'Semanas_IMSS',
      archivo: archivoSemanasImss,
      setter: setArchivoSemanasImss,
      estatus: solicitud?.semanasCotizadasImssEstatus || 'En Revisión',
      motivo: solicitud?.semanasCotizadasImssMotivo ?? null,
    },
    {
      key: 'recibosNomina',
      formField: 'recibosNomina',
      label: '2 Últimos Recibos de Nómina',
      sufijo: 'Recibos_Nomina',
      archivo: archivoRecibosNomina,
      setter: setArchivoRecibosNomina,
      estatus: solicitud?.recibosNominaEstatus || 'En Revisión',
      motivo: solicitud?.recibosNominaMotivo ?? null,
    },
  ];

  const hayDocumentosRechazados = documentos.some((d) => d.estatus === 'Rechazada');

  const prepararArchivo = (
    e: React.ChangeEvent<HTMLInputElement>,
    sufijo: string,
    setter: (file: File | null) => void
  ) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setter(null);
      return;
    }

    const esPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!esPdf) {
      setErrorMsg('Todos los documentos digitales deben estar estrictamente en formato .pdf');
      e.target.value = '';
      setter(null);
      return;
    }

    setErrorMsg(null);
    const numEmp = usuario?.numeroEmpleado || 'SIND';
    const trabajador = normalizarNombreArchivo(usuario?.nombreCompleto || 'Trabajador');
    const nombreEstandar = `${numEmp}_${trabajador}_${sufijo}.pdf`;
    setter(new File([file], nombreEstandar, { type: 'application/pdf' }));
  };

  async function handleSubmitJubilacion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData();

    const telLimpio = telefonoContacto.replace(/\D/g, '');
    if (telLimpio.length < 10) {
      setErrorMsg('Ingresa un teléfono de contacto válido a 10 dígitos.');
      return;
    }

    if (
      !existeSolicitud &&
      (!archivoActa || !archivoIne || !archivoSemanasImss || !archivoRecibosNomina)
    ) {
      setErrorMsg('Debes adjuntar los 4 documentos en formato PDF para iniciar tu trámite.');
      return;
    }

    if (existeSolicitud) {
      const rechazadosSinArchivo = documentos.filter(
        (d) => d.estatus === 'Rechazada' && !d.archivo
      );
      if (rechazadosSinArchivo.length > 0) {
        setErrorMsg(
          `Adjunta el archivo corregido en PDF para: ${rechazadosSinArchivo
            .map((d) => d.label)
            .join(', ')}.`
        );
        return;
      }
    }

    formData.set('telefonoContacto', telLimpio);
    if (archivoActa) formData.set('actaNacimiento', archivoActa);
    if (archivoIne) formData.set('ine', archivoIne);
    if (archivoSemanasImss) formData.set('semanasCotizadasImss', archivoSemanasImss);
    if (archivoRecibosNomina) formData.set('recibosNomina', archivoRecibosNomina);

    setMensajeExito(null);
    setErrorMsg(null);

    startTransition(async () => {
      const result = await guardarSolicitudJubilacion(formData);

      if (result.success && result.data) {
        const folioGenerado = `JUB-2026-${result.data.id.slice(0, 4).toUpperCase()}`;
        setSolicitud({
          id: result.data.id,
          folio: folioGenerado,
          telefonoContacto: result.data.telefonoContacto,
          actaNacimientoUrl: result.data.actaNacimientoUrl,
          actaNacimientoEstatus: result.data.actaNacimientoEstatus,
          actaNacimientoMotivo: result.data.actaNacimientoMotivo,
          ineUrl: result.data.ineUrl,
          ineEstatus: result.data.ineEstatus,
          ineMotivo: result.data.ineMotivo,
          semanasCotizadasImssUrl: result.data.semanasCotizadasImssUrl,
          semanasCotizadasImssEstatus: result.data.semanasCotizadasImssEstatus,
          semanasCotizadasImssMotivo: result.data.semanasCotizadasImssMotivo,
          recibosNominaUrl: result.data.recibosNominaUrl,
          recibosNominaEstatus: result.data.recibosNominaEstatus,
          recibosNominaMotivo: result.data.recibosNominaMotivo,
          estatus: result.data.estatus || 'En Revisión',
          motivoRechazo: result.data.motivoRechazo,
          fecha: formatearFechaHoraMX(new Date().toISOString()),
        });

        setMensajeExito(
          result.esActualizacion
            ? '¡Documento(s) corregido(s) enviado(s) a revisión!'
            : '¡Solicitud de jubilación registrada con éxito!'
        );
        setArchivoActa(null);
        setArchivoIne(null);
        setArchivoSemanasImss(null);
        setArchivoRecibosNomina(null);
        form.reset();
        router.refresh();
        setTimeout(() => setMensajeExito(null), 5000);
      } else {
        setErrorMsg(result.error || 'Ocurrió un error al guardar la solicitud.');
      }
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-in fade-in duration-300">
      {/* IZQUIERDA: Formulario de Solicitud o Reenvío Exclusivo de Rechazados */}
      <div className="p-6 rounded-3xl bg-zinc-50/90 border border-zinc-200/80 shadow-sm space-y-6">
        <div className="space-y-2">
          <div className="p-3 w-fit rounded-xl bg-[#E07A2B]/10 text-[#E07A2B]">
            <Award className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900">
            {!existeSolicitud
              ? 'Solicitar Trámite de Jubilación'
              : hayDocumentosRechazados
              ? 'Corregir Documentos Rechazados'
              : 'Expediente de Jubilación Enviado'}
          </h3>
          <p className="text-xs text-zinc-500 leading-relaxed font-medium">
            Adjunta los 4 documentos digitales en formato PDF e indica tu teléfono actualizado.{' '}
            <strong className="text-zinc-800">
              Las 2 fotografías tamaño pasaporte (cuadradas, blanco y negro) y tu INE original
            </strong>{' '}
            se entregan y gestionan físicamente con el Sindicato.
          </p>
        </div>

        <form onSubmit={handleSubmitJubilacion} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700">
              Teléfono de Contacto (10 dígitos)
            </label>
            <div className="relative">
              <Phone className="h-4 w-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                name="telefonoContacto"
                maxLength={15}
                value={telefonoContacto}
                onChange={(e) => setTelefonoContacto(e.target.value)}
                disabled={existeSolicitud && !hayDocumentosRechazados}
                placeholder="Ej. 4421234567"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:border-[#E07A2B] focus:ring-1 focus:ring-[#E07A2B] shadow-sm disabled:bg-zinc-100 disabled:text-zinc-500"
              />
            </div>
          </div>

          {documentos.map((doc) => {
            const estaRechazado = existeSolicitud && doc.estatus === 'Rechazada';
            const estaAprobado = existeSolicitud && doc.estatus === 'Aprobada';
            const estaEnRevision = existeSolicitud && !estaRechazado && !estaAprobado;

            // Si ya existe la solicitud y este documento NO está rechazado, mostrar solo su estado bloqueado
            if (existeSolicitud && !estaRechazado) {
              return (
                <div
                  key={doc.key}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                    estaAprobado
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                      : 'bg-white border-zinc-200 text-zinc-700'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold block">{doc.label}</span>
                    <span className="text-[11px] text-zinc-500">
                      {estaAprobado
                        ? 'Documento validado y aprobado por el Sindicato.'
                        : 'Documento cargado, en espera de revisión.'}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 ${
                      estaAprobado
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {estaAprobado ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                    )}
                    <span>{estaAprobado ? 'Aprobada' : 'En Revisión'}</span>
                  </span>
                </div>
              );
            }

            // Primera vez o documento RECHAZADO (en rojo para volver a enviar solo ese)
            return (
              <div
                key={doc.key}
                className={`space-y-2 ${
                  estaRechazado
                    ? 'p-4 rounded-2xl bg-rose-50/90 border-2 border-rose-300 shadow-xs'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <label
                    className={`text-xs font-bold ${
                      estaRechazado ? 'text-rose-900' : 'text-zinc-700'
                    }`}
                  >
                    {doc.label} (Solo PDF)
                  </label>
                  {estaRechazado && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wide">
                      Rechazado · Reenviar
                    </span>
                  )}
                </div>

                {estaRechazado && doc.motivo && (
                  <p className="text-xs text-rose-800 leading-snug">
                    <strong>Motivo:</strong> {doc.motivo}
                  </p>
                )}

                <div
                  className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors relative group shadow-sm ${
                    estaRechazado
                      ? 'border-rose-400 hover:border-rose-600 bg-white'
                      : 'border-zinc-200 hover:border-[#E07A2B] bg-white'
                  }`}
                >
                  <input
                    type="file"
                    required
                    accept=".pdf,application/pdf"
                    onChange={(e) => prepararArchivo(e, doc.sufijo, doc.setter)}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className="space-y-1 flex flex-col items-center">
                    <Upload
                      className={`h-5 w-5 ${
                        estaRechazado
                          ? 'text-rose-500 group-hover:text-rose-700'
                          : 'text-zinc-400 group-hover:text-[#E07A2B]'
                      }`}
                    />
                    <span className="text-xs text-zinc-600 truncate max-w-[260px] font-medium">
                      {doc.archivo ? (
                        <strong className={estaRechazado ? 'text-rose-700' : 'text-[#E07A2B]'}>
                          {doc.archivo.name}
                        </strong>
                      ) : estaRechazado ? (
                        'Seleccionar PDF corregido (.pdf)'
                      ) : (
                        'Seleccionar documento (.pdf)'
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {(!existeSolicitud || hayDocumentosRechazados) && (
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3.5 rounded-xl bg-[#E07A2B] hover:bg-[#c46522] text-white text-sm font-bold transition-all shadow-md shadow-[#E07A2B]/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : hayDocumentosRechazados ? (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>Enviar Documento(s) Corregido(s)</span>
                </>
              ) : (
                'Enviar Solicitud de Jubilación'
              )}
            </button>
          )}

          {mensajeExito && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2 shadow-sm animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{mensajeExito}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold flex items-center gap-2 shadow-sm animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </form>
      </div>

      {/* DERECHA: Desglose Individual de los 4 Documentos */}
      <div className="p-6 rounded-3xl bg-zinc-50/90 border border-zinc-200/80 shadow-sm space-y-6 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-zinc-900">Mi Trámite de Jubilación</h3>
              <p className="text-xs text-zinc-500 font-medium">
                Revisión individual de cada documento de tu expediente.
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-zinc-200/80 text-zinc-700 font-bold shadow-sm">
              {solicitud ? solicitud.folio : 'Sin envío'}
            </span>
          </div>

          {!solicitud ? (
            <p className="text-xs text-zinc-500 text-center py-6 font-medium">
              Aún no has registrado tu solicitud de jubilación.
            </p>
          ) : (
            <div className="space-y-3">
              {/* Cabecera del expediente */}
              <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 flex items-center justify-between gap-4 shadow-sm">
                <div className="space-y-0.5">
                  <span className="text-xs text-zinc-400 font-medium block">
                    Registrado: {formatearFechaHoraMX(solicitud.fecha)}
                  </span>
                  <h4 className="text-sm font-bold text-zinc-900">
                    Tel. Contacto: {solicitud.telefonoContacto}
                  </h4>
                </div>

                <span
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm shrink-0 ${
                    solicitud.estatus === 'Aprobada'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : solicitud.estatus === 'Rechazada'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {solicitud.estatus === 'Aprobada' && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  )}
                  {solicitud.estatus === 'Rechazada' && (
                    <XCircle className="h-3.5 w-3.5 text-rose-600" />
                  )}
                  {(!solicitud.estatus || solicitud.estatus === 'En Revisión') && (
                    <Clock className="h-3.5 w-3.5 text-amber-600" />
                  )}
                  <span>{solicitud.estatus || 'En Revisión'}</span>
                </span>
              </div>

              {/* Lista de los 4 documentos con estado individual */}
              {documentos.map((doc) => {
                const rechazado = doc.estatus === 'Rechazada';
                const aprobado = doc.estatus === 'Aprobada';

                return (
                  <div
                    key={doc.key}
                    className={`p-3.5 rounded-2xl border space-y-2 shadow-xs ${
                      rechazado
                        ? 'bg-rose-50/90 border-rose-300'
                        : aprobado
                        ? 'bg-white border-emerald-200'
                        : 'bg-white border-zinc-200/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`text-xs font-bold ${
                          rechazado ? 'text-rose-900' : 'text-zinc-900'
                        }`}
                      >
                        {doc.label}
                      </span>

                      <span
                        className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 ${
                          aprobado
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : rechazado
                            ? 'bg-rose-600 text-white'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {aprobado && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                        {rechazado && <XCircle className="h-3 w-3 text-white" />}
                        {!aprobado && !rechazado && <Clock className="h-3 w-3 text-amber-600" />}
                        <span>{doc.estatus}</span>
                      </span>
                    </div>

                    {rechazado && doc.motivo && (
                      <p className="text-xs text-rose-800 leading-snug">
                        <strong>Motivo del rechazo:</strong> {doc.motivo}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 flex items-center gap-3 text-xs text-zinc-500 shadow-sm font-medium">
          <AlertCircle className="h-5 w-5 text-[#E07A2B] shrink-0" />
          <span>
            Los registros aprobados pasarán a formar parte del expediente de trabajo. Este registro se borrará automáticamente en 1 semana a partir del día de su aprobación.
          </span>
        </div>
      </div>
    </div>
  );
}