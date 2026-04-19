import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Route from App to DB
app.post("/api/templates", async(req, res) => {
    try {
        const { clientTemplate } = req.body;
        const newTemplate = await prisma.template.create({
            data: {
                originalText: clientTemplate,
                status: "pending_ai"
            }
        });

        console.log(`New Template Saved: ${newTemplate.id}`);
        res.status(201).json(newTemplate);
    }
    catch (error) {
        console.error(`Error creating template: ${error}`);
        res.status(500).json({
            error: "Internal Server Error"
        });
    }
});

app.get("/api/templates/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const template = await prisma.template.findUnique({
            where: { id: id },
            include: {
                flags: true,
                redrafts: true
            }
        });

        if (!template) {
            res.status(404).json({
                error: "Template not found"
            });
            return;
        }

        res.status(200).json(template);
    }
    catch (error) {
        console.error("Error fetching template:", error);
        res.status(500).json({error: "Internal Server Error"});
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`VeriFlow API running on http://localhost:${PORT}`);
});