import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { UserProfile, UserStatus, AdminSystemStats, Batch, Plate } from '../types';

/**
 * Fetch all registered buyer users for the admin dashboard
 */
export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    const q = query(collection(db, 'users'));
    const snapshot = await getDocs(q);
    const users: UserProfile[] = [];
    snapshot.forEach((d) => {
      users.push(d.data() as UserProfile);
    });

    users.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return users;
  } catch (error) {
    console.error('Error fetching users in adminService:', error);
    return [];
  }
}

/**
 * Update a buyer's account access status (approve, block, reactivate)
 */
export async function updateUserStatus(
  userId: string,
  newStatus: UserStatus,
  adminId?: string
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const now = new Date().toISOString();

  const updatePayload: Record<string, any> = {
    status: newStatus,
    updatedAt: now,
  };

  if (newStatus === 'approved') {
    updatePayload.approvedAt = now;
    if (adminId) {
      updatePayload.approvedBy = adminId;
    }
  }

  await updateDoc(userRef, updatePayload);
}

/**
 * Delete a user profile from the database
 */
export async function deleteUser(userId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId));
}

/**
 * Consolidate global platform metrics for the admin overview
 */
export async function getPlatformMetrics(): Promise<AdminSystemStats> {
  try {
    // 1. Fetch users
    const usersSnap = await getDocs(collection(db, 'users'));
    let totalUsers = 0;
    let pendingUsers = 0;
    let approvedUsers = 0;
    let blockedUsers = 0;

    usersSnap.forEach((docSnap) => {
      const u = docSnap.data() as UserProfile;
      totalUsers++;
      if (u.status === 'pending') pendingUsers++;
      else if (u.status === 'approved') approvedUsers++;
      else if (u.status === 'blocked') blockedUsers++;
    });

    // 2. Fetch batches
    let totalBatches = 0;
    try {
      const batchesSnap = await getDocs(collection(db, 'batches'));
      totalBatches = batchesSnap.size;
    } catch {
      // fallback
    }

    // 3. Fetch plates and sum clicks
    let totalPlates = 0;
    let totalClicks = 0;
    try {
      const platesSnap = await getDocs(collection(db, 'plates'));
      totalPlates = platesSnap.size;
      platesSnap.forEach((docSnap) => {
        const p = docSnap.data() as Plate;
        if (p.clicksCount) {
          totalClicks += p.clicksCount;
        }
      });
    } catch {
      // fallback
    }

    return {
      totalUsers,
      pendingUsers,
      approvedUsers,
      blockedUsers,
      totalBatches,
      totalPlates,
      totalClicks,
    };
  } catch (error) {
    console.error('Error computing platform metrics:', error);
    return {
      totalUsers: 0,
      pendingUsers: 0,
      approvedUsers: 0,
      blockedUsers: 0,
      totalBatches: 0,
      totalPlates: 0,
      totalClicks: 0,
    };
  }
}

/**
 * Get production count stats for a specific user
 */
export async function getUserStats(userId: string): Promise<{ batchesCount: number; platesCount: number }> {
  try {
    const [batchesSnap, platesSnap] = await Promise.all([
      getDocs(query(collection(db, 'batches'), where('userId', '==', userId))),
      getDocs(query(collection(db, 'plates'), where('userId', '==', userId))),
    ]);

    return {
      batchesCount: batchesSnap.size,
      platesCount: platesSnap.size,
    };
  } catch {
    return {
      batchesCount: 0,
      platesCount: 0,
    };
  }
}
