import { collection, getDocs, limit, orderBy, query, startAfter, where } from 'firebase/firestore';
import { db } from '../../config/firebase';

const PAGE_SIZE = 25;

export async function obtenerReportesActivos() {
  const reports = [];
  let cursor;

  while (true) {
    const constraints = [where('estado', '==', 'Pendiente'), orderBy('fecha', 'desc'), limit(PAGE_SIZE)];
    if (cursor) constraints.push(startAfter(cursor));
    const page = await getDocs(query(collection(db, 'reportes'), ...constraints));

    for (const document of page.docs) reports.push({ id: document.id, ...document.data() });
    if (page.docs.length < PAGE_SIZE) return reports;
    cursor = page.docs[page.docs.length - 1];
  }
}
