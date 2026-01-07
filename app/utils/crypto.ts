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
