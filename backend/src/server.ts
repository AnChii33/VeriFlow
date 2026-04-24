import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { hashContent, getTraceData } from './utils/security';
import { hashPassword, comparePassword } from './utils/security';

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password, role } = req.body;

  try {
    let user;
    if (role === 'CLIENT') {
      user = await prisma.client.findUnique({ where: { email } });
    } else if (role === 'LEGAL') {
      user = await prisma.legalReviewer.findUnique({ where: { email } });
    }

    if (user && await comparePassword(password, user.password)) {
      // In a production app, return a JWT here
      res.json({ success: true, userId: user.id, name: user.name });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/templates/submit', async (req: Request, res: Response) => {
  const { title, documentType, content, clientId } = req.body;
  const { ip, ua } = getTraceData(req);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const template = await tx.template.create({
        data: { title, documentType, content, clientId, status: 'pending_ai_flags' }
      });

      await tx.auditLog.create({
        data: {
          templateId: template.id,
          actorId: clientId,
          actorType: 'CLIENT',
          newState: 'pending_ai_flags',
          details: 'Initial submission'
        }
      });

      await tx.signatureRecord.create({
        data: {
          templateId: template.id,
          clientId,
          action: 'CLIENT_SUBMIT_FOR_AI_ANALYSIS',
          printedName: 'CLIENT_AUTH_SIG',
          signatureMeaning: 'Certification of content for AI analysis',
          documentHash: hashContent(content),
          ipAddress: ip,
          userTrace: ua
        }
      });

      return template;
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Database transaction failed' });
  }
});

app.post('/api/ai/analysis-complete', async (req: Request, res: Response) => {
  const { templateId, flags } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.template.update({
        where: { id: templateId },
        data: { 
          status: 'pending_legal',
          flags: {
            create: flags.map((f: any) => ({
              cfr_section: f.cfr_section,
              explanation: f.explanation
            }))
          }
        }
      });

      await tx.auditLog.create({
        data: {
          templateId,
          actorId: 'RAG_ENGINE',
          actorType: 'AI',
          newState: 'pending_legal',
          details: 'AI analysis completed and flags generated'
        }
      });

      return updated;
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'AI analysis ingestion failed' });
  }
});

app.post('/api/ai/redrafts-complete', async (req: Request, res: Response) => {
  const { templateId, aiContent } = req.body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.redraftedTemplate.create({
        data: { templateId, modContent: aiContent, status: 'pending' }
      });

      const updated = await tx.template.update({
        where: { id: templateId },
        data: { status: 'pending_client_action' }
      });

      await tx.auditLog.create({
        data: {
          templateId,
          actorId: 'RAG_ENGINE',
          actorType: 'AI',
          newState: 'pending_client_action',
          details: 'AI redrafting completed'
        }
      });

      return updated;
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'AI redraft ingestion failed' });
  }
});

app.patch('/api/legal/review/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reviewerId } = req.body;
  const { ip, ua } = getTraceData(req);

  try {
    const template = await prisma.template.findUnique({ 
      where: { id },
      include: { flags: true }
    });

    if (!template) return res.status(404).send();

    const hasFlags = template.flags.length > 0;
    const nextState = hasFlags ? 'pending_ai_redrafts' : 'approved';

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.template.update({
        where: { id },
        data: { status: nextState, reviewerId }
      });

      await tx.auditLog.create({
        data: {
          templateId: id,
          actorId: reviewerId,
          actorType: 'LEGAL_REVIEWER',
          newState: nextState,
          details: 'Legal review decision processed'
        }
      });

      await tx.signatureRecord.create({
        data: {
          templateId: id,
          reviewerId,
          action: 'LEGAL_REVIEW_SIG',
          printedName: 'LEGAL_AUTH_USER',
          signatureMeaning: 'Certification of legal review',
          documentHash: hashContent(template.content),
          ipAddress: ip,
          userTrace: ua
        }
      });

      return updated;
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Legal review transition failed' });
  }
});

app.post('/api/client/respond/:id', async (req: Request, res: Response) => {
  const { action, manualContent } = req.body;
  const { id } = req.params;
  const { ip, ua } = getTraceData(req);

  try {
    const template = await prisma.template.findUnique({ where: { id } });
    if (!template) return res.status(404).send();

    const result = await prisma.$transaction(async (tx) => {
      if (action === 'ACCEPT') {
        const latestRedraft = await tx.redraftedTemplate.findFirst({
          where: { templateId: id },
          orderBy: { createdAt: 'desc' }
        });

        const finalContent = latestRedraft?.modContent || template.content;

        const updated = await tx.template.update({
          where: { id },
          data: { status: 'approved', content: finalContent }
        });

        await tx.auditLog.create({
          data: {
            templateId: id,
            actorId: template.clientId,
            actorType: 'CLIENT',
            newState: 'approved',
            details: 'Client accepted AI redraft'
          }
        });

        await tx.signatureRecord.create({
          data: {
            templateId: id,
            clientId: template.clientId,
            action: 'FINAL_ACCEPTANCE_SIG',
            printedName: 'CLIENT_SIGNATORY',
            signatureMeaning: 'Final certification of compliant document',
            documentHash: hashContent(finalContent),
            ipAddress: ip,
            userTrace: ua
          }
        });

        return updated;
      } else {
        const updated = await tx.template.update({
          where: { id },
          data: { 
            content: manualContent, 
            status: 'pending_ai_flags',
          }
        });

        await tx.legalFlag.deleteMany({ where: { templateId: id } });

        await tx.auditLog.create({
          data: {
            templateId: id,
            actorId: template.clientId,
            actorType: 'CLIENT',
            newState: 'pending_ai_flags',
            details: 'Client manual resubmission'
          }
        });

        return updated;
      }
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Client resolution failed' });
  }
});

app.get('/api/admin/ledger', async (req: Request, res: Response) => {
  try {
    const auditTrail = await prisma.template.findMany({
      include: {
        client: { include: { company: true } },
        reviewer: true,
        flags: true,
        redrafts: true,
        auditLogs: { orderBy: { createdAt: 'desc' } },
        signatures: { orderBy: { createdAt: 'desc' } }
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(auditTrail);
  } catch (e) {
    res.status(500).json({ error: 'Failed to retrieve ledger' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`VERIFLOW_BACKEND_RUNNING_ON_PORT_${PORT}`);
});