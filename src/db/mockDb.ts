// High-fidelity database fallback module supporting both LocalStorage simulation and Firebase integration
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConnected } from '../firebase';

export interface Medicine {
  id: string;
  commercialName: string; // الاسم التجاري
  scientificName: string; // الاسم العلمي
  quantity: number; // الكمية المتوفرة
  expiryDate: string; // تاريخ انتهاء الصلاحية
  price: number; // السعر
  unit: 'علبة' | 'شريط' | 'حبة'; // الوحدة
  category: string; // الفئة العلاجية
  createdAt: string;
  updatedAt: string;
  manufacturer?: string; // الشركة المصنعة
  alternatives?: string; // البدائل المتاحة
}

export interface DispenseRecord {
  id: string;
  medicineId: string;
  medicineName: string;
  residentName: string; // اسم المقيم المعاق المستفيد
  quantityDispensed: number; // الكمية المطلوبة
  unit: string;
  totalPrice: number;
  actualQuantityDispensed: number; // الكمية المصروفة فعلياً للمراجعة
  dispensedBy: string; // اسم الصيدلي الصارف
  dispensedById: string;
  dispensedAt: string; // تاريخ الصرف
}

export interface UserSession {
  id: string;
  userId: string;
  name: string;
  email: string;
  ipAddress: string;
  deviceToken: string;
  loginTime: string;
}

export interface StockAuditLog {
  id: string;
  medicineId: string;
  medicineName: string;
  actionType: 'إضافة دواء جديد' | 'تحديث كمية' | 'تعديل يدوي' | 'حذف دواء' | 'صرف دواء لمقيم';
  quantityChanged: number;
  previousQuantity: number;
  newQuantity: number;
  performedByName: string;
  performedByEmail: string;
  performedById: string;
  notes: string;
  timestamp: string;
}

// Initial realistic Arabic medicine inventory for a disability care center
const INITIAL_MEDICINES: Medicine[] = [
  {
    id: "med-1",
    commercialName: "بنادول اكسترا",
    scientificName: "Paracetamol + Caffeine",
    quantity: 120,
    expiryDate: "2026-10-15", // Expiring soon in ~20 days from current date (2026-09-23)
    price: 15.5,
    unit: "علبة",
    category: "مسكنات وآلام",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    manufacturer: "شركة الخليج للصناعات الدوائية (جلفار)",
    alternatives: "فيفادول بلس، أدول، باراسيتامول"
  },
  {
    id: "med-2",
    commercialName: "أوجمنتين 1 جم",
    scientificName: "Amoxicillin + Clavulanic Acid",
    quantity: 45,
    expiryDate: "2026-10-05", // Expiring very soon! ~12 days
    price: 85.0,
    unit: "علبة",
    category: "مضادات حيوية",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    manufacturer: "شركة نوفارتس العالمية (Novartis)",
    alternatives: "كلافوكس، أموكسيلان، جلمنتين"
  },
  {
    id: "med-3",
    commercialName: "بروفين 400 ملجم",
    scientificName: "Ibuprofen",
    quantity: 80,
    expiryDate: "2027-05-20",
    price: 18.0,
    unit: "شريط",
    category: "مضادات الالتهاب",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    manufacturer: "الشركة السعودية للصناعات الدوائية (سبيماكو الدوائية)",
    alternatives: "سابوفين، روفيناك، إيبوبروفين"
  },
  {
    id: "med-4",
    commercialName: "فنتولين بخاخ",
    scientificName: "Salbutamol Inhaler",
    quantity: 15,
    expiryDate: "2026-11-30", // Near expiry ~2 months
    price: 24.5,
    unit: "علبة",
    category: "الجهاز التنفسي والأزمات",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    manufacturer: "شركة الخليج للصناعات الدوائية (جلفار)",
    alternatives: "بيوتالين بخاخ، سالبوتامول"
  },
  {
    id: "med-5",
    commercialName: "ديباكين كرونو 500 ملجم",
    scientificName: "Sodium Valproate",
    quantity: 60,
    expiryDate: "2027-08-12",
    price: 110.0,
    unit: "علبة",
    category: "مضادات الصرع والتشنج",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    manufacturer: "الشركة السعودية للصناعات الدوائية (سبيماكو الدوائية)",
    alternatives: "فالبروات الصوديوم، كونفولكس"
  },
  {
    id: "med-6",
    commercialName: "لوراتادين 10 ملجم",
    scientificName: "Loratadine",
    quantity: 200,
    expiryDate: "2026-10-22", // Expiring soon! ~30 days
    price: 12.0,
    unit: "حبة",
    category: "الحساسية ومضادات الهستامين",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    manufacturer: "شركة الخليج للصناعات الدوائية (جلفار)",
    alternatives: "كلاريتين، إيريوس، لورا"
  },
  {
    id: "med-7",
    commercialName: "ريسبيردال 2 ملجم",
    scientificName: "Risperidone",
    quantity: 35,
    expiryDate: "2027-12-01",
    price: 150.0,
    unit: "علبة",
    category: "الرعاية النفسية والسلوكية",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    manufacturer: "شركة نوفارتس العالمية (Novartis)",
    alternatives: "ريسبيدال، ريسبون، ريسبردون"
  }
];

