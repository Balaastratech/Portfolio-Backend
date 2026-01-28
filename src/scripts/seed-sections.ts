import { db, pool } from '../config/database.js';
import { clientFitItems, processSteps, aboutItems } from '../db/schema.js';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
    console.log('Seeding new sections...');

    // Client Fit API
    const compatible = [
        "Requirements are defined before engagement",
        "Budget allocation starts at $1,500+",
        "AI-powered systems, SaaS platforms, or automation tools required",
        "Weekly progress visibility expected",
        "Long-term technical partnership valued",
    ];

    const incompatible = [
        "Template customization or quick fixes required",
        "Budget below $1,500 for entire project",
        "Lowest price is the priority metric",
        "Mobile-native iOS/Android development needed",
        "Requirements undefined at engagement",
    ];

    const clientFitData = [
        ...compatible.map((text, i) => ({
            id: uuidv4(),
            type: 'compatible' as const,
            text,
            displayOrder: i + 1,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        })),
        ...incompatible.map((text, i) => ({
            id: uuidv4(),
            type: 'incompatible' as const,
            text,
            displayOrder: i + 1,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        })),
    ];

    // Process API
    const processData = [
        {
            id: uuidv4(),
            title: "Discovery",
            description: "Requirements captured. Alignment verified.",
            iconName: "Phone",
            duration: "30 min",
            displayOrder: 1,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: uuidv4(),
            title: "Proposal",
            description: "Scope defined. Timeline established. Pricing transparent.",
            iconName: "FileText",
            duration: "2-3 days",
            displayOrder: 2,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: uuidv4(),
            title: "Execution",
            description: "Agile development. Weekly demonstrations. Real-time visibility.",
            iconName: "Code",
            duration: "Weekly cycles",
            displayOrder: 3,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: uuidv4(),
            title: "Deployment",
            description: "System launched. Support included. Transition complete.",
            iconName: "Rocket",
            duration: "30 days support",
            displayOrder: 4,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        }
    ];

    // About API
    const aboutData = [
        {
            id: uuidv4(),
            title: "Directive",
            description: "Bridge ambitious objectives with technical execution.\nDeliver systems where business outcomes are measurable.",
            displayOrder: 1,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: uuidv4(),
            title: "Method",
            description: "Problems understood before solutions proposed.\nBusiness context, user requirements, success metrics—defined first.\nSimplest viable solution deployed. Iteration based on evidence.",
            displayOrder: 2,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: uuidv4(),
            title: "Transparency",
            description: "Full visibility. Weekly demonstrations. Clear timelines.\nChallenges communicated immediately.\nUnder-promise. Over-deliver.",
            displayOrder: 3,
            isPublished: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        }
    ];

    console.log('Inserting Client Fit items...');
    await db.insert(clientFitItems).values(clientFitData);

    console.log('Inserting Process steps...');
    await db.insert(processSteps).values(processData);

    console.log('Inserting About items...');
    await db.insert(aboutItems).values(aboutData);

    console.log('Seeding completed successfully!');
    await pool.end();
}

seed().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
