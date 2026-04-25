import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { hashContent, generateRoleId } from './utils/security'; 
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());


const ensureString = (val: any, fallback = ''): string => {
  if (val === undefined || val === null) return fallback;
  if (Array.isArray(val)) return String(val[0]);
  return String(val);
};

const getSafeTrace = (req: Request) => ({
  ip: ensureString(req.ip || req.socket?.remoteAddress, '0.0.0.0'),
  ua: ensureString(req.headers['user-agent'], 'unknown_device')
});


// --- 1. LOGIN ROUTE ---
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const email = ensureString(req.body.email);
  const password = ensureString(req.body.password);
  const role = ensureString(req.body.role);

  try {
    let user;
    if (role === 'CLIENT') {
      user = await prisma.client.findUnique({ where: { email } });
    } else if (role === 'LEGAL_REVIEWER') {
      user = await prisma.legalReviewer.findUnique({ where: { email } });
    } else if (role === 'ADMIN') {
      user = await prisma.admin.findUnique({ where: { email } });
    }

    if (!user) return res.status(404).json({ error: 'User not found' });

    const cred = await prisma.credential.findUnique({ where: { userId: user.id } });
    
    // BCRYPT SECURE COMPARISON
    if (!cred || !(await bcrypt.compare(password, cred.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ ...user, role });
  } catch (error) {
    res.status(500).json({ error: 'Authentication service failed' });
  }
});

