import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export const generateRoleId = (role: 'CLIENT' | 'LEGAL_REVIEWER' | 'ADMIN') => {
  const prefix = role === 'CLIENT' ? 'C' : role === 'LEGAL_REVIEWER' ? 'L' : 'A';
  return `${prefix}-${uuidv4()}`;
};

export const hashContent = (content: string): string => {
  return crypto.createHash('sha256').update(content).digest('hex');
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