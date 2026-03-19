/**
 * IndexedDB-backed persistence for the ingestion page's selected files.
 *
 * Why IndexedDB:
 * - localStorage cannot reliably store multi-MB PDF/DOCX files.
 * - IndexedDB can persist Blobs across refreshes so the user can continue where they left off.
 */

export type UploadCategory = 'resume' | 'job_description' | 'performance_review';

export type StoredIngestionFile = {
  id: string;
  category: UploadCategory;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  addedAt: number;
  blob: Blob;
};

const DB_NAME = 'career_navigator_ingestion_files_v1';
const STORE_NAME = 'files';
const DB_VERSION = 1;

function assertBrowser() {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in the browser.');
  }
  if (!('indexedDB' in window)) {
    throw new Error('IndexedDB is not available in this browser.');
  }
}

function openDb(): Promise<IDBDatabase> {
  assertBrowser();

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'));
  });
}

// PUBLIC_INTERFACE
export async function putIngestionFile(record: StoredIngestionFile): Promise<void> {
  /** Insert or update a stored ingestion file record. */
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to store ingestion file'));
    tx.objectStore(STORE_NAME).put(record);
  });
  db.close();
}

// PUBLIC_INTERFACE
export async function deleteIngestionFile(id: string): Promise<void> {
  /** Delete a stored ingestion file record by id. */
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to delete ingestion file'));
    tx.objectStore(STORE_NAME).delete(id);
  });
  db.close();
}

// PUBLIC_INTERFACE
export async function listIngestionFiles(): Promise<StoredIngestionFile[]> {
  /** List all stored ingestion file records. */
  const db = await openDb();
  const records = await new Promise<StoredIngestionFile[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve((req.result ?? []) as StoredIngestionFile[]);
    req.onerror = () => reject(req.error ?? new Error('Failed to list ingestion files'));
  });
  db.close();
  return records;
}

// PUBLIC_INTERFACE
export async function clearIngestionFiles(): Promise<void> {
  /** Clear all stored ingestion file records. */
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to clear ingestion files'));
    tx.objectStore(STORE_NAME).clear();
  });
  db.close();
}