const INITIAL_DISPENSES: DispenseRecord[] = [
  {
    id: "disp-1",
    medicineId: "med-1",
    medicineName: "بنادول اكسترا",
    residentName: "أحمد عبد الله المري",
    quantityDispensed: 2,
    unit: "علبة",
    totalPrice: 31.0,
    actualQuantityDispensed: 2,
    dispensedBy: "د. طارق اليوسف",
    dispensedById: "pharmacist-1",
    dispensedAt: "2026-09-22T10:30:00.000Z"
  },
  {
    id: "disp-2",
    medicineId: "med-5",
    medicineName: "ديباكين كرونو 500 ملجم",
    residentName: "سارة محمد العتيبي",
    quantityDispensed: 1,
    unit: "علبة",
    totalPrice: 110.0,
    actualQuantityDispensed: 1,
    dispensedBy: "د. طارق اليوسف",
    dispensedById: "pharmacist-1",
    dispensedAt: "2026-09-23T08:15:00.000Z"
  }
];

export const getLocalMedicines = (): Medicine[] => {
  const data = localStorage.getItem('care_pharmacy_medicines');
  if (!data) {
    localStorage.setItem('care_pharmacy_medicines', JSON.stringify(INITIAL_MEDICINES));
    return INITIAL_MEDICINES;
  }
  return JSON.parse(data);
};

export const saveLocalMedicines = (medicines: Medicine[]) => {
  localStorage.setItem('care_pharmacy_medicines', JSON.stringify(medicines));
};

export const getLocalDispenses = (): DispenseRecord[] => {
  const data = localStorage.getItem('care_pharmacy_dispenses');
  if (!data) {
    localStorage.setItem('care_pharmacy_dispenses', JSON.stringify(INITIAL_DISPENSES));
    return INITIAL_DISPENSES;
  }
  return JSON.parse(data);
};

export const saveLocalDispenses = (dispenses: DispenseRecord[]) => {
  localStorage.setItem('care_pharmacy_dispenses', JSON.stringify(dispenses));
};

export const getLocalSessions = (): UserSession[] => {
  const data = localStorage.getItem('care_pharmacy_sessions');
  return data ? JSON.parse(data) : [];
};

export const saveLocalSessions = (sessions: UserSession[]) => {
  localStorage.setItem('care_pharmacy_sessions', JSON.stringify(sessions));
};

