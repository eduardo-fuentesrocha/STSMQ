import { NextResponse } from 'next/server';
import { obtenerArchivoR2 } from '@/app/lib/r2';

async function buscarFotoEnR2(numero: string) {
  const posiblesRutas = [
    `fotos-credencial/${numero}.jpeg`,
    `fotos-credencial/${numero}.jpg`,
    `fotos-credencial/${numero}.png`,
    `fotos-credencial/${numero}.webp`,
  ];

  for (const path of posiblesRutas) {
    try {
      const res = await obtenerArchivoR2(path);
      if (res && res.Body) {
        return { res, path };
      }
    } catch (e: any) {
      if (e?.name !== 'NoSuchKey' && e?.$metadata?.httpStatusCode !== 404) {
        console.error(`Error inesperado consultando ${path} en R2:`, e);
      }
    }
  }

  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ numeroEmpleado: string }> }
) {
  try {
    const resolvedParams = await params;
    const { numeroEmpleado } = resolvedParams;

    if (!numeroEmpleado) {
      return new NextResponse('Número de empleado no proporcionado', { status: 400 });
    }

    let encontrada = await buscarFotoEnR2(numeroEmpleado);

    if (!encontrada && numeroEmpleado !== '00000') {
      encontrada = await buscarFotoEnR2('00000');
    }

    if (!encontrada || !encontrada.res.Body) {
      return new NextResponse('Fotografía no encontrada', { status: 404 });
    }

    const { res: r2Response, path: rutaEncontrada } = encontrada;
    const body = r2Response.Body;

    if (!body) {
      return new NextResponse('Fotografía no encontrada', { status: 404 });
    }

    const imageBytes = await body.transformToByteArray();
    const buffer = Buffer.from(imageBytes);
    const contentType =
      r2Response.ContentType ||
      (rutaEncontrada.endsWith('.png')
        ? 'image/png'
        : rutaEncontrada.endsWith('.webp')
          ? 'image/webp'
          : 'image/jpeg');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error al procesar la fotografía privada desde R2:', error);
    return new NextResponse('Error al cargar la imagen', { status: 500 });
  }
}