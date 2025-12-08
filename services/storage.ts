// ============================================================================
// MAGNUM OPUS v2.0 — Storage Service
// Handles persistence of user profiles with hybrid Server/LocalStorage support
// ============================================================================

import { UserProfile } from '../types';

// API endpoint - change this for production
const API_URL = '/api';
const LOCAL_STORAGE_KEY = 'magnum_opus_users_v2';

// ============================================================================
// LocalStorage Helpers (Fallback)
// ============================================================================

const getLocalUsers = (): UserProfile[] => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('LocalStorage Read Error:', e);
    return [];
  }
};

const saveLocalUsers = (users: UserProfile[]): void => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('LocalStorage Write Error:', e);
  }
};

// ============================================================================
// Hybrid Service Methods
// ============================================================================

/**
 * Fetch all users from backend (with LocalStorage fallback)
 */
export const getUsers = async (): Promise<UserProfile[]> => {
  try {
    const response = await fetch(`${API_URL}/users`, {
      signal: AbortSignal.timeout(3000), // 3s timeout
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const users = await response.json();
    return users as UserProfile[];
    
  } catch (error) {
    console.warn('Backend unavailable, using LocalStorage fallback:', error);
    return getLocalUsers();
  }
};

/**
 * Save a new user profile
 */
export const saveUser = async (user: UserProfile): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    
    if (response.ok) {
      // Also save to LocalStorage as backup
      const localUsers = getLocalUsers();
      const existingIndex = localUsers.findIndex(u => u.id === user.id);
      if (existingIndex >= 0) {
        localUsers[existingIndex] = user;
      } else {
        localUsers.push(user);
      }
      saveLocalUsers(localUsers);
      return true;
    }
    
    throw new Error(`Server save failed: ${response.status}`);
    
  } catch (error) {
    console.warn('Backend save failed, using LocalStorage:', error);
    
    const users = getLocalUsers();
    const existingIndex = users.findIndex(u => u.id === user.id);
    if (existingIndex >= 0) {
      users[existingIndex] = user;
    } else {
      users.push(user);
    }
    saveLocalUsers(users);
    return true;
  }
};

/**
 * Check if username is already taken
 */
export const isUsernameTaken = async (username: string): Promise<boolean> => {
  const normalizedUsername = username.trim().toLowerCase();
  
  try {
    const response = await fetch(`${API_URL}/check-username`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: normalizedUsername }),
    });
    
    if (!response.ok) {
      throw new Error('Server check failed');
    }
    
    const data = await response.json();
    return data.exists;
    
  } catch (error) {
    // Fallback to local check
    const users = getLocalUsers();
    return users.some(u => u.username.toLowerCase() === normalizedUsername);
  }
};

/**
 * Get a specific user by ID
 */
export const getUserById = async (id: string): Promise<UserProfile | null> => {
  const users = await getUsers();
  return users.find(u => u.id === id) || null;
};

/**
 * Get a specific user by username
 */
export const getUserByUsername = async (username: string): Promise<UserProfile | null> => {
  const normalizedUsername = username.trim().toLowerCase();
  const users = await getUsers();
  return users.find(u => u.username.toLowerCase() === normalizedUsername) || null;
};

/**
 * Update an existing user profile (e.g., after successful login to update lastLogin)
 */
export const updateUser = async (user: UserProfile): Promise<boolean> => {
  // For simplicity, just use saveUser which handles upsert logic
  return saveUser(user);
};

/**
 * Delete a user by ID
 */
export const deleteUser = async (id: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok && response.status !== 404) {
      throw new Error('Server delete failed');
    }
    
  } catch (error) {
    console.warn('Backend delete failed:', error);
  }
  
  // Always update LocalStorage
  const users = getLocalUsers();
  const filtered = users.filter(u => u.id !== id);
  saveLocalUsers(filtered);
  return true;
};

/**
 * Clear all users (dangerous - use with caution!)
 */
export const resetDatabase = async (): Promise<void> => {
  try {
    await fetch(`${API_URL}/reset`, { method: 'DELETE' });
  } catch (error) {
    console.warn('Backend reset failed:', error);
  }
  
  localStorage.removeItem(LOCAL_STORAGE_KEY);
};

/**
 * Export all users as JSON (for backup)
 */
export const exportUsers = async (): Promise<string> => {
  const users = await getUsers();
  return JSON.stringify(users, null, 2);
};

/**
 * Import users from JSON backup
 */
export const importUsers = async (jsonData: string): Promise<number> => {
  try {
    const users = JSON.parse(jsonData) as UserProfile[];
    
    for (const user of users) {
      await saveUser(user);
    }
    
    return users.length;
  } catch (error) {
    console.error('Import failed:', error);
    throw new Error('Invalid JSON data');
  }
};

// ============================================================================
// Connection Status
// ============================================================================

/**
 * Check if backend server is available
 */
export const checkServerStatus = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/users`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
};
