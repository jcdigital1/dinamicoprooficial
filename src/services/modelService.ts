import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { PlateModel, QRPlacement } from '../types';

/**
 * The 8 official models updated with the clean artwork versions (without old hardcoded serial numbers)
 * and exact detected coordinates matching the fake QR code location down to the pixel.
 */
export const INITIAL_OFFICIAL_MODELS: PlateModel[] = [
  {
    id: 'modelo-01',
    name: 'Wi-Fi Rede & Senha Clean',
    category: 'wifi',
    imageUrl: 'https://i.postimg.cc/VLSPDm7k/Design-sem-nome-1.jpg',
    qrPlacement: { x: 0.5810, y: 0.5327, size: 0.2629 },
    isCalibrated: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'modelo-02',
    name: 'Wi-Fi & WhatsApp Elegance',
    category: 'whatsapp',
    imageUrl: 'https://i.postimg.cc/3wFsdRwW/Design-sem-nome-3.jpg',
    qrPlacement: { x: 0.5943, y: 0.5444, size: 0.2358 },
    isCalibrated: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'modelo-03',
    name: 'Google Avaliação 5 Estrelas',
    category: 'google',
    imageUrl: 'https://i.postimg.cc/HxSF9hXj/Design-sem-nome-5.jpg',
    qrPlacement: { x: 0.6739, y: 0.6903, size: 0.1992 },
    isCalibrated: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'modelo-04',
    name: 'Wi-Fi Conecte seu Dispositivo',
    category: 'wifi',
    imageUrl: 'https://i.postimg.cc/CKStTg4M/Design-sem-nome-7.jpg',
    qrPlacement: { x: 0.5908, y: 0.5545, size: 0.2288 },
    isCalibrated: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'modelo-05',
    name: 'Wi-Fi & WhatsApp Duplo',
    category: 'whatsapp',
    imageUrl: 'https://i.postimg.cc/43QDmd34/Design-sem-nome-2.jpg',
    qrPlacement: { x: 0.5889, y: 0.5395, size: 0.2459 },
    isCalibrated: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'modelo-06',
    name: 'Instagram Editável',
    category: 'instagram',
    imageUrl: 'https://i.postimg.cc/MGq42SYj/Design-sem-nome-4.jpg',
    qrPlacement: { x: 0.6685, y: 0.6773, size: 0.2090 },
    isCalibrated: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'modelo-07',
    name: 'Conecte seu Dispositivo Blue',
    category: 'wifi',
    imageUrl: 'https://i.postimg.cc/k5qZ3my5/Design-sem-nome-6.jpg',
    qrPlacement: { x: 0.5908, y: 0.5545, size: 0.2288 },
    isCalibrated: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'modelo-08',
    name: 'Plaquinha Pix & Pagamento',
    category: 'pix',
    imageUrl: 'https://i.postimg.cc/0Nn49BtM/Design-sem-nome-8.jpg',
    qrPlacement: { x: 0.1292, y: 0.6078, size: 0.2631 },
    isCalibrated: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
];

const LOCAL_STORAGE_KEY = 'dinamico_pro_models_v3';

export async function getPlateModels(): Promise<PlateModel[]> {
  try {
    const snapshot = await getDocs(collection(db, 'plateModels')).catch(() => null);

    if (snapshot && !snapshot.empty) {
      const remoteModels: PlateModel[] = [];
      snapshot.forEach((docSnap) => {
        remoteModels.push(docSnap.data() as PlateModel);
      });

      const mergedMap = new Map<string, PlateModel>();
      // Official models with new clean artworks take absolute priority
      INITIAL_OFFICIAL_MODELS.forEach((m) => mergedMap.set(m.id, m));
      remoteModels.forEach((m) => {
        // If it's not one of the 8 official models, keep it as custom
        if (!INITIAL_OFFICIAL_MODELS.some((init) => init.id === m.id)) {
          mergedMap.set(m.id, m);
        }
      });
      return Array.from(mergedMap.values());
    }
  } catch (error) {
    console.error('Error fetching models:', error);
  }

  // Fallback to local storage or new official defaults
  const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length >= 8) {
        return parsed;
      }
    } catch {
      // ignore
    }
  }

  // Save new official models to local cache
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_OFFICIAL_MODELS));
  } catch {
    // ignore
  }

  return INITIAL_OFFICIAL_MODELS;
}

export async function getPlateModelById(id: string): Promise<PlateModel | null> {
  const models = await getPlateModels();
  return models.find((m) => m.id === id) || null;
}

export async function saveModelCalibration(modelId: string, placement: QRPlacement): Promise<PlateModel> {
  const model = await getPlateModelById(modelId);
  if (!model) {
    throw new Error(`Modelo não encontrado: ${modelId}`);
  }

  const updated: PlateModel = {
    ...model,
    qrPlacement: placement,
    isCalibrated: true,
    updatedAt: new Date().toISOString(),
  };

  try {
    const modelRef = doc(db, 'plateModels', modelId);
    await setDoc(modelRef, updated, { merge: true });
  } catch (err) {
    console.warn('Could not save to Firestore plateModels, updating local cache:', err);
  }

  const allModels = await getPlateModels();
  const index = allModels.findIndex((m) => m.id === modelId);
  if (index >= 0) {
    allModels[index] = updated;
  } else {
    allModels.push(updated);
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allModels));

  return updated;
}