const INITIAL_STOCK_LOGS: StockAuditLog[] = [
  {
    id: "log-1",
    medicineId: "med-1",
    medicineName: "بنادول اكسترا (Paracetamol + Caffeine)",
    actionType: "إضافة دواء جديد",
    quantityChanged: 122,
    previousQuantity: 0,
    newQuantity: 122,
    performedByName: "د. طارق اليوسف",
    performedByEmail: "tmrbe2006@gmail.com",
    performedById: "admin-1",
    notes: "رصيد افتتاح لتهيئة مخزن الصيدلية",
    timestamp: "2026-09-20T08:00:00.000Z"
  },
  {
    id: "log-2",
    medicineId: "med-1",
    medicineName: "بنادول اكسترا (Paracetamol + Caffeine)",
    actionType: "صرف دواء لمقيم",
    quantityChanged: -2,
    previousQuantity: 122,
    newQuantity: 120,
    performedByName: "د. طارق اليوسف",
    performedByEmail: "tmrbe2006@gmail.com",
    performedById: "pharmacist-1",
    notes: "صرف علاج مجدول للمقيم: أحمد عبد الله المري",
    timestamp: "2026-09-22T10:30:00.000Z"
  },
  {
    id: "log-3",
    medicineId: "med-5",
    medicineName: "ديباكين كرونو 500 ملجم (Sodium Valproate)",
    actionType: "إضافة دواء جديد",
    quantityChanged: 61,
    previousQuantity: 0,
    newQuantity: 61,
    performedByName: "د. طارق اليوسف",
    performedByEmail: "tmrbe2006@gmail.com",
    performedById: "admin-1",
    notes: "تغذية أصلية لمخزن أدوية الصرع والتشنجات",
    timestamp: "2026-09-20T08:15:00.000Z"
  },
  {
    id: "log-4",
    medicineId: "med-5",
    medicineName: "ديباكين كرونو 500 ملجم (Sodium Valproate)",
    actionType: "صرف دواء لمقيم",
    quantityChanged: -1,
    previousQuantity: 61,
    newQuantity: 60,
    performedByName: "د. طارق اليوسف",
    performedByEmail: "tmrbe2006@gmail.com",
    performedById: "pharmacist-1",
    notes: "صرف علاج مجدول للمقيم: سارة محمد العتيبي",
    timestamp: "2026-09-23T08:15:00.000Z"
  }
];

export const getLocalStockLogs = (): StockAuditLog[] => {
  const data = localStorage.getItem('care_pharmacy_stock_logs');
  if (!data) {
    localStorage.setItem('care_pharmacy_stock_logs', JSON.stringify(INITIAL_STOCK_LOGS));
    return INITIAL_STOCK_LOGS;
  }
  return JSON.parse(data);
};

export const saveLocalStockLogs = (logs: StockAuditLog[]) => {
  localStorage.setItem('care_pharmacy_stock_logs', JSON.stringify(logs));
};

