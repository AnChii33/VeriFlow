import crypto from 'crypto';
import bcrypt from 'bcrypt';

export const hashContent = (content: string): string => {
  return crypto.createHash('sha256').update(content).digest('hex');
};

export const generateRoleId = (role: 'CLIENT' | 'LEGAL_REVIEWER' | 'ADMIN'): string => {
  // 1. Determine the prefix
  let prefix = 'A';
  if (role === 'CLIENT') prefix = 'C';
  if (role === 'LEGAL_REVIEWER') prefix = 'L';

  // 2. Get the current timestamp in milliseconds and convert to Base36
  // Base36 uses 0-9 and A-Z, making it much shorter than a standard number.
  // This ensures the IDs are always sequential when sorted alphabetically.
  const timestamp = Date.now().toString(36).toUpperCase();

  // 3. Generate 4 characters of cryptographic randomness
  // This prevents collisions if two users are created in the exact same millisecond.
  const randomPart = crypto.randomBytes(2).toString('hex').toUpperCase();

  // 4. Combine them into the final short ID
  return `${prefix}-${timestamp}-${randomPart}`;
};

export const getTraceData = (req: any) => {
  return {
    ip: req.ip || req.headers['x-forwarded-for'] || '0.0.0.0',
    ua: req.headers['user-agent'] || 'unknown_client'
  };
};

const SALT_ROUNDS = 10;

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};