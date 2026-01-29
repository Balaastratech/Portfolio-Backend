import { db, pool } from '../src/config/database.js';
import {
    projects,
    services,
    additionalCapabilities,
    techStackLayers,
    trustSignals,
    siteConfiguration,
    formOptions,
    adminUsers,
    clientFitItems,
    processSteps,
    aboutItems,
    SUPER_ADMIN_PERMISSIONS,
} from '../src/db/schema.js';
import { hashPassword, generateVerificationCode } from '../src/utils/password.js';

// ============================================================================
// SEED DATA - Extracted from Frontend Components
// ============================================================================

// From PortfolioSection.tsx - deployments array
const projectsData = [
    {
        title: "AI Support System",
        category: "AI Integration",
        shortDescription: "Autonomous inquiry processing with 70% ticket reduction",
        fullDescription: "Conversational AI system for e-commerce handling product inquiries, order status, and returns. Integrates with existing CRM and helpdesk infrastructure.",
        previewUrl: "https://ai-chatbot-widget-alpha.vercel.app",
        specifications: [
            "Natural language intent detection",
            "Multi-language support (10+ languages)",
            "Human agent handoff protocol",
            "Real-time sentiment analysis",
            "Shopify, Zendesk, Slack integration",
        ],
        techStack: ["OpenAI GPT-4", "Python", "FastAPI", "PostgreSQL", "Redis"],
        displayOrder: 1,
        isPublished: true,
    },
    {
        title: "Analytics Interface",
        category: "Data Systems",
        shortDescription: "Unified metrics from 6+ data sources",
        fullDescription: "Unified analytics platform for logistics aggregating warehouse, delivery, and sales data into actionable intelligence dashboards.",
        previewUrl: "https://aiinvoiceanalyzer.vercel.app",
        specifications: [
            "Real-time data synchronization",
            "Custom report generation",
            "Automated KPI threshold alerts",
            "Role-based access control",
            "PDF and Excel export",
        ],
        techStack: ["React", "TypeScript", "Node.js", "PostgreSQL", "Recharts"],
        displayOrder: 2,
        isPublished: true,
    },
    {
        title: "Booking Platform",
        category: "SaaS Platform",
        shortDescription: "White-label scheduling for service operations",
        fullDescription: "Multi-tenant booking system for service businesses with customizable branding, payments, reminders, and client management.",
        previewUrl: "https://example-booking.vercel.app",
        specifications: [
            "White-label customization",
            "Stripe payment integration",
            "SMS and email reminders",
            "Calendar sync (Google, Outlook)",
            "Client portal with history",
        ],
        techStack: ["React", "Node.js", "MongoDB", "Stripe", "Twilio"],
        displayOrder: 3,
        isPublished: true,
    },
    {
        title: "Document Processor",
        category: "Automation",
        shortDescription: "Structured data extraction from contracts",
        fullDescription: "OCR and NLP-powered tool for legal firms that extracts key information, categorizes documents, and flags potential issues.",
        previewUrl: "https://example-docs.vercel.app",
        specifications: [
            "OCR for scanned documents",
            "Key term extraction",
            "Automatic classification",
            "Risk clause flagging",
            "DMS integration",
        ],
        techStack: ["Python", "TensorFlow", "AWS Textract", "FastAPI", "React"],
        displayOrder: 4,
        isPublished: true,
    },
    {
        title: "Commerce Platform",
        category: "Full-Stack",
        shortDescription: "High-performance storefront with seamless checkout",
        fullDescription: "E-commerce platform with product catalog, shopping cart, secure checkout, and order tracking with real-time inventory.",
        previewUrl: "https://example-shop.vercel.app",
        specifications: [
            "Advanced product filtering",
            "Persistent shopping cart",
            "Stripe checkout integration",
            "Order tracking notifications",
            "Inventory management dashboard",
        ],
        techStack: ["React", "Next.js", "Stripe", "PostgreSQL", "Tailwind CSS"],
        displayOrder: 5,
        isPublished: true,
    },
];