// Unified CRUD Service with Firebase support and clean LocalStorage fallback
export const DbService = {
  // --- Medicines CRUD ---
  async fetchMedicines(): Promise<Medicine[]> {
    try {
      if (isFirebaseConnected) {
        const querySnapshot = await getDocs(collection(db, "medicines"));
        const list: Medicine[] = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Medicine);
        });
        
        if (list.length > 0) {
          // Sync with local storage
          saveLocalMedicines(list);
          return list;
        } else {
          // Firestore is completely empty! Let's seed it with INITIAL_MEDICINES so it has initial realistic Arabic items
          console.log("Firestore medicines collection is empty. Seeding INITIAL_MEDICINES...");
          for (const med of INITIAL_MEDICINES) {
            await setDoc(doc(db, "medicines", med.id), {
              commercialName: med.commercialName,
              scientificName: med.scientificName,
              quantity: med.quantity,
              expiryDate: med.expiryDate,
              price: med.price,
              unit: med.unit,
              category: med.category || "عام",
              createdAt: med.createdAt,
              updatedAt: med.updatedAt,
              manufacturer: med.manufacturer || '',
              alternatives: med.alternatives || ''
            });
          }
          saveLocalMedicines(INITIAL_MEDICINES);
          return INITIAL_MEDICINES;
        }
      }
    } catch (e) {
      console.warn("Firestore fetchMedicines failed, returning offline cache:", e);
    }
    return getLocalMedicines();
  },

  async addMedicine(med: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>, actor?: { name: string; email: string; id: string; notes?: string }): Promise<Medicine> {
    const newMed: Medicine = {
      ...med,
      id: "med-" + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Attempt Firebase write
    try {
      if (isFirebaseConnected) {
        await setDoc(doc(db, "medicines", newMed.id), {
          commercialName: newMed.commercialName,
          scientificName: newMed.scientificName,
          quantity: newMed.quantity,
          expiryDate: newMed.expiryDate,
          price: newMed.price,
          unit: newMed.unit,
          category: newMed.category || "عام",
          createdAt: newMed.createdAt,
          updatedAt: newMed.updatedAt,
          manufacturer: newMed.manufacturer || '',
          alternatives: newMed.alternatives || ''
        });
      }
    } catch (e) {
      console.warn("Firestore addMedicine failed, falling back to LocalStorage:", e);
    }

    // Always keep LocalStorage in sync
    const list = getLocalMedicines();
    list.unshift(newMed);
    saveLocalMedicines(list);

    // Create Audit Log
    await this.addStockLog({
      medicineId: newMed.id,
      medicineName: `${newMed.commercialName} (${newMed.scientificName})`,
      actionType: 'إضافة دواء جديد',
      quantityChanged: newMed.quantity,
      previousQuantity: 0,
      newQuantity: newMed.quantity,
      performedByName: actor?.name || "د. طارق اليوسف",
      performedByEmail: actor?.email || "tmrbe2006@gmail.com",
      performedById: actor?.id || "admin-1",
      notes: actor?.notes || "إدخال صنف دواء جديد للمخزن"
    });

    return newMed;
  },

  async updateMedicine(id: string, updatedFields: Partial<Medicine>, actor?: { name: string; email: string; id: string; notes?: string }): Promise<Medicine> {
    const list = getLocalMedicines();
    const index = list.findIndex(m => m.id === id);
    if (index === -1) throw new Error("الدواء غير موجود");

    const previousQuantity = list[index].quantity;
    const updatedMed: Medicine = {
      ...list[index],
      ...updatedFields,
      updatedAt: new Date().toISOString()
    };

    // Attempt Firebase write
    try {
      if (isFirebaseConnected) {
        await setDoc(doc(db, "medicines", id), {
          commercialName: updatedMed.commercialName,
          scientificName: updatedMed.scientificName,
          quantity: updatedMed.quantity,
          expiryDate: updatedMed.expiryDate,
          price: updatedMed.price,
          unit: updatedMed.unit,
          category: updatedMed.category || "عام",
          createdAt: updatedMed.createdAt,
          updatedAt: updatedMed.updatedAt,
          manufacturer: updatedMed.manufacturer || '',
          alternatives: updatedMed.alternatives || ''
        }, { merge: true });
      }
    } catch (e) {
      console.warn("Firestore updateMedicine failed, falling back to LocalStorage:", e);
    }

    list[index] = updatedMed;
    saveLocalMedicines(list);

    // Log quantity change if any
    const quantityDifference = updatedMed.quantity - previousQuantity;
    if (quantityDifference !== 0) {
      await this.addStockLog({
        medicineId: updatedMed.id,
        medicineName: `${updatedMed.commercialName} (${updatedMed.scientificName})`,
        actionType: 'تعديل يدوي',
        quantityChanged: quantityDifference,
        previousQuantity,
        newQuantity: updatedMed.quantity,
        performedByName: actor?.name || "د. طارق اليوسف",
        performedByEmail: actor?.email || "tmrbe2006@gmail.com",
        performedById: actor?.id || "admin-1",
        notes: actor?.notes || "تعديل كمية المخزون يدوياً"
      });
    } else if (actor?.notes) {
      await this.addStockLog({
        medicineId: updatedMed.id,
        medicineName: `${updatedMed.commercialName} (${updatedMed.scientificName})`,
        actionType: 'تعديل يدوي',
        quantityChanged: 0,
        previousQuantity,
        newQuantity: updatedMed.quantity,
        performedByName: actor?.name || "د. طارق اليوسف",
        performedByEmail: actor?.email || "tmrbe2006@gmail.com",
        performedById: actor?.id || "admin-1",
        notes: actor.notes
      });
    }

    return updatedMed;
  },

  async deleteMedicine(id: string, actor?: { name: string; email: string; id: string; notes?: string }): Promise<boolean> {
    const list = getLocalMedicines();
    const targetMed = list.find(m => m.id === id);

    // Attempt Firebase delete
    try {
      if (isFirebaseConnected) {
        await deleteDoc(doc(db, "medicines", id));
      }
    } catch (e) {
      console.warn("Firestore deleteMedicine failed, falling back to LocalStorage:", e);
    }

    const filtered = list.filter(m => m.id !== id);
    saveLocalMedicines(filtered);

    if (targetMed) {
      // Create Audit Log
      await this.addStockLog({
        medicineId: targetMed.id,
        medicineName: `${targetMed.commercialName} (${targetMed.scientificName})`,
        actionType: 'حذف دواء',
        quantityChanged: -targetMed.quantity,
        previousQuantity: targetMed.quantity,
        newQuantity: 0,
        performedByName: actor?.name || "د. طارق اليوسف",
        performedByEmail: actor?.email || "tmrbe2006@gmail.com",
        performedById: actor?.id || "admin-1",
        notes: actor?.notes || "شطب الصنف نهائياً وحذفه من السجلات"
      });
    }

    return true;
  },

  // --- Dispense Records ---
  async fetchDispenseRecords(): Promise<DispenseRecord[]> {
    try {
      if (isFirebaseConnected) {
        const querySnapshot = await getDocs(collection(db, "dispense_records"));
        const list: DispenseRecord[] = [];
        querySnapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as DispenseRecord);
        });

        if (list.length > 0) {
          saveLocalDispenses(list);
          return list;
        } else {
          // Seed with initial realistic records if empty
          console.log("Firestore dispense_records is empty. Seeding INITIAL_DISPENSES...");
          for (const rec of INITIAL_DISPENSES) {
            await setDoc(doc(db, "dispense_records", rec.id), {
              medicineId: rec.medicineId,
              medicineName: rec.medicineName,
              residentName: rec.residentName,
              quantityDispensed: rec.quantityDispensed,
              unit: rec.unit,
              totalPrice: rec.totalPrice,
              actualQuantityDispensed: rec.actualQuantityDispensed,
              dispensedBy: rec.dispensedBy,
              dispensedById: rec.dispensedById,
              dispensedAt: rec.dispensedAt
            });
          }
          saveLocalDispenses(INITIAL_DISPENSES);
          return INITIAL_DISPENSES;
        }
      }
    } catch (e) {
      console.warn("Firestore fetchDispenseRecords failed, returning offline cache:", e);
    }
    return getLocalDispenses();
  },

  async addDispenseRecord(rec: Omit<DispenseRecord, 'id' | 'dispensedAt'>): Promise<DispenseRecord> {
    const newRec: DispenseRecord = {
      ...rec,
      id: "disp-" + Math.random().toString(36).substr(2, 9),
      dispensedAt: new Date().toISOString()
    };

    // Subtract from inventory quantity automatically (inventory integrity!)
    const medList = getLocalMedicines();
    const medIndex = medList.findIndex(m => m.id === rec.medicineId);
    let previousQuantity = 0;
    let newQty = 0;
    let targetMed: Medicine | null = null;

    if (medIndex !== -1) {
      targetMed = medList[medIndex];
      previousQuantity = targetMed.quantity;
      // Safeguard quantity subtraction
      newQty = Math.max(0, previousQuantity - rec.actualQuantityDispensed);
      medList[medIndex].quantity = newQty;
      medList[medIndex].updatedAt = new Date().toISOString();
      saveLocalMedicines(medList);

      // Attempt syncing medicine reduction to Firebase
      try {
        if (isFirebaseConnected) {
          await setDoc(doc(db, "medicines", rec.medicineId), {
            quantity: newQty,
            updatedAt: medList[medIndex].updatedAt
          }, { merge: true });
        }
      } catch (e) {
        console.warn("Firestore inventory sync failed:", e);
      }
    }

    // Write dispense record to Firebase
    try {
      if (isFirebaseConnected) {
        await setDoc(doc(db, "dispense_records", newRec.id), {
          medicineId: newRec.medicineId,
          medicineName: newRec.medicineName,
          residentName: newRec.residentName,
          quantityDispensed: newRec.quantityDispensed,
          unit: newRec.unit,
          totalPrice: newRec.totalPrice,
          actualQuantityDispensed: newRec.actualQuantityDispensed,
          dispensedBy: newRec.dispensedBy,
          dispensedById: newRec.dispensedById,
          dispensedAt: newRec.dispensedAt
        });
      }
    } catch (e) {
      console.warn("Firestore addDispenseRecord failed, falling back to LocalStorage:", e);
    }

    const list = getLocalDispenses();
    list.unshift(newRec);
    saveLocalDispenses(list);

    // Automatically record an Audit Log for the dispensing
    if (targetMed) {
      await this.addStockLog({
        medicineId: targetMed.id,
        medicineName: `${targetMed.commercialName} (${targetMed.scientificName})`,
        actionType: 'صرف دواء لمقيم',
        quantityChanged: -rec.actualQuantityDispensed,
        previousQuantity,
        newQuantity: newQty,
        performedByName: rec.dispensedBy,
        performedByEmail: "pharmacist@carecenter.com",
        performedById: rec.dispensedById,
        notes: `صرف علاج للمقيم: ${rec.residentName}`
      });
    }

    return newRec;
  },

  // --- Security Sessions CRUD ---
  async fetchSessions(): Promise<UserSession[]> {
    try {
      if (isFirebaseConnected) {
        const querySnapshot = await getDocs(collection(db, "user_sessions"));
        if (!querySnapshot.empty) {
          const list: UserSession[] = [];
          querySnapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() } as UserSession);
          });
          saveLocalSessions(list);
          return list;
        }
      }
    } catch (e) {
      console.warn("Firestore fetchSessions failed, returning local storage:", e);
    }
    return getLocalSessions();
  },

  async logSession(session: Omit<UserSession, 'id'>): Promise<UserSession> {
    const newSession: UserSession = {
      ...session,
      id: "sess-" + Math.random().toString(36).substr(2, 9)
    };

    try {
      if (isFirebaseConnected) {
        await setDoc(doc(db, "user_sessions", newSession.id), {
          userId: newSession.userId,
          name: newSession.name,
          email: newSession.email,
          ipAddress: newSession.ipAddress,
          deviceToken: newSession.deviceToken,
          loginTime: newSession.loginTime
        });
      }
    } catch (e) {
      console.warn("Firestore logSession failed, saving locally:", e);
    }

    const list = getLocalSessions();
    list.unshift(newSession);
    saveLocalSessions(list);
    return newSession;
  },

  // --- Stock Audit Logs CRUD ---
  async fetchStockLogs(): Promise<StockAuditLog[]> {
    try {
      if (isFirebaseConnected) {
        const querySnapshot = await getDocs(collection(db, "stock_audit_logs"));
        if (!querySnapshot.empty) {
          const list: StockAuditLog[] = [];
          querySnapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() } as StockAuditLog);
          });
          // Sort by timestamp descending
          list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          saveLocalStockLogs(list);
          return list;
        }
      }
    } catch (e) {
      console.warn("Firestore fetchStockLogs failed, returning local storage:", e);
    }
    return getLocalStockLogs();
  },

  async addStockLog(log: Omit<StockAuditLog, 'id' | 'timestamp'>): Promise<StockAuditLog> {
    const newLog: StockAuditLog = {
      ...log,
      id: "log-" + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString()
    };

    try {
      if (isFirebaseConnected) {
        await setDoc(doc(db, "stock_audit_logs", newLog.id), {
          medicineId: newLog.medicineId,
          medicineName: newLog.medicineName,
          actionType: newLog.actionType,
          quantityChanged: newLog.quantityChanged,
          previousQuantity: newLog.previousQuantity,
          newQuantity: newLog.newQuantity,
          performedByName: newLog.performedByName,
          performedByEmail: newLog.performedByEmail,
          performedById: newLog.performedById,
          notes: newLog.notes,
          timestamp: newLog.timestamp
        });
      }
    } catch (e) {
      console.warn("Firestore addStockLog failed, saving locally:", e);
    }

    const list = getLocalStockLogs();
    list.unshift(newLog);
    saveLocalStockLogs(list);
    return newLog;
  }
};
