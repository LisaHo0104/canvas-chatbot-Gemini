import crypto from 'crypto'

// Mock the crypto module
jest.mock('crypto', () => ({
  randomBytes: jest.fn((size) => ({
    toString: jest.fn(() => 'test-iv-hex-string'),
  })),
  createCipher: jest.fn((algorithm, key) => ({
    update: jest.fn((data, inputEncoding, outputEncoding) => 'encrypted-data'),
    final: jest.fn((outputEncoding) => 'final-encrypted'),
  })),
  createDecipher: jest.fn((algorithm, key) => ({
    update: jest.fn((data, inputEncoding, outputEncoding) => 'decrypted-data'),
    final: jest.fn((outputEncoding) => 'final-decrypted'),
  })),
  createHash: jest.fn((algorithm) => ({
    update: jest.fn((data) => ({ digest: jest.fn(() => 'test-hash-hex') })),
  })),
}))

describe('Crypto Utilities', () => {
  // Import after mocking
  const { encrypt, decrypt, hashApiKey } = require('@/lib/crypto')
  
  const testData = 'test-api-key-12345'
  
  describe('encrypt and decrypt', () => {
    it('should encrypt data correctly', () => {
      const encrypted = encrypt(testData)
      expect(encrypted).toBeTruthy()
      expect(encrypted).toContain('test-iv-hex-string')
      expect(encrypted).toContain('encrypted-data')
      expect(encrypted).toContain('final-encrypted')
    })

    it('should decrypt data correctly', () => {
      const encrypted = 'test-iv-hex-string:encrypted-datafinal-encrypted'
      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe('decrypted-datafinal-decrypted')
    })

    it('should handle empty strings', () => {
      const encrypted = encrypt('')
      expect(encrypted).toBeTruthy()
      
      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe('decrypted-datafinal-decrypted')
    })
  })

  describe('hashApiKey', () => {
    it('should hash API key correctly', () => {
      const hash = hashApiKey(testData)
      expect(hash).toBe('test-hash-hex')
      expect(crypto.createHash).toHaveBeenCalledWith('sha256')
    })

    it('should handle empty strings', () => {
      const hash = hashApiKey('')
      expect(hash).toBe('test-hash-hex')
    })
  })
})