// From ServicesSection.tsx - capabilities array
const servicesData = [
    {
        title: "AI Systems",
        iconName: "Bot",
        inputDescription: "Repetitive inquiries consuming human resources",
        outputDescription: "Intelligent agents processing 80% of requests autonomously",
        displayOrder: 1,
        isPublished: true,
    },
    {
        title: "Data Interfaces",
        iconName: "BarChart3",
        inputDescription: "Fragmented data across multiple sources",
        outputDescription: "Unified dashboards with actionable intelligence",
        displayOrder: 2,
        isPublished: true,
    },
    {
        title: "SaaS Platforms",
        iconName: "Rocket",
        inputDescription: "Product concept without technical execution",
        outputDescription: "Full-stack platform with auth, payments, scale",
        displayOrder: 3,
        isPublished: true,
    },
    {
        title: "Process Automation",
        iconName: "Cog",
        inputDescription: "Manual workflows consuming productive hours",
        outputDescription: "Automated systems eliminating repetition and error",
        displayOrder: 4,
        isPublished: true,
    },
];

// From ServicesSection.tsx - additionalCapabilities array
const additionalCapabilitiesData = [
    { label: "Admin Systems", iconName: "Layout", displayOrder: 1 },
    { label: "Commerce Platforms", iconName: "ShoppingCart", displayOrder: 2 },
    { label: "API Integration", iconName: "Plug", displayOrder: 3 },
    { label: "Legacy Modernization", iconName: "RefreshCw", displayOrder: 4 },
];

// From TechStackSection.tsx - infrastructure array
const techStackLayersData = [
    {
        layerName: "Interface",
        technologies: ["React", "Tailwind CSS", "TypeScript"],
        displayOrder: 1,
    },
    {
        layerName: "Server",
        technologies: ["Node.js", "Django", "Python"],
        displayOrder: 2,
    },
    {
        layerName: "Data",
        technologies: ["MySQL", "PostgreSQL", "MongoDB"],
        displayOrder: 3,
    },
    {
        layerName: "Intelligence",
        technologies: ["OpenAI", "TensorFlow", "NLP"],
        displayOrder: 4,
    },
    {
        layerName: "Operations",
        technologies: ["Git", "Docker", "AWS"],
        displayOrder: 5,
    },
];

// From TrustSection.tsx - signals array
const trustSignalsData = [
    {
        title: "Visibility",
        description: "Weekly demonstrations. Clear timelines. Immediate challenge communication.",
        iconName: "Eye",
        displayOrder: 1,
        isPublished: true,
    },
    {
        title: "Depth",
        description: "Architecture designed for scale. Implementation built for longevity.",
        iconName: "Cpu",
        displayOrder: 2,
        isPublished: true,
    },
    {
        title: "Precision",
        description: "Every technical decision tied to measurable business outcome.",
        iconName: "Target",
        displayOrder: 3,
        isPublished: true,
    },
    {
        title: "Continuity",
        description: "30 days post-launch support included. Transition guaranteed.",
        iconName: "HeadphonesIcon",
        displayOrder: 4,
        isPublished: true,
    },
];

// From ContactSection.tsx - systemTypes array
const systemTypesData = [
    "AI System",
    "Data Interface",
    "SaaS Platform",
    "Process Automation",
    "API Integration",
    "Legacy Modernization",
    "Other",
];

// From ContactSection.tsx - budgetRanges array
const budgetRangesData = [
    "$1,500 - $5,000",
    "$5,000 - $15,000",
    "$15,000 - $50,000",
    "$50,000+",
];

// Site configuration from ContactSection.tsx
const siteConfigData = [
    {
        key: "contact_email",
        value: { email: "hello@balaastra.tech" },
    },
    {
        key: "social_links",
        value: {
            linkedin: "https://linkedin.com",
            twitter: "https://twitter.com",
            github: "https://github.com",
        },
    },
    {
        key: "hero",
        value: {
            title: "Building Intelligent Systems",
            subtitle: "Full-stack development with AI integration",
        },
    },
    {
        key: "contact_info",
        value: {
            phone: "Available upon request",
            location: "Remote-first. Global clients.",
        },
    },
];

