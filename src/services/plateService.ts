import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  runTransaction,
  increment,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { Batch, Plate, PlateModel, SystemSettings } from '../types';

const SETTINGS_DOC = 'global';

export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const snap = await getDoc(doc(db, 'settings', SETTINGS_DOC));
    if (snap.exists()) {
      return snap.data() as SystemSettings;
    }
  } catch (e) {
    console.warn('Could not fetch remote settings, using defaults:', e);
  }

  const cached = localStorage.getItem('dinamico_pro_settings');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // ignore
    }
  }

  const defaultDomain = typeof window !== 'undefined' ? window.location.origin : 'https://dinamicopro.app';
  return {
    id: SETTINGS_DOC,
    publicDomain: defaultDomain,
    installationName: 'DINÂMICO PRO',
    initialized: true,
  };
}

export async function saveSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
  const current = await getSystemSettings();
  const updated: SystemSettings = {
    ...current,
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'settings', SETTINGS_DOC), updated, { merge: true });
  } catch (e) {
    console.warn('Could not write settings to Firestore, persisting locally:', e);
  }

  localStorage.setItem('dinamico_pro_settings', JSON.stringify(updated));
  return updated;
}

/**
 * Atomically reserve a contiguous range of sequential numbers using Firestore transaction
 */
async function reserveSequentialNumbers(quantity: number): Promise<{ start: number; end: number }> {
  const counterRef = doc(db, 'counters', 'plates');

  try {
    const range = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let current = 0;
      if (counterDoc.exists()) {
        current = counterDoc.data()?.currentCount || 0;
      }
      const start = current + 1;
      const end = current + quantity;
      transaction.set(counterRef, {
        currentCount: end,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      return { start, end };
    });
    return range;
  } catch (error) {
    console.warn('Firestore transaction failed, falling back to secure local sequence:', error);
    // Local fallback counter in localStorage to never duplicate in sandbox
    const key = 'dinamico_pro_local_counter';
    const current = parseInt(localStorage.getItem(key) || '0', 10);
    const start = current + 1;
    const end = current + quantity;
    localStorage.setItem(key, String(end));
    return { start, end };
  }
}

/**
 * Formats a sequence number into the official standard "PLACA-000001"
 */
export function formatPlateNumber(num: number): string {
  return `PLACA-${String(num).padStart(6, '0')}`;
}

/**
 * Generates a short cryptographically random slug for the public URL
 */
