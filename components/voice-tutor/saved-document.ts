"use client";

/**
 * Cours du Professeur vocal gardé dans le navigateur (IndexedDB), un par
 * compte : en revenant sur la page, l'élève retrouve son PDF, son texte déjà
 * lu (pas de nouvelle lecture des pages scannées) et la page où il en était,
 * jusqu'à ce qu'il le retire ou en importe un autre. Le fichier ne quitte
 * jamais l'appareil.
 *
 * Toutes les fonctions échouent en silence (navigation privée, stockage
 * plein ou bloqué) : le cours n'est alors simplement pas retrouvé.
 */

export interface SavedDocument {
  userId: string;
  name: string;
  size: number;
  file: Blob;
  /** Texte de chaque page (index 0 = page 1). */
  pageTexts: string[];
  /** Page affichée la dernière fois. */
  page: number;
  savedAt: number;
}

const DB_NAME = "eduia-voice-tutor";
const STORE = "documents";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: "userId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("blocked"));
  }).catch((error) => {
    dbPromise = null;
    throw error;
  });
  return dbPromise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await openDb();
  return new Promise<T | undefined>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = action(transaction.objectStore(STORE));
    transaction.oncomplete = () => resolve(request ? request.result : undefined);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function loadSavedDocument(userId: string): Promise<SavedDocument | null> {
  try {
    const saved = await withStore<SavedDocument | undefined>("readonly", (store) => store.get(userId));
    return saved && saved.file instanceof Blob && Array.isArray(saved.pageTexts) ? saved : null;
  } catch {
    return null;
  }
}

export async function saveDocument(document: SavedDocument): Promise<void> {
  try {
    await withStore("readwrite", (store) => store.put(document));
  } catch {
    // Stockage indisponible : le cours ne sera pas retrouvé au prochain passage.
  }
}

export async function saveDocumentPage(userId: string, page: number): Promise<void> {
  try {
    await withStore("readwrite", (store) => {
      const request = store.get(userId);
      request.onsuccess = () => {
        const saved = request.result as SavedDocument | undefined;
        if (saved && saved.page !== page) store.put({ ...saved, page });
      };
    });
  } catch {
    // Sans conséquence : le cours rouvrira simplement à une autre page.
  }
}

export async function deleteSavedDocument(userId: string): Promise<void> {
  try {
    await withStore("readwrite", (store) => store.delete(userId));
  } catch {
    // Rien à faire.
  }
}
