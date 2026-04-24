import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

type DocType = "NDA" | "NONCOMPETE" | "OPTIN" | "REFERRAL" | "MSG_TEMPLATE" | "LEGAL_CONTRACT";
const DOC_TYPES: DocType[] = ["NDA", "NONCOMPETE", "OPTIN", "REFERRAL", "MSG_TEMPLATE", "LEGAL_CONTRACT"];


// ---------- SUBMIT NEW TEMPLATE ----------
app.post('/api/templates', async (req: Request, res: Response): Promise<any> => {
  try {
    const { title, documentType, content, clientId, ipAddress, userTrace } = req.body;

    // Validation
    if (!title || !documentType || !content || !clientId) {
      return res.status(400).json({ error: "Missing required fields." });
    }
    if (!DOC_TYPES.includes(documentType)) {
      return res.status(400).json({ error: `Invalid type. Must be one of: ${DOC_TYPES.join(', ')}` });
    }

    // Fetch Client Context for the Ledger
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { company: true }
    });

    if (!client) {
      return res.status(404).json({ error: "Client not found in the database." });
    }

    // Cryptographic Hashing
    const documentHash = crypto.createHash('sha256').update(content).digest('hex');
    const printedName = `${client.company.name} (Rep: ${client.name})`;

    // Atomic Database Transaction (All succeed or all fail)
    const result = await prisma.$transaction(async (tx) => {
      
      // Create the core template
      const newTemplate = await tx.template.create({
        data: {
          title,
          documentType,
          content,
          clientId,
          status: "PENDING_REVIEW"
        }
      });

      // Create the Audit Log entry
      await tx.auditLog.create({
        data: {
          templateId: newTemplate.id,
          actorId: clientId,
          actorType: "CLIENT",
          prevState: null,
          newState: "PENDING_REVIEW",
          details: "Initial document submission"
        }
      });

      // Create the 21 CFR Part 11 Signature Record
      await tx.signatureRecord.create({
        data: {
          templateId: newTemplate.id,
          action: "INITIAL_SUBMISSION",
          clientId: clientId,
          printedName: printedName,
          signatureMeaning: "Intent to submit messaging template for compliance review",
          documentHash: documentHash,
          ipAddress: ipAddress || "Unknown",
          userTrace: userTrace || "Unknown"
        }
      });

      return newTemplate;
    });

    console.log(`[NEW SUBMISSION] Template ${result.id} secured with hash: ${documentHash.slice(0, 8)}...`);
    return res.status(201).json(result);

  } catch (error: any) {
    console.error("[SUBMIT ERROR]", error.message);
    return res.status(500).json({ error: "Internal server error during submission." });
  }
});


// --------- GET ALL TEMPLATES (Admin) -----------
app.get('/api/templates', async (req: Request, res: Response) => {
  try {
    const templates = await prisma.template.findMany({
      include: {
        client: { select: { name: true, company: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json(templates);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch templates" });
  }
});

// --------- SERVER BOOT ---------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`VeriFlow API running on http://localhost:${PORT}`);
});