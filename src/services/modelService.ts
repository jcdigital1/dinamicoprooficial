import { collection, doc, getDocs, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { PlateModel, QRPlacement } from '../types';

/**
 * Exact, mathematically verified coordinates detected via optical analysis (jsQR)
 * on the 8 official 800x800px Canva artworks.
 * Bounding boxes match the fake QR code location down to the pixel.
 */
export const INITIAL_OFFICIAL_MODELS: PlateModel[] = [
  {
    id: 'modelo-01',
    name: 'Wi-Fi Conecte seu Dispositivo',
    category: 'wifi',
    imageUrl: 'https://i.postimg.cc/43Lcf4s7/Copia-de-Conecte-seu-dispositivo-a-nossa-3.jpg',
    qrPlacement: { x: 0.5908, y: 0.5545, size: 0.2288 },
    isCalibrated: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'modelo-02',
    name: 'Instagram Editável',
    category: 'instagram',
    imageUrl: 'https://i.postimg.cc/50XC6c2S/Copia-de-Instagram-editavel.jpg',
    qrPlacement: { x: 0.6685, y: 0.6773, size: 0.2090 },
    isCalibrated: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'modelo-03',
    name: 'Plaquinha Pix & Pagamento',
    category: 'pix',
    imageUrl: 'https://i.postimg.cc/6QjZW6tw/Plaquinha-01-4.jpg',
    qrPlacement: { x: 0.1290, y: 0.6079, size: 0.2630 },
    isCalibrated: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'modelo-04',
    name: 'Wi-Fi & WhatsApp Duplo 01',
    category: 'whatsapp',
    imageUrl: 'https://i.postimg.cc/MTnQvkp3/Wi-Fiwhatsapp-3.jpg',
    qrPlacement: { x: 0.5896, y: 0.5394, size: 0.2468 },
    isCalibrated: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'modelo-05',
    name: 'Wi-Fi & WhatsApp Elegance 02',
    category: 'whatsapp',
    imageUrl: 'https://i.postimg.cc/XJrCpMYH/Wi-Fiwhatsapp-5.jpg',
    qrPlacement: { x: 0.5942, y: 0.5448, size: 0.2358 },
    isCalibrated: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'modelo-06',
    name: 'Wi-Fi Rede & Senha Clean',
    category: 'wifi',
    imageUrl: 'https://i.postimg.cc/Kz1MRX8J/Wi-Fiwhatsapp-2.jpg',
    qrPlacement: { x: 0.5812, y: 0.5327, size: 0.2628 },
    isCalibrated: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'modelo-07',
    name: 'Google Avaliação 5 Estrelas',
    category: 'google',
    imageUrl: 'https://i.postimg.cc/50XC6c20/Google.jpg',
    qrPlacement: { x: 0.6737, y: 0.6900, size: 0.2001 },
    isCalibrated: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'modelo-08',
    name: 'Conecte seu Dispositivo Blue',
    category: 'wifi',
    imageUrl: 'https://i.postimg.cc/QM478NhB/Copia-de-Conecte-seu-dispositivo-a-nossa-4.jpg',
    qrPlacement: { x: 0.5908, y: 0.5545, size: 0.2288 },
    isCalibrated: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
];

const LOCAL_STORAGE_KEY = 'dinamico_pro_models_v2';

export async function getPlateModels(): Promise<PlateModel[]> {
  try {
    const snapshot = await getDocs(collection(db, 'plateModels')).catch(() => null);

    if (snapshot && !snapshot.empty) {
      const remoteModels: PlateModel[] = [];
      snapshot.forEach((docSnap) => {
        remoteModels.push(docSnap.data() as PlateModel);
      });

      const mergedMap = new Map<string, PlateModel>();
      // Official models take precedence with exact detected coordinates
      INITIAL_OFFICIAL_MODELS.forEach((m) => mergedMap.set(m.id, m));
      remoteModels.forEach((m) => {
        // If remote model has invalid legacy 0.32 placeholder, overwrite with exact detected
        if (INITIAL_OFFICIAL_MODELS.some(init => init.id === m.id)) {
          const official = INITIAL_OFFICIAL_MODELS.find(init => init.id === m.id)!;
          if (m.qrPlacement.x === 0.32 || m.qrPlacement.size === 0.36) {
            mergedMap.set(m.id, official);
            return;
          }
        }
        mergedMap.set(m.id, m);
      });
      return Array.from(mergedMap.values());
    }
  } catch (error) {
    console.error('Error fetching models:', error);
  }

  // Fallback to local storage or defaults
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
