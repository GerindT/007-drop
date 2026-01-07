/**
 * 007-Drop Encryption Utilities
 * Uses Web Crypto API for AES-256-GCM encryption
 */

// Generate a random 256-bit encryption key
export async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true, // extractable
    ['encrypt', 'decrypt']
  )
}

// Export key to base64 string (for URL fragment)
export async function keyToBase64(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key)
  const bytes = new Uint8Array(exported)
  return btoa(String.fromCharCode(...bytes))
}

// Import key from base64 string
export async function base64ToKey(base64: string): Promise<CryptoKey> {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  
  return await crypto.subtle.importKey(
    'raw',
    bytes,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

// Encrypt a file, returns encrypted data with IV prepended
export async function encryptFile(file: File, key: CryptoKey): Promise<Uint8Array> {
  // Read file as ArrayBuffer
  const fileBuffer = await file.arrayBuffer()
  
  // Generate random 12-byte IV (nonce)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  
  // Encrypt the data
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    fileBuffer
  )
  
  // Combine IV + encrypted data
  const encryptedArray = new Uint8Array(encryptedBuffer)
  const result = new Uint8Array(iv.length + encryptedArray.length)
  result.set(iv, 0)
  result.set(encryptedArray, iv.length)
  
  return result
}

// Decrypt data, expects IV prepended to encrypted data
export async function decryptFile(
  encryptedData: ArrayBuffer,
  key: CryptoKey,
  mimeType: string = 'application/octet-stream'
): Promise<Blob> {
  const data = new Uint8Array(encryptedData)
  
  // Extract IV (first 12 bytes)
  const iv = data.slice(0, 12)
  const ciphertext = data.slice(12)
  
  // Decrypt
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    ciphertext
  )
  
  return new Blob([decryptedBuffer], { type: mimeType })
}

// ============================================
// PASSWORD PROTECTION UTILITIES
// ============================================

// Derive a key from password using PBKDF2
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  // Convert password to key material
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )
  
  // Derive AES key from password
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

// Generate a random salt for password derivation
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16))
}

// Convert salt to base64
export function saltToBase64(salt: Uint8Array): string {
  return btoa(String.fromCharCode(...salt))
}

// Convert base64 to salt
export function base64ToSalt(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

// Combine two keys using XOR (for password + URL key)
export async function combineKeys(
  key1: CryptoKey,
  key2: CryptoKey
): Promise<CryptoKey> {
  const raw1 = new Uint8Array(await crypto.subtle.exportKey('raw', key1))
  const raw2 = new Uint8Array(await crypto.subtle.exportKey('raw', key2))
  
  // XOR the two keys
  const combined = new Uint8Array(raw1.length)
  for (let i = 0; i < raw1.length; i++) {
    combined[i] = raw1[i] ^ raw2[i]
  }
  
  return await crypto.subtle.importKey(
    'raw',
    combined,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

// Generate thumbnail from image file
export function generateThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          resolve(null)
          return
        }
        
        // Calculate new dimensions (max 300px)
        const maxDim = 300
        let width = img.width
        let height = img.height
        
        if (width > height) {
          if (width > maxDim) {
            height *= maxDim / width
            width = maxDim
          }
        } else {
          if (height > maxDim) {
            width *= maxDim / height
            height = maxDim
          }
        }
        
        canvas.width = width
        canvas.height = height
        
        // Draw to canvas
        ctx.drawImage(img, 0, 0, width, height)
        
        // Export as blob
        canvas.toBlob((blob) => {
          resolve(blob)
        }, 'image/jpeg', 0.7)
      }
      img.onerror = () => resolve(null)
      img.src = e.target.result as string
    }
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })
}
