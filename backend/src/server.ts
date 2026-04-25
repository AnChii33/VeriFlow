// backend/src/server.ts
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// --- AUTHENTICATION ---
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const client = await prisma.client.findUnique({ where: { email }, include: { company: true } });
    if (client) return res.json({ role: 'CLIENT', user: client });

    const reviewer = await prisma.legalReviewer.findUnique({ where: { email } });
    if (reviewer) return res.json({ role: 'LEGAL_REVIEWER', user: reviewer });

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (admin) return res.json({ role: 'ADMIN', user: admin });

    res.status(401).send('Invalid credentials');
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

// --- CLIENT OPERATIONS ---
app.post('/api/templates/submit', async (req, res) => {
  try {
    const { title, documentType, content, clientId } = req.body;
    const template = await prisma.template.create({
      data: {
        title,
        documentType,
        content,
        status: 'pending_ai_flags',
        clientId
      }
    });

    await prisma.auditLog.create({
      data: {
        templateId: template.id,
        actorId: clientId,
        actorType: 'CLIENT',
        newState: 'pending_ai_flags',
        details: 'Initial submission'
      }
    });

    res.json(template);
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

app.get('/api/client/templates/:clientId', async (req, res) => {
  try {
    const templates = await prisma.template.findMany({
      where: { clientId: req.params.clientId },
      include: {
        flags: true,
        // Only fetch active suggestions waiting for a response
        redrafts: {
          where: { status: 'pending' },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(templates);
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

// UPDATED: Advanced Redraft State Management
app.post('/api/client/respond/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, manualContent, selectedRedraftId } = req.body;

    const template = await prisma.template.findUnique({ where: { id } });
    if (!template) return res.status(404).send('Template not found');

    if (action === 'ACCEPT') {
      if (!selectedRedraftId) return res.status(400).send('No redraft selected');

      const chosenRedraft = await prisma.redraftedTemplate.findUnique({ where: { id: selectedRedraftId } });
      if (!chosenRedraft) return res.status(404).send('Redraft not found');

      // 1. Mark chosen as accepted, others as rejected
      await prisma.redraftedTemplate.updateMany({
        where: { templateId: id },
        data: { status: 'rejected' }
      });
      await prisma.redraftedTemplate.update({
        where: { id: selectedRedraftId },
        data: { status: 'accepted' }
      });

      // 2. Update Template content and status
      await prisma.template.update({
        where: { id },
        data: { 
          content: chosenRedraft.modContent, 
          status: 'approved' 
        }
      });

      // 3. Audit
      await prisma.auditLog.create({
        data: {
          templateId: id,
          actorId: template.clientId,
          actorType: 'CLIENT',
          prevState: 'pending_client_action',
          newState: 'approved',
          details: 'Client accepted AI redraft.'
        }
      });

      res.json({ message: 'Redraft accepted' });

    } else if (action === 'RE_SUBMIT') {
      
      // 1. Mark all current AI suggestions as rejected
      await prisma.redraftedTemplate.updateMany({
        where: { templateId: id },
        data: { status: 'rejected' }
      });

      // 2. Delete existing flags to reset the AI context
      await prisma.legalFlag.deleteMany({
        where: { templateId: id }
      });

      // 3. Apply manual content and loop back to AI flags phase
      await prisma.template.update({
        where: { id },
        data: {
          content: manualContent,
          status: 'pending_ai_flags'
        }
      });

      // 4. Audit
      await prisma.auditLog.create({
        data: {
          templateId: id,
          actorId: template.clientId,
          actorType: 'CLIENT',
          prevState: 'pending_client_action',
          newState: 'pending_ai_flags',
          details: 'Client submitted manual revision. Triggering re-analysis.'
        }
      });

      res.json({ message: 'Manual revision queued' });
    }
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

// --- LEGAL REVIEWER OPERATIONS ---
app.get('/api/legal/queue', async (req, res) => {
  try {
    const templates = await prisma.template.findMany({
      where: { status: 'pending_legal' },
      include: {
        client: { include: { company: true } },
        flags: true,
        signatures: true // ADDED: Critical for Reviewer Context
      }
    });
    res.json(templates);
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

app.patch('/api/legal/review/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewerId, decisions } = req.body;

    for (const [flagId, decisionStatus] of Object.entries(decisions)) {
      await prisma.legalFlag.update({
        where: { id: flagId },
        data: { status: decisionStatus as string }
      });
    }

    const confirmedCount = Object.values(decisions).filter(s => s === 'confirmed').length;
    const nextStatus = confirmedCount > 0 ? 'pending_ai_redrafts' : 'approved';

    await prisma.template.update({
      where: { id },
      data: { status: nextStatus }
    });

    await prisma.auditLog.create({
      data: {
        templateId: id,
        actorId: reviewerId,
        actorType: 'LEGAL_REVIEWER',
        prevState: 'pending_legal',
        newState: nextStatus,
        details: `Review completed. Confirmed ${confirmedCount} flags.`
      }
    });

    res.json({ message: 'Review recorded' });
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

// --- ADMIN OPERATIONS ---
app.get('/api/admin/ledger', async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        template: { include: { client: { include: { company: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(logs);
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

app.get('/api/admin/companies', async (req, res) => {
  const companies = await prisma.company.findMany();
  res.json(companies);
});

app.post('/api/admin/companies', async (req, res) => {
  const company = await prisma.company.create({ data: req.body });
  res.json(company);
});

app.delete('/api/admin/companies/:id', async (req, res) => {
  await prisma.company.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

app.get('/api/admin/users', async (req, res) => {
  const clients = await prisma.client.findMany({ include: { company: true } });
  const reviewers = await prisma.legalReviewer.findMany();
  res.json([...clients.map(c => ({...c, role: 'CLIENT'})), ...reviewers.map(r => ({...r, role: 'LEGAL_REVIEWER'}))]);
});

app.post('/api/admin/users', async (req, res) => {
  const { role, password, ...userData } = req.body;
  
  if (role === 'CLIENT') {
    const c = await prisma.client.create({ data: userData });
    await prisma.credential.create({ data: { userId: c.id, role, password } });
    res.json(c);
  } else {
    const r = await prisma.legalReviewer.create({ data: userData });
    await prisma.credential.create({ data: { userId: r.id, role, password } });
    res.json(r);
  }
});

app.patch('/api/admin/users/:id', async (req, res) => {
  const { id } = req.params;
  const { role, ...updateData } = req.body;
  try {
    if (role === 'CLIENT') {
      const u = await prisma.client.update({ where: { id }, data: updateData });
      res.json(u);
    } else {
      const u = await prisma.legalReviewer.update({ where: { id }, data: updateData });
      res.json(u);
    }
  } catch(e) {
    res.status(500).json({error: "Update failed"});
  }
});

app.delete('/api/admin/users/:id', async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (role === 'CLIENT') await prisma.client.delete({ where: { id } });
  else await prisma.legalReviewer.delete({ where: { id } });

  await prisma.credential.delete({ where: { userId: id } }).catch(() => {});
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));