// From raw-front/ClientFitSection.tsx - compatible/incompatible criteria
const clientFitItemsData = [
    // Compatible items
    {
        type: 'compatible',
        text: 'Requirements are defined before engagement',
        displayOrder: 1,
        isPublished: true,
    },
    {
        type: 'compatible',
        text: 'Budget allocation starts at $1,500+',
        displayOrder: 2,
        isPublished: true,
    },
    {
        type: 'compatible',
        text: 'AI-powered systems, SaaS platforms, or automation tools required',
        displayOrder: 3,
        isPublished: true,
    },
    {
        type: 'compatible',
        text: 'Weekly progress visibility expected',
        displayOrder: 4,
        isPublished: true,
    },
    {
        type: 'compatible',
        text: 'Long-term technical partnership valued',
        displayOrder: 5,
        isPublished: true,
    },
    // Incompatible items
    {
        type: 'incompatible',
        text: 'Template customization or quick fixes required',
        displayOrder: 1,
        isPublished: true,
    },
    {
        type: 'incompatible',
        text: 'Budget below $1,500 for entire project',
        displayOrder: 2,
        isPublished: true,
    },
    {
        type: 'incompatible',
        text: 'Lowest price is the priority metric',
        displayOrder: 3,
        isPublished: true,
    },
    {
        type: 'incompatible',
        text: 'Mobile-native iOS/Android development needed',
        displayOrder: 4,
        isPublished: true,
    },
    {
        type: 'incompatible',
        text: 'Requirements undefined at engagement',
        displayOrder: 5,
        isPublished: true,
    },
];

// From raw-front/ProcessSection.tsx - execution phases
const processStepsData = [
    {
        title: 'Discovery',
        description: 'Requirements captured. Alignment verified.',
        iconName: 'Phone',
        duration: '30 min',
        displayOrder: 1,
        isPublished: true,
    },
    {
        title: 'Proposal',
        description: 'Scope defined. Timeline established. Pricing transparent.',
        iconName: 'FileText',
        duration: '2-3 days',
        displayOrder: 2,
        isPublished: true,
    },
    {
        title: 'Execution',
        description: 'Agile development. Weekly demonstrations. Real-time visibility.',
        iconName: 'Code',
        duration: 'Weekly cycles',
        displayOrder: 3,
        isPublished: true,
    },
    {
        title: 'Deployment',
        description: 'System launched. Support included. Transition complete.',
        iconName: 'Rocket',
        duration: '30 days support',
        displayOrder: 4,
        isPublished: true,
    },
];

// From raw-front/AboutSection.tsx - entity profile
const aboutItemsData = [
    {
        title: 'Directive',
        description: 'Bridge ambitious objectives with technical execution. Deliver systems where business outcomes are measurable.',
        displayOrder: 1,
        isPublished: true,
    },
    {
        title: 'Method',
        description: 'Problems understood before solutions proposed. Business context, user requirements, success metrics—defined first. Simplest viable solution deployed. Iteration based on evidence.',
        displayOrder: 2,
        isPublished: true,
    },
    {
        title: 'Transparency',
        description: 'Full visibility. Weekly demonstrations. Clear timelines. Challenges communicated immediately. Under-promise. Over-deliver.',
        displayOrder: 3,
        isPublished: true,
    },
];

