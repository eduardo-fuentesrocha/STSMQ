import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { listarArchivosR2 } from '@/app/lib/r2';

function esRolAdmin(rol?: string | null) {
  return rol === 'admin' || rol === 'ADMIN';
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const usuarioNum = cookieStore.get('usuario_num')?.value;
    const usuarioRol = cookieStore.get('usuario_rol')?.value;

    if (!usuarioNum) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (!esRolAdmin(usuarioRol)) {
      return NextResponse.json({ error: 'Acceso restringido a administradores' }, { status: 403 });
    }

    const prefijo = 'procedimientos/';
    const objetos = await listarArchivosR2(prefijo);

    const archivos = objetos
      .filter((obj) => obj.Key && obj.Key.toLowerCase().endsWith('.pdf'))
      .map((obj) => {
        const key = obj.Key!;
        const nombreArchivo = key.replace(prefijo, '');
        const titulo = nombreArchivo
          .replace(/\.pdf$/i, '')
          .replace(/[-_]+/g, ' ')
          .trim();

        return {
          key,
          archivo: nombreArchivo,
          titulo,
          size: obj.Size ?? 0,
          lastModified: obj.LastModified ?? null,
        };
      });

    return NextResponse.json({ archivos });
  } catch (error) {
    console.error('Error al listar procedimientos en R2:', error);
    return NextResponse.json({ error: 'Error al obtener los procedimientos' }, { status: 500 });
  }
}