// --- 2. STATE: pending_ai_flags ---
app.post('/api/templates/submit', async (req: Request, res: Response) => {
  const title = ensureString(req.body.title);
  const documentType = ensureString(req.body.documentType);
  const content = ensureString(req.body.content);
  const safeClientId = ensureString(req.body.clientId);
  const { ip, ua } = getSafeTrace(req);

  try {
    const client = await prisma.client.findUnique({ where: { id: safeClientId } });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    
    const result = await prisma.$transaction(async (tx) => {
      const template = await tx.template.create({
        data: { 
          title, documentType, content, 
          clientId: safeClientId, status: 'pending_ai_flags' 
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
          documentHash: hashContent(content), ipAddress: ip, userTrace: ua
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
  const templateId = ensureString(req.body.templateId);
  const flags = Array.isArray(req.body.flags) ? req.body.flags : [];

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.template.update({
        where: { id: templateId },
        data: { 
          status: 'pending_legal',
          flags: { 
            create: flags.map((f: any) => ({ 
              cfr_section: ensureString(f.cfr_section), 
              explanation: ensureString(f.explanation) 
            })) 
          }
        },
        include: { flags: true } 
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
  const id = ensureString(req.params.id);
  const reviewerId = ensureString(req.body.reviewerId);
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

      await tx.signatureRecord.create({
        data: {
          templateId: id, reviewerId, action: 'LEGAL_REVIEW_DECISION',
          printedName: reviewer.name, signatureMeaning: 'Certification of legal compliance review',
          documentHash: hashContent(template.content), ipAddress: ip, userTrace: ua
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
  const templateId = ensureString(req.body.templateId);
  const aiContent = ensureString(req.body.aiContent);

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
  const id = ensureString(req.params.id);
  const action = ensureString(req.body.action);
  const manualContent = ensureString(req.body.manualContent);
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
          where: { id }, data: { content: manualContent, status: 'pending_ai_flags' }
        });
        
        await tx.legalFlag.deleteMany({ where: { templateId: id } });

        await tx.auditLog.create({
          data: {
            templateId: id, actorId: template.clientId, actorType: 'CLIENT',
            newState: 'pending_ai_flags', details: 'Client manual edit submitted.'
          }
        });

        if (client) {
          await tx.signatureRecord.create({
            data: {
              templateId: id, clientId: template.clientId, action: 'CLIENT_MANUAL_RESUBMIT',
              printedName: client.name, signatureMeaning: 'Manual edit and resubmission for AI analysis',
              documentHash: hashContent(manualContent), ipAddress: ip, userTrace: ua
            }
          });
        }
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
        signatures: { orderBy: { signedAt: 'desc' } } 
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(auditTrail);
  } catch (e) {
    res.status(500).json({ error: 'Failed to retrieve ledger' });
  }
});

// --- GET ALL COMPANIES ---
app.get('/api/admin/companies', async (req: Request, res: Response) => {
  try {
    const companies = await prisma.company.findMany({
      include: { _count: { select: { clients: true } } }, 
      orderBy: { createdAt: 'desc' }
    });
    res.json(companies);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// --- CREATE NEW COMPANY ---
app.post('/api/admin/companies', async (req: Request, res: Response) => {
  const name = ensureString(req.body.name);
  const domain = ensureString(req.body.domain);
  try {
    const company = await prisma.company.create({
      data: { name, domain: domain || null }
    });
    res.status(201).json(company);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create company' });
  }
});

// --- CREATE NEW USERS ---
app.post('/api/admin/users', async (req: Request, res: Response) => {
  const safeRole = ensureString(req.body.role) as 'CLIENT' | 'LEGAL_REVIEWER' | 'ADMIN';
  const email = ensureString(req.body.email);
  const name = ensureString(req.body.name);
  const password = ensureString(req.body.password);
  const companyId = ensureString(req.body.companyId);
  const barNumber = ensureString(req.body.barNumber);

  try {
    const newId = generateRoleId(safeRole);
    // BCRYPT HASHING
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      if (safeRole === 'CLIENT') {
        if (!companyId) throw new Error("companyId is required for Clients");
        await tx.client.create({
          data: { id: newId, email, name, companyId }
        });
      } else if (safeRole === 'LEGAL_REVIEWER') {
        await tx.legalReviewer.create({
          data: { id: newId, email, name, barNumber: barNumber || null }
        });
      } else if (safeRole === 'ADMIN') {
        await tx.admin.create({
          data: { id: newId, email, name }
        });
      }

      await tx.credential.create({
        data: { userId: newId, role: safeRole, password: hashedPassword }
      });

      return { id: newId, email, role: safeRole };
    });

    res.status(201).json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to create user' });
  }
});

// --- GET ALL USERS ---
app.get('/api/admin/users', async (req: Request, res: Response) => {
  try {
    const clients = await prisma.client.findMany({ include: { company: true } });
    const reviewers = await prisma.legalReviewer.findMany();
    const admins = await prisma.admin.findMany();
    res.json({ clients, reviewers, admins });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// --- UPDATE USER ---
app.patch('/api/admin/users/:id', async (req: Request, res: Response) => {
  const id = ensureString(req.params.id);
  const safeRole = ensureString(req.body.role);
  const email = ensureString(req.body.email);
  const name = ensureString(req.body.name);
  const password = ensureString(req.body.password);
  const barNumber = ensureString(req.body.barNumber);

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (safeRole === 'CLIENT') {
        await tx.client.update({ where: { id }, data: { email, name } });
      } else if (safeRole === 'LEGAL_REVIEWER') {
        await tx.legalReviewer.update({ where: { id }, data: { email, name, barNumber: barNumber || null } });
      } else if (safeRole === 'ADMIN') {
        await tx.admin.update({ where: { id }, data: { email, name } });
      }

      if (password && password.trim() !== '') {
        const hashedPassword = await bcrypt.hash(password, 10);
        await tx.credential.update({ where: { userId: id }, data: { password: hashedPassword } });
      }

      return { success: true, message: 'User updated successfully' };
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// --- DELETE USER ---
app.delete('/api/admin/users/:id', async (req: Request, res: Response) => {
  const id = ensureString(req.params.id);
  const safeRole = ensureString(req.body.role);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.credential.deleteMany({ where: { userId: id } });
      if (safeRole === 'CLIENT') await tx.client.delete({ where: { id } });
      else if (safeRole === 'LEGAL_REVIEWER') await tx.legalReviewer.delete({ where: { id } });
      else if (safeRole === 'ADMIN') await tx.admin.delete({ where: { id } });
    });
    res.json({ success: true, message: 'User deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// --- DELETE COMPANY ---
app.delete('/api/admin/companies/:id', async (req: Request, res: Response) => {
  const id = ensureString(req.params.id);
  try {
    await prisma.company.delete({ where: { id } });
    res.json({ success: true, message: 'Company deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete company.' });
  }
});

// --- GET CLIENT TEMPLATES ---
app.get('/api/client/templates/:clientId', async (req: Request, res: Response) => {
  const clientId = ensureString(req.params.clientId);
  try {
    const templates = await prisma.template.findMany({
      where: { clientId },
      include: { flags: true, redrafts: true },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(templates);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// --- GET LEGAL QUEUE ---
app.get('/api/legal/queue', async (req: Request, res: Response) => {
  try {
    const queue = await prisma.template.findMany({
      where: { status: 'pending_legal' },
      include: { client: { select: { name: true, company: true } }, flags: true },
      orderBy: { updatedAt: 'asc' }
    });
    res.json(queue);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch legal queue' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`VERIFLOW_BACKEND_RUNNING_ON_${PORT}`));