// ============================================================================
// SEED FUNCTION
// ============================================================================
async function seed() {
    console.log('🌱 Starting database seeding...\n');

    try {
        // Clear existing data (in reverse order of dependencies)
        console.log('🧹 Clearing existing data...');
        await db.delete(formOptions);
        await db.delete(siteConfiguration);
        await db.delete(trustSignals);
        await db.delete(techStackLayers);
        await db.delete(additionalCapabilities);
        await db.delete(services);
        await db.delete(projects);
        await db.delete(clientFitItems);
        await db.delete(processSteps);
        await db.delete(aboutItems);
        console.log('   ✓ Existing data cleared\n');

        // Seed Projects
        console.log('📦 Seeding projects...');
        await db.insert(projects).values(projectsData);
        console.log(`   ✓ Inserted ${projectsData.length} projects`);

        // Seed Services
        console.log('🔧 Seeding services...');
        await db.insert(services).values(servicesData);
        console.log(`   ✓ Inserted ${servicesData.length} services`);

        // Seed Additional Capabilities
        console.log('➕ Seeding additional capabilities...');
        await db.insert(additionalCapabilities).values(additionalCapabilitiesData);
        console.log(`   ✓ Inserted ${additionalCapabilitiesData.length} additional capabilities`);

        // Seed Tech Stack Layers
        console.log('🏗️ Seeding tech stack layers...');
        await db.insert(techStackLayers).values(techStackLayersData);
        console.log(`   ✓ Inserted ${techStackLayersData.length} tech stack layers`);

        // Seed Trust Signals
        console.log('🛡️ Seeding trust signals...');
        await db.insert(trustSignals).values(trustSignalsData);
        console.log(`   ✓ Inserted ${trustSignalsData.length} trust signals`);

        // Seed Site Configuration
        console.log('⚙️ Seeding site configuration...');
        await db.insert(siteConfiguration).values(siteConfigData);
        console.log(`   ✓ Inserted ${siteConfigData.length} configuration entries`);

        // Seed Form Options - System Types
        console.log('📝 Seeding form options...');
        const systemTypeOptions = systemTypesData.map((value, index) => ({
            optionType: 'system_type',
            optionValue: value,
            displayOrder: index + 1,
        }));
        await db.insert(formOptions).values(systemTypeOptions);
        console.log(`   ✓ Inserted ${systemTypeOptions.length} system types`);

        // Seed Form Options - Budget Ranges
        const budgetRangeOptions = budgetRangesData.map((value, index) => ({
            optionType: 'budget_range',
            optionValue: value,
            displayOrder: index + 1,
        }));
        await db.insert(formOptions).values(budgetRangeOptions);
        console.log(`   ✓ Inserted ${budgetRangeOptions.length} budget ranges`);

        // Seed Client Fit Items
        console.log('🎯 Seeding client fit items...');
        await db.insert(clientFitItems).values(clientFitItemsData);
        console.log(`   ✓ Inserted ${clientFitItemsData.length} client fit items`);

        // Seed Process Steps
        console.log('📋 Seeding process steps...');
        await db.insert(processSteps).values(processStepsData);
        console.log(`   ✓ Inserted ${processStepsData.length} process steps`);

        // Seed About Items
        console.log('ℹ️ Seeding about items...');
        await db.insert(aboutItems).values(aboutItemsData);
        console.log(`   ✓ Inserted ${aboutItemsData.length} about items`);

        // Seed Admin User
        console.log('👤 Seeding admin user...');
        await db.delete(adminUsers); // Clear existing admin users

        const adminPassword = 'Admin123!';
        const passwordHash = await hashPassword(adminPassword);
        const verificationCode = generateVerificationCode();
        const verifyExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await db.insert(adminUsers).values({
            email: 'admin@balaastra.tech',
            passwordHash: passwordHash,
            name: 'Super Admin',
            role: 'super_admin',
            status: 'active', // IMPORTANT: Set to active so user can login immediately
            permissions: SUPER_ADMIN_PERMISSIONS, // Full permissions for super admin
            isEmailVerified: true, // Pre-verified for initial setup
            emailVerifyToken: verificationCode,
            emailVerifyExpires: verifyExpires,
        });
        console.log('   ✓ Created admin user: admin@balaastra.tech');
        console.log(`   ✓ Password: ${adminPassword}`);
        console.log('   ✓ Status: ACTIVE (ready to login)');
        console.log('   ✓ Permissions: SUPER_ADMIN (full access)');
        console.log('   ⚠️  IMPORTANT: Change this password after first login!');

        console.log('\n✅ Database seeding completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`   • Projects: ${projectsData.length}`);
        console.log(`   • Services: ${servicesData.length}`);
        console.log(`   • Additional Capabilities: ${additionalCapabilitiesData.length}`);
        console.log(`   • Tech Stack Layers: ${techStackLayersData.length}`);
        console.log(`   • Trust Signals: ${trustSignalsData.length}`);
        console.log(`   • Site Config Entries: ${siteConfigData.length}`);
        console.log(`   • Form Options: ${systemTypeOptions.length + budgetRangeOptions.length}`);
        console.log(`   • Client Fit Items: ${clientFitItemsData.length}`);
        console.log(`   • Process Steps: ${processStepsData.length}`);
        console.log(`   • About Items: ${aboutItemsData.length}`);
        console.log(`   • Admin Users: 1 (Super Admin - ACTIVE)`);

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

seed();