function generateSlug(): string {
  const chars = '23456789abcdefghjkmnpqrstuvwxyz';
  let result = 'p_';
  const cryptoObj = window.crypto || (window as any).msCrypto;
  const randomValues = new Uint8Array(8);
  if (cryptoObj) {
    cryptoObj.getRandomValues(randomValues);
    for (let i = 0; i < 8; i++) {
      result += chars[randomValues[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 8; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return result;
}

export interface GenerateBatchParams {
  model: PlateModel;
  quantity: number;
  userId: string;
  onProgress?: (progress: { current: number; total: number; message: string }) => void;
}

export interface GeneratedBatchResult {
  batch: Batch;
  plates: Plate[];
}

/**
 * Main batch generator: atomically reserves numbers, creates unique records and URLs
 */
export async function createBatchWithPlates({
  model,
  quantity,
  userId,
  onProgress,
}: GenerateBatchParams): Promise<GeneratedBatchResult> {
  if (quantity < 1 || quantity > 100) {
    throw new Error('A quantidade de plaquinhas por lote deve ser entre 1 e 100.');
  }

  onProgress?.({
    current: 0,
    total: quantity,
    message: 'Reservando numeração sequencial exclusiva...',
  });

  const { start, end } = await reserveSequentialNumbers(quantity);
  const settings = await getSystemSettings();
  const domain = settings.publicDomain.replace(/\/+$/, '');

  const batchId = `lote-${Date.now()}`;
  const batchNumber = Math.floor(start / 10) + 1;
  const batchCode = `LOTE-${String(batchNumber).padStart(3, '0')}`;

  const batch: Batch = {
    id: batchId,
    batchNumber,
    batchCode,
    modelId: model.id,
    modelName: model.name,
    modelCategory: model.category,
    quantity,
    startPlateNumber: formatPlateNumber(start),
    endPlateNumber: formatPlateNumber(end),
    status: 'completed',
    userId,
    createdAt: new Date().toISOString(),
  };

  const plates: Plate[] = [];

  for (let i = 0; i < quantity; i++) {
    const seq = start + i;
    const plateNumber = formatPlateNumber(seq);
    const slug = generateSlug();
    const plateId = `plate-${seq}-${Date.now()}`;
    const publicUrl = `${domain}/q/${slug}`;

    onProgress?.({
      current: i + 1,
      total: quantity,
      message: `Criando plaquinha ${i + 1} de ${quantity} (${plateNumber})...`,
    });

    const plate: Plate = {
      id: plateId,
      plateNumber,
      sequenceIndex: seq,
      batchId,
      modelId: model.id,
      modelVersion: 'v2',
      modelName: model.name,
      publicSlug: slug,
      publicUrl,
      customerName: '',
      targetUrl: '',
      status: 'pending',
      qrPlacement: model.qrPlacement,
      clicksCount: 0,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    plates.push(plate);
  }

  onProgress?.({
    current: quantity,
    total: quantity,
    message: 'Salvando lote e plaquinhas no banco de dados...',
  });

  // Save batch
  try {
    await setDoc(doc(db, 'batches', batchId), batch);
  } catch (err) {
    console.warn('Error saving batch to Firestore, saving to local cache:', err);
  }

  // Save plates
  for (const plate of plates) {
    try {
      await setDoc(doc(db, 'plates', plate.id), plate);
    } catch (err) {
      console.warn(`Error saving plate ${plate.plateNumber} to Firestore:`, err);
    }
  }

  // Save to localStorage backup
  saveToLocalStore(batch, plates);

  return { batch, plates };
}

function saveToLocalStore(batch: Batch, plates: Plate[]) {
  try {
    const bKey = 'dinamico_pro_batches';
    const pKey = 'dinamico_pro_plates';

    const batches: Batch[] = JSON.parse(localStorage.getItem(bKey) || '[]');
    batches.unshift(batch);
    localStorage.setItem(bKey, JSON.stringify(batches));

    const existingPlates: Plate[] = JSON.parse(localStorage.getItem(pKey) || '[]');
    const combinedPlates = [...plates, ...existingPlates];
    localStorage.setItem(pKey, JSON.stringify(combinedPlates));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

export async function getUserBatches(userId: string): Promise<Batch[]> {
  try {
    const q = query(collection(db, 'batches'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const list: Batch[] = [];
      snapshot.forEach((d) => list.push(d.data() as Batch));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return list;
    }
  } catch (e) {
    console.warn('Error fetching batches from Firestore:', e);
  }

  // Fallback to local
  try {
    const local: Batch[] = JSON.parse(localStorage.getItem('dinamico_pro_batches') || '[]');
    return local.filter((b) => b.userId === userId || !b.userId);
  } catch {
    return [];
  }
}

export async function getPlatesByBatchId(batchId: string): Promise<Plate[]> {
  try {
    const q = query(collection(db, 'plates'), where('batchId', '==', batchId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const list: Plate[] = [];
      snapshot.forEach((d) => list.push(d.data() as Plate));
      list.sort((a, b) => a.sequenceIndex - b.sequenceIndex);
      return list;
    }
  } catch (e) {
    console.warn('Error fetching plates from Firestore:', e);
  }

  try {
    const local: Plate[] = JSON.parse(localStorage.getItem('dinamico_pro_plates') || '[]');
    return local.filter((p) => p.batchId === batchId).sort((a, b) => a.sequenceIndex - b.sequenceIndex);
  } catch {
    return [];
  }
}

export async function getPlateById(plateId: string): Promise<Plate | null> {
  try {
    const snap = await getDoc(doc(db, 'plates', plateId));
    if (snap.exists()) {
      return snap.data() as Plate;
    }
  } catch (e) {
    console.warn('Error fetching plate from Firestore:', e);
  }

  try {
    const local: Plate[] = JSON.parse(localStorage.getItem('dinamico_pro_plates') || '[]');
    return local.find((p) => p.id === plateId) || null;
  } catch {
    return null;
  }
}

/**
 * Public lookup by slug (for QR code scan redirection)
 */
export async function getPlateBySlug(slug: string): Promise<Plate | null> {
  try {
    const q = query(collection(db, 'plates'), where('publicSlug', '==', slug));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as Plate;
    }
  } catch (e) {
    console.warn('Error fetching plate by slug from Firestore:', e);
  }

  try {
    const local: Plate[] = JSON.parse(localStorage.getItem('dinamico_pro_plates') || '[]');
    return local.find((p) => p.publicSlug === slug) || null;
  } catch {
    return null;
  }
}

export async function updatePlate(
  plateId: string,
  data: {
    customerName?: string;
    targetUrl?: string;
    status?: Plate['status'];
  }
): Promise<Plate> {
  const current = await getPlateById(plateId);
  if (!current) {
    throw new Error(`Plaquinha não encontrada: ${plateId}`);
  }

  const updated: Plate = {
    ...current,
    ...data,
    status: data.targetUrl && data.targetUrl.trim().length > 0 ? (data.status || 'active') : 'pending',
    updatedAt: new Date().toISOString(),
  };

  try {
    await updateDoc(doc(db, 'plates', plateId), {
      ...data,
      status: updated.status,
      updatedAt: updated.updatedAt,
    });
  } catch (e) {
    console.warn('Error updating plate in Firestore, updating local cache:', e);
  }

  // Update localStorage
  try {
    const key = 'dinamico_pro_plates';
    const local: Plate[] = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = local.findIndex((p) => p.id === plateId);
    if (idx >= 0) {
      local[idx] = updated;
      localStorage.setItem(key, JSON.stringify(local));
    }
  } catch {
    // ignore
  }

  return updated;
}

/**
 * Increment click count on visitor scan
 */
export async function registerPlateScan(plateId: string): Promise<void> {
  try {
    const plateRef = doc(db, 'plates', plateId);
    await updateDoc(plateRef, {
      clicksCount: increment(1),
    });
  } catch (e) {
    // If permission or offline, record in local storage
    try {
      const key = 'dinamico_pro_plates';
      const local: Plate[] = JSON.parse(localStorage.getItem(key) || '[]');
      const idx = local.findIndex((p) => p.id === plateId);
      if (idx >= 0) {
        local[idx].clicksCount = (local[idx].clicksCount || 0) + 1;
        localStorage.setItem(key, JSON.stringify(local));
      }
    } catch {
      // ignore
    }
  }
}

export async function getAllUserPlates(userId: string): Promise<Plate[]> {
  try {
    const q = query(collection(db, 'plates'), where('userId', '==', userId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const list: Plate[] = [];
      snap.forEach((d) => list.push(d.data() as Plate));
      return list;
    }
  } catch (e) {
    console.warn('Error getting all plates:', e);
  }

  try {
    const local: Plate[] = JSON.parse(localStorage.getItem('dinamico_pro_plates') || '[]');
    return local.filter((p) => p.userId === userId || !p.userId);
  } catch {
    return [];
  }
}
