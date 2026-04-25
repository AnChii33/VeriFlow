import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { hashContent } from './utils/security'; 

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// --- UTILITY: Safe String Extractor for TS Strict Mode ---
const getSafeTrace = (req: Request) => ({
  ip: String(req.ip || req.socket?.remoteAddress || '0.0.0.0'),
  ua: String(req.headers['user-agent'] || 'unknown_device')
});

// --- 1. LOGIN ROUTE ---
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password, role } = req.body;

  try {
    let user;
    if (role === 'CLIENT') {
      user = await prisma.client.findUnique({ where: { email: String(email) } });
    } else if (role === 'LEGAL_REVIEWER') {
      user = await prisma.legalReviewer.findUnique({ where: { email: String(email) } });
    } else if (role === 'ADMIN') {
      user = await prisma.admin.findUnique({ where: { email: String(email) } });
    }

    if (!user) return res.status(404).json({ error: 'User not found' });

    const cred = await prisma.credential.findUnique({ where: { userId: user.id } });
    if (!cred || cred.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ ...user, role });
  } catch (error) {
    res.status(500).json({ error: 'Authentication service failed' });
  }
});

// --- 2. STATE: pending_ai_flags ---
app.post('/api/templates/submit', async (req: Request, res: Response) => {
  const { title, documentType, content, clientId } = req.body;
  const { ip, ua } = getSafeTrace(req);
  const safeClientId = String(clientId);

  try {
    const client = await prisma.client.findUnique({ where: { id: safeClientId } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    
    const result = await prisma.$transaction(async (tx) => {
      const template = await tx.template.create({
        data: { 
          title: String(title), 
          documentType: String(documentType), 
          content: String(content), 
          clientId: safeClientId, 
          status: 'pending_ai_flags' 
        }
      });

      await tx.auditLog.create({
        data: {
          templateId: template.id, actorId: safeClientId, actorType: 'CLIENT',
          newState: 'pending_ai_flags', details: 'Client initiated draft for AI analysis'
        }
      });

      await tx.signatureRecord.create({
        data: {
          templateId: template.id, clientId: safeClientId, action: 'CLIENT_SUBMIT',
          printedName: client.name, signatureMeaning: 'Initial Draft Submission',
          documentHash: hashContent(String(content)), ipAddress: ip, userTrace: ua
        }
      });

      return template;
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Transaction failed' });
  }
});

// --- 3. STATE: pending_legal ---
app.post('/api/ai/analysis-complete', async (req: Request, res: Response) => {
  const templateId = String(req.body.templateId);
  const flags = req.body.flags || [];

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.template.update({
        where: { id: templateId },
        data: { 
          status: 'pending_legal',
          flags: { 
            create: flags.map((f: any) => ({ 
              cfr_section: String(f.cfr_section), 
              explanation: String(f.explanation) 
            })) 
          }
        },
        include: { flags: true } // Ensures TypeScript knows flags exist on return
      });

      await tx.auditLog.create({
        data: {
          templateId, actorId: 'RAG_ENGINE', actorType: 'AI',
          newState: 'pending_legal', details: 'AI Analysis complete. Flags attached.'
        }
      });
      return updated;
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'AI ingestion failed' });
  }
});

// --- 4. STATE: pending_ai_redrafts OR approved ---
app.patch('/api/legal/review/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const reviewerId = String(req.body.reviewerId);
  const { ip, ua } = getSafeTrace(req);

  try {
    const reviewer = await prisma.legalReviewer.findUnique({ where: { id: reviewerId } });
    const template = await prisma.template.findUnique({ where: { id }, include: { flags: true } });

    if (!template || !reviewer) return res.status(404).json({ error: 'Reference not found' });

    const nextState = template.flags.length > 0 ? 'pending_ai_redrafts' : 'approved';

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.template.update({
        where: { id }, data: { status: nextState, reviewerId }
      });

      await tx.auditLog.create({
        data: {
          templateId: id, actorId: reviewerId, actorType: 'LEGAL_REVIEWER',
          newState: nextState, details: `Legal review processed.`
        }
      });

      return updated;
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Legal review failed' });
  }
});

// --- 5. STATE: pending_client_action ---
app.post('/api/ai/redrafts-complete', async (req: Request, res: Response) => {
  const templateId = String(req.body.templateId);
  const aiContent = String(req.body.aiContent);

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.redraftedTemplate.create({
        data: { templateId, modContent: aiContent, status: 'pending' }
      });

      const updated = await tx.template.update({
        where: { id: templateId }, data: { status: 'pending_client_action' }
      });

      await tx.auditLog.create({
        data: {
          templateId, actorId: 'RAG_ENGINE', actorType: 'AI',
          newState: 'pending_client_action', details: 'AI redrafts generated.'
        }
      });
      return updated;
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Redraft ingestion failed' });
  }
});

// --- 6. STATE: approved OR pending_ai_flags ---
app.post('/api/client/respond/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const action = String(req.body.action);
  const manualContent = req.body.manualContent ? String(req.body.manualContent) : null;
  const { ip, ua } = getSafeTrace(req);

  try {
    const template = await prisma.template.findUnique({ where: { id } });
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const client = await prisma.client.findUnique({ where: { id: template.clientId }});

    const result = await prisma.$transaction(async (tx) => {
      if (action === 'ACCEPT') {
        const latestRedraft = await tx.redraftedTemplate.findFirst({
          where: { templateId: id }, orderBy: { createdAt: 'desc' }
        });

        const finalContent = latestRedraft?.modContent || template.content;

        const updated = await tx.template.update({
          where: { id }, data: { status: 'approved', content: finalContent }
        });

        await tx.auditLog.create({
          data: {
            templateId: id, actorId: template.clientId, actorType: 'CLIENT',
            newState: 'approved', details: 'Client accepted AI redrafts.'
          }
        });

        if (client) {
          await tx.signatureRecord.create({
            data: {
              templateId: id, clientId: template.clientId, action: 'CLIENT_ACCEPT_REDRAFT',
              printedName: client.name, signatureMeaning: 'Acceptance of Compliant Redraft',
              documentHash: hashContent(finalContent), ipAddress: ip, userTrace: ua
            }
          });
        }
        return updated;
      } else {
        const updated = await tx.template.update({
          where: { id }, data: { content: manualContent as string, status: 'pending_ai_flags' }
        });
        
        await tx.legalFlag.deleteMany({ where: { templateId: id } });

        await tx.auditLog.create({
          data: {
            templateId: id, actorId: template.clientId, actorType: 'CLIENT',
            newState: 'pending_ai_flags', details: 'Client manual edit submitted.'
          }
        });
        return updated;
      }
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Client response failed' });
  }
});

// --- 7. GLOBAL ADMIN LEDGER ---
app.get('/api/admin/ledger', async (req: Request, res: Response) => {
  try {
    const auditTrail = await prisma.template.findMany({
      include: {
        client: true, reviewer: true, flags: true, redrafts: true,
        auditLogs: { orderBy: { createdAt: 'desc' } },
        // Fixed: signatures sort by signedAt, not createdAt
        signatures: { orderBy: { signedAt: 'desc' } } 
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(auditTrail);
  } catch (e) {
    res.status(500).json({ error: 'Failed to retrieve ledger' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`VERIFLOW_BACKEND_RUNNING_ON_${PORT}`));