/**
 * Seed script: initial admin user + homepage sections for Mohammad Ghanayem's website.
 * Run once: pnpm --filter @workspace/scripts run seed
 */
import bcryptjs from "bcryptjs";
import { db, usersTable, pagesTable, sectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function main() {
  console.log("🌱 Starting seed...");

  // ── Admin user ─────────────────────────────────────────────────────────
  const existing = await db.select().from(usersTable);
  if (existing.length === 0) {
    const hash = await bcryptjs.hash("admin", 12);
    await db.insert(usersTable).values({ username: "Admin", passwordHash: hash });
    console.log("✅ Created admin user (username: Admin, password: admin)");
  } else {
    console.log("⏭  Admin user already exists, skipping");
  }

  // ── Homepage page ──────────────────────────────────────────────────────
  const existingHomepage = await db.select().from(pagesTable).where(eq(pagesTable.isHomepage, true));

  // ── Default OG image (idempotent — only set if not already configured) ──
  if (existingHomepage.length > 0) {
    const hp = existingHomepage[0]!;
    if (!hp.seoImageUrl) {
      await db
        .update(pagesTable)
        .set({ seoImageUrl: "/api/uploads/og-default.jpg" })
        .where(eq(pagesTable.id, hp.id));
      console.log("✅ Set default OG image on homepage");
    } else {
      console.log("⏭  Homepage OG image already set, skipping");
    }
    console.log("⏭  Homepage already seeded, skipping sections");
    process.exit(0);
  }

  const [homepage] = await db
    .insert(pagesTable)
    .values({
      titleAr: "الصفحة الرئيسية",
      titleEn: "Home",
      slug: "home",
      isPublished: true,
      showInNav: false,
      isHomepage: true,
      seoImageUrl: "/api/uploads/og-default.jpg",
    })
    .returning();

  console.log(`✅ Created homepage (id: ${homepage!.id})`);

  // ── Sections ────────────────────────────────────────────────────────────
  const sections = [
    // 1. Hero
    {
      type: "hero",
      sortOrder: 0,
      data: {
        titleAr: "محمد غنايم",
        titleEn: "Mohammad Ghanayem",
        subtitleAr: "مدير مشاريع تقني | مدير عقود",
        subtitleEn: "Technical Project Manager | Contract Manager",
        contentAr:
          "أكثر من 13 عامًا في تنفيذ مشاريع معقدة في قطاعات النفط والغاز، والبنية التحتية لتقنية المعلومات والاتصالات، والأنظمة الأمنية، والاتصالات.",
        contentEn:
          "13+ years delivering complex projects across Oil & Gas, ICT infrastructure, security systems, and telecommunications.",
        locationAr: "الخبر، المنطقة الشرقية، المملكة العربية السعودية",
        locationEn: "Al Khobar, Eastern Province, Saudi Arabia",
        cta1Ar: "الخبرات",
        cta1En: "View Experience",
        cta2Ar: "تواصل معي",
        cta2En: "Contact Me",
      },
    },
    // 2. About
    {
      type: "text",
      sortOrder: 1,
      data: {
        titleAr: "نبذة عني",
        titleEn: "About",
        contentAr:
          "أكثر من 13 عامًا من الخبرة المهنية عبر المملكة العربية السعودية والعراق والأردن، تشمل مسيرتي المهنية شركة نيزك العالمية للأنظمة الهندسية وهواوي وموتورولا سوليوشنز. أجمع بين التنفيذ التقني للمشاريع والإدارة التجارية وإدارة العقود في دور واحد متكامل. حاصل على شهادتي PMP وPMO-CP، وأحمل ماجستيرًا في ريادة الأعمال وبكالوريوس في هندسة الاتصالات من جامعة الأميرة سمية للتكنولوجيا في الأردن.",
        contentEn:
          "Over 13 years of professional experience across Saudi Arabia, Iraq, and Jordan. My career spans Naizak Global Engineering Systems, Huawei Technologies, and Motorola Solutions. I combine technical project delivery with commercial and contract management in a single integrated role. PMP and PMO-CP certified, with a Master's in Business Entrepreneurship and a Bachelor's in Telecommunications Engineering, both from Princess Sumaya University for Technology, Jordan.",
      },
    },
    // 3. Experience timeline
    {
      type: "timeline",
      sortOrder: 2,
      data: {
        titleAr: "الخبرات العملية",
        titleEn: "Experience",
        items: [
          {
            id: "exp-1",
            titleAr: "مدير عقود — شركة نيزك العالمية للأنظمة الهندسية، الخبر",
            titleEn: "Contract Manager — Naizak Global Engineering Systems, Al Khobar",
            subheadingAr: "نيزك العالمية للأنظمة الهندسية",
            subheadingEn: "Naizak Global Engineering Systems",
            date: "[DATES PLACEHOLDER]",
            bullets: [
              {
                id: "b1",
                textAr: "مدير عقود في مشروع صيانة الإمارة، بعد ترقية من منصب مدير مشاريع تقني",
                textEn: "Contract Manager on the Emarah Maintenance Project, promoted from Technical Project Manager",
              },
              {
                id: "b2",
                textAr: "إدارة العقود والإشراف التجاري وإدارة الموردين لمحفظة مشاريع بقيمة ملايين الريالات",
                textEn: "Contract administration, commercial oversight, and vendor management for a multi-million SAR portfolio",
              },
            ],
          },
          {
            id: "exp-2",
            titleAr: "مدير مشاريع تقني — نيزك العالمية للأنظمة الهندسية",
            titleEn: "Technical Project Manager — Naizak Global Engineering Systems",
            subheadingAr: "نيزك العالمية للأنظمة الهندسية",
            subheadingEn: "Naizak Global Engineering Systems",
            date: "[DATES PLACEHOLDER]",
            bullets: [
              {
                id: "b3",
                textAr: "إدارة 10 مشاريع متزامنة مع فريق من 17 شخصًا",
                textEn: "Managed 10 concurrent projects with a 17-person team",
              },
              {
                id: "b4",
                textAr: "تقليص مدة إعداد العروض بنسبة 60%",
                textEn: "Reduced proposal development time by 60%",
              },
              {
                id: "b5",
                textAr: "تحسين كفاءة الموارد بنسبة تتراوح بين 50% و85%",
                textEn: "Improved resource efficiency by 50-85%",
              },
              {
                id: "b6",
                textAr: "الالتزام بالميزانية ضمن ±3% وتحقيق رضا العملاء بدرجة 9 من 10",
                textEn: "Maintained ±3% budget adherence and 9/10 client satisfaction",
              },
            ],
          },
          {
            id: "exp-3",
            titleAr: "هواوي — العراق (أربيل) والأردن",
            titleEn: "Huawei Technologies — Iraq (Erbil) and Jordan",
            subheadingAr: "هواوي تكنولوجيز",
            subheadingEn: "Huawei Technologies",
            date: "[DATES PLACEHOLDER]",
            bullets: [
              {
                id: "b7",
                textAr: "أدوار في تنفيذ مشاريع الاتصالات والبنية التحتية لتقنية المعلومات",
                textEn: "Project delivery roles in telecommunications and ICT infrastructure",
              },
              {
                id: "b8",
                textAr: "[DETAILS PLACEHOLDER — سيتم الإضافة لاحقًا]",
                textEn: "[DETAILS PLACEHOLDER — content to be added]",
              },
            ],
          },
          {
            id: "exp-4",
            titleAr: "موتورولا سوليوشنز — الأردن",
            titleEn: "Motorola Solutions — Jordan",
            subheadingAr: "موتورولا سوليوشنز",
            subheadingEn: "Motorola Solutions",
            date: "[DATES PLACEHOLDER]",
            bullets: [
              {
                id: "b9",
                textAr: "أدوار في مشاريع الاتصالات وأنظمة الاتصالات الحيوية",
                textEn: "Project roles in telecommunications and mission-critical communication systems",
              },
              {
                id: "b10",
                textAr: "[DETAILS PLACEHOLDER — سيتم الإضافة لاحقًا]",
                textEn: "[DETAILS PLACEHOLDER — content to be added]",
              },
            ],
          },
        ],
      },
    },
    // 4. Skills
    {
      type: "cards_grid",
      sortOrder: 3,
      data: {
        titleAr: "المهارات",
        titleEn: "Skills",
        items: [
          { id: "s1", titleAr: "إدارة العقود والإدارة التجارية", titleEn: "Contract administration and commercial management", icon: "FileText" },
          { id: "s2", titleAr: "إدارة المشاريع ومحافظ المشاريع", titleEn: "Project and portfolio management", icon: "Briefcase" },
          { id: "s3", titleAr: "قيادة مكاتب إدارة المشاريع (PMO) والحوكمة", titleEn: "PMO leadership and governance", icon: "Building2" },
          { id: "s4", titleAr: "إعداد العطاءات والعروض التجارية", titleEn: "Commercial tendering and proposal development", icon: "ClipboardList" },
          { id: "s5", titleAr: "إدارة الموردين والمشتريات", titleEn: "Vendor and procurement management", icon: "Users" },
          { id: "s6", titleAr: "الإشراف المالي وضبط الميزانية", titleEn: "Financial oversight and budget control", icon: "BarChart2" },
          { id: "s7", titleAr: "إدارة العلاقات مع أصحاب المصلحة والعملاء", titleEn: "Stakeholder and client relationship management", icon: "Handshake" },
          { id: "s8", titleAr: "تنفيذ مشاريع في قطاعات النفط والغاز والبنية التحتية لتقنية المعلومات والأنظمة الأمنية والاتصالات", titleEn: "Cross-industry delivery: Oil & Gas, ICT infrastructure, security systems, telecommunications", icon: "Globe" },
        ],
      },
    },
    // 5. Strengths
    {
      type: "cards_grid",
      sortOrder: 4,
      data: {
        titleAr: "نقاط القوة",
        titleEn: "Strengths",
        items: [
          { id: "str1", titleAr: "الجمع بين المنظورين التقني والتجاري في دور واحد", titleEn: "Dual technical and commercial perspective in one role", icon: "Layers" },
          { id: "str2", titleAr: "قيادة مشاريع متعددة ضمن ميزانيات وجداول زمنية دقيقة", titleEn: "Multi-project leadership under tight budgets and timelines", icon: "Target" },
          { id: "str3", titleAr: "منهجية تنفيذ منظمة قائمة على الحوكمة", titleEn: "Structured, governance-driven approach to delivery", icon: "Shield" },
          { id: "str4", titleAr: "خبرة إقليمية في السعودية والعراق والأردن", titleEn: "Regional experience across Saudi Arabia, Iraq, and Jordan", icon: "Map" },
          { id: "str5", titleAr: "إجادة اللغتين العربية والإنجليزية", titleEn: "Bilingual: Arabic and English", icon: "MessageSquare" },
        ],
      },
    },
    // 6. Services
    {
      type: "cards_grid",
      sortOrder: 5,
      data: {
        titleAr: "الخدمات",
        titleEn: "Services",
        items: [
          {
            id: "svc1",
            titleAr: "إدارة العقود",
            titleEn: "Contract Management",
            descriptionAr: "إدارة العقود ودعم التفاوض والإشراف التجاري طوال دورة حياة العقد",
            descriptionEn: "Administration, negotiation support, and commercial oversight across the contract lifecycle",
            icon: "FileText",
          },
          {
            id: "svc2",
            titleAr: "إدارة المشاريع والمحافظ",
            titleEn: "Project and Portfolio Management",
            descriptionAr: "تخطيط وتنفيذ ومتابعة مشاريع معقدة متزامنة",
            descriptionEn: "Planning, execution, and control of concurrent complex projects",
            icon: "Briefcase",
          },
          {
            id: "svc3",
            titleAr: "تأسيس وحوكمة مكاتب إدارة المشاريع",
            titleEn: "PMO Setup and Governance",
            descriptionAr: "بناء الهياكل والتقارير ومعايير التنفيذ",
            descriptionEn: "Establishing structures, reporting, and delivery standards",
            icon: "Building2",
          },
          {
            id: "svc4",
            titleAr: "العطاءات والعروض",
            titleEn: "Tendering and Proposals",
            descriptionAr: "إعداد العروض التجارية وإدارة المناقصات",
            descriptionEn: "Commercial proposal development and bid management",
            icon: "ClipboardList",
          },
          {
            id: "svc5",
            titleAr: "إدارة الموردين والمشتريات",
            titleEn: "Vendor and Procurement Management",
            descriptionAr: "اختيار الموردين ومتابعة الأداء وضبط التكاليف",
            descriptionEn: "Supplier selection, performance, and cost control",
            icon: "Users",
          },
          {
            id: "svc6",
            titleAr: "الإشراف المالي",
            titleEn: "Financial Oversight",
            descriptionAr: "إعداد الميزانيات وتتبع التكاليف وحماية الهوامش",
            descriptionEn: "Budgeting, cost tracking, and margin protection",
            icon: "BarChart2",
          },
        ],
      },
    },
    // 7. Certifications & Education
    {
      type: "cards_grid",
      sortOrder: 6,
      data: {
        titleAr: "الشهادات والتعليم",
        titleEn: "Certifications & Education",
        items: [
          {
            id: "cert1",
            titleAr: "شهادة PMP في إدارة المشاريع من معهد PMI",
            titleEn: "PMP (Project Management Professional), PMI",
            icon: "Award",
          },
          {
            id: "cert2",
            titleAr: "شهادة PMO-CP",
            titleEn: "PMO-CP (PMO Certified Practitioner)",
            icon: "Award",
          },
          {
            id: "cert3",
            titleAr: "ماجستير في ريادة الأعمال، جامعة الأميرة سمية للتكنولوجيا، الأردن",
            titleEn: "Master's in Business Entrepreneurship, Princess Sumaya University for Technology, Jordan",
            icon: "GraduationCap",
          },
          {
            id: "cert4",
            titleAr: "بكالوريوس في هندسة الاتصالات، جامعة الأميرة سمية للتكنولوجيا، الأردن",
            titleEn: "Bachelor's in Telecommunications Engineering, Princess Sumaya University for Technology, Jordan",
            icon: "GraduationCap",
          },
        ],
      },
    },
    // 8. Contact strip
    {
      type: "contact_strip",
      sortOrder: 7,
      data: {
        titleAr: "تواصل معي",
        titleEn: "Contact",
        email: "mghanayem80@gmail.com",
        linkedin: "https://linkedin.com/in/mohammad-ghanayem",
        locationAr: "الخبر - الدمام، المنطقة الشرقية، المملكة العربية السعودية",
        locationEn: "Al Khobar / Dammam, Eastern Province, Saudi Arabia",
      },
    },
  ];

  for (const section of sections) {
    await db.insert(sectionsTable).values({
      pageId: homepage!.id,
      type: section.type,
      sortOrder: section.sortOrder,
      isVisible: true,
      data: section.data,
    });
  }

  console.log(`✅ Created ${sections.length} homepage sections`);
  console.log("🎉 Seed complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
