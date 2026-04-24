import crypto from 'crypto';
import bcrypt from 'bcrypt';

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