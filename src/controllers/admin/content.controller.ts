import { Request, Response } from 'express';
import { db } from '../../config/database.js';
import { services, additionalCapabilities, techStackLayers, trustSignals } from '../../db/schema.js';
import { eq, desc, asc } from 'drizzle-orm';
import { z } from 'zod';

// ============================================================================
// Shared Utilities
// ============================================================================

async function getNextOrder(table: any) {
    const existing = await db
        .select({ displayOrder: table.displayOrder })
        .from(table)
        .orderBy(desc(table.displayOrder))
        .limit(1);
    return (existing[0]?.displayOrder || 0) + 1;
}

// ============================================================================
// Services
// ============================================================================

export const serviceSchema = z.object({
    title: z.string().min(1),
    iconName: z.string().min(1),
    inputDescription: z.string().min(1),
    outputDescription: z.string().min(1),
    isPublished: z.boolean().default(false),
});

export async function getServices(_req: Request, res: Response): Promise<void> {
    try {
        const data = await db.select().from(services).orderBy(asc(services.displayOrder));
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function getServiceById(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const [item] = await db.select().from(services).where(eq(services.id, id));
        if (!item) res.status(404).json({ error: 'Service not found' });
        else res.json(item);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function createService(req: Request, res: Response): Promise<void> {
    try {
        const nextOrder = await getNextOrder(services);
        const [newItem] = await db.insert(services).values({
            ...req.body,
            displayOrder: nextOrder
        }).returning();
        res.status(201).json(newItem);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function updateService(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const [updated] = await db.update(services).set({ ...req.body, updatedAt: new Date() }).where(eq(services.id, id)).returning();
        if (!updated) res.status(404).json({ error: 'Service not found' });
        else res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function deleteService(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const [deleted] = await db.delete(services).where(eq(services.id, id)).returning();
        if (!deleted) res.status(404).json({ error: 'Service not found' });
        else res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function reorderServices(req: Request, res: Response): Promise<void> {
    try {
        const { items } = req.body;
        await db.transaction(async (tx) => {
            for (const item of items) {
                await tx.update(services).set({ displayOrder: item.order }).where(eq(services.id, item.id));
            }
        });
        res.json({ message: 'Reordered' });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

// ============================================================================
// Additional Capabilities
// ============================================================================

export const capabilitySchema = z.object({
    label: z.string().min(1),
    iconName: z.string().min(1),
});

export async function getCapabilities(_req: Request, res: Response): Promise<void> {
    try {
        const data = await db.select().from(additionalCapabilities).orderBy(asc(additionalCapabilities.displayOrder));
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function getCapabilityById(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const [item] = await db.select().from(additionalCapabilities).where(eq(additionalCapabilities.id, id));
        if (!item) res.status(404).json({ error: 'Capability not found' });
        else res.json(item);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function createCapability(req: Request, res: Response): Promise<void> {
    try {
        const nextOrder = await getNextOrder(additionalCapabilities);
        const [newItem] = await db.insert(additionalCapabilities).values({
            ...req.body,
            displayOrder: nextOrder
        }).returning();
        res.status(201).json(newItem);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function updateCapability(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const [updated] = await db.update(additionalCapabilities).set({ ...req.body }).where(eq(additionalCapabilities.id, id)).returning();
        if (!updated) res.status(404).json({ error: 'Capability not found' });
        else res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function deleteCapability(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const [deleted] = await db.delete(additionalCapabilities).where(eq(additionalCapabilities.id, id)).returning();
        if (!deleted) res.status(404).json({ error: 'Capability not found' });
        else res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function reorderCapabilities(req: Request, res: Response): Promise<void> {
    try {
        const { items } = req.body;
        await db.transaction(async (tx) => {
            for (const item of items) {
                await tx.update(additionalCapabilities).set({ displayOrder: item.order }).where(eq(additionalCapabilities.id, item.id));
            }
        });
        res.json({ message: 'Reordered' });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

// ============================================================================
// Tech Stack Layers
// ============================================================================

export const techStackSchema = z.object({
    layerName: z.string().min(1),
    technologies: z.array(z.string()),
});

export async function getTechStack(_req: Request, res: Response): Promise<void> {
    try {
        const data = await db.select().from(techStackLayers).orderBy(asc(techStackLayers.displayOrder));
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function getTechStackById(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const [item] = await db.select().from(techStackLayers).where(eq(techStackLayers.id, id));
        if (!item) res.status(404).json({ error: 'Layer not found' });
        else res.json(item);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function createTechStack(req: Request, res: Response): Promise<void> {
    try {
        const nextOrder = await getNextOrder(techStackLayers);
        const [newItem] = await db.insert(techStackLayers).values({
            ...req.body,
            displayOrder: nextOrder
        }).returning();
        res.status(201).json(newItem);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function updateTechStack(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const [updated] = await db.update(techStackLayers).set({ ...req.body, updatedAt: new Date() }).where(eq(techStackLayers.id, id)).returning();
        if (!updated) res.status(404).json({ error: 'Layer not found' });
        else res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function deleteTechStack(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const [deleted] = await db.delete(techStackLayers).where(eq(techStackLayers.id, id)).returning();
        if (!deleted) res.status(404).json({ error: 'Layer not found' });
        else res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function reorderTechStack(req: Request, res: Response): Promise<void> {
    try {
        const { items } = req.body;
        await db.transaction(async (tx) => {
            for (const item of items) {
                await tx.update(techStackLayers).set({ displayOrder: item.order }).where(eq(techStackLayers.id, item.id));
            }
        });
        res.json({ message: 'Reordered' });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

// ============================================================================
// Trust Signals
// ============================================================================

export const trustSignalSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    iconName: z.string().min(1),
    isPublished: z.boolean().default(false),
});

export async function getTrustSignals(_req: Request, res: Response): Promise<void> {
    try {
        const data = await db.select().from(trustSignals).orderBy(asc(trustSignals.displayOrder));
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function getTrustSignalById(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const [item] = await db.select().from(trustSignals).where(eq(trustSignals.id, id));
        if (!item) res.status(404).json({ error: 'Signal not found' });
        else res.json(item);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function createTrustSignal(req: Request, res: Response): Promise<void> {
    try {
        const nextOrder = await getNextOrder(trustSignals);
        const [newItem] = await db.insert(trustSignals).values({
            ...req.body,
            displayOrder: nextOrder
        }).returning();
        res.status(201).json(newItem);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function updateTrustSignal(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const [updated] = await db.update(trustSignals).set({ ...req.body, updatedAt: new Date() }).where(eq(trustSignals.id, id)).returning();
        if (!updated) res.status(404).json({ error: 'Signal not found' });
        else res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function deleteTrustSignal(req: Request, res: Response): Promise<void> {
    try {
        const id = req.params.id as string;
        const [deleted] = await db.delete(trustSignals).where(eq(trustSignals.id, id)).returning();
        if (!deleted) res.status(404).json({ error: 'Signal not found' });
        else res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function reorderTrustSignals(req: Request, res: Response): Promise<void> {
    try {
        const { items } = req.body;
        await db.transaction(async (tx) => {
            for (const item of items) {
                await tx.update(trustSignals).set({ displayOrder: item.order }).where(eq(trustSignals.id, item.id));
            }
        });
        res.json({ message: 'Reordered' });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
