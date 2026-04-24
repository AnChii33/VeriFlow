import crypto from 'crypto';

export const hashContent = (content: string): string => {
  return crypto.createHash('sha256').update(content).digest('hex');
};

export const getTraceData = (req: any) => {
  return {
    ip: req.ip || req.headers['x-forwarded-for'] || '0.0.0.0',
    ua: req.headers['user-agent'] || 'unknown_client'
  };
};