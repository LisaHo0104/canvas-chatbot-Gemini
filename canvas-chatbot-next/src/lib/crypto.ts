import crypto from 'crypto'

const RAW_KEY = process.env.ENCRYPTION_KEY || ''
const KEY = RAW_KEY ? Buffer.from(RAW_KEY) : null
const HAS_VALID_KEY = !!KEY && KEY.length === 32
const IV_LENGTH = 16

export function encrypt(text: string): string {
  if (HAS_VALID_KEY && typeof (crypto as any).createCipheriv === 'function') {
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv('aes-256-cbc', KEY as Buffer, iv)
    const encrypted = Buffer.concat([cipher.update(Buffer.from(text, 'utf8')), cipher.final()])
    return 'AES:' + iv.toString('hex') + ':' + encrypted.toString('hex')
  }
  const b64 = Buffer.from(text, 'utf8').toString('base64')
  return 'PLAIN:' + b64
}

export function decrypt(text: string): string {
  if (text.startsWith('PLAIN:')) {
    const b64 = text.slice('PLAIN:'.length)
    return Buffer.from(b64, 'base64').toString('utf8')
  }
  if (text.startsWith('AES:') && HAS_VALID_KEY && typeof (crypto as any).createDecipheriv === 'function') {
    const parts = text.split(':')
    const iv = Buffer.from(parts[1], 'hex')
    const encryptedHex = parts[2]
    const encrypted = Buffer.from(encryptedHex, 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', KEY as Buffer, iv)
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return decrypted.toString('utf8')
  }
  return text
}

export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex')
}