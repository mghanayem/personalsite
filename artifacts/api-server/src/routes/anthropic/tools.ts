import { db, pagesTable, sectionsTable, postsTable, settingsTable, imagesTable } from "@workspace/db";
import { eq, asc, desc } from "drizzle-orm";

/** Minimal typing for Anthropic tool definitions (mirrors the SDK's Tool type). */
interface AnthropicTool {
  name: string;
  description?: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Tool definitions for Claude — covers the full admin CMS surface plus
 * read-only data tools for SEO/AEO audit and site review.
 */
export const CMS_TOOLS: AnthropicTool[] = [
  // ── Pages ────────────────────────────────────────────────────────────────
  {
    name: "list_pages",
    description: "List all CMS pages with their titles, slugs, and publish status.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "create_page",
    description: "Create a new CMS page.",
    input_schema: {
      type: "object" as const,
      properties: {
        titleEn: { type: "string", description: "Page title in English" },
        titleAr: { type: "string", description: "Page title in Arabic" },
        slug: { type: "string", description: "URL slug (lowercase, hyphens only)" },
        isPublished: { type: "boolean" },
        showInNav: { type: "boolean" },
      },
      required: ["titleEn", "titleAr", "slug"],
    },
  },
  {
    name: "update_page",
    description: "Update a page's metadata (title, slug, publish state, SEO fields).",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "number" },
        titleEn: { type: "string" },
        titleAr: { type: "string" },
        slug: { type: "string" },
        isPublished: { type: "boolean" },
        showInNav: { type: "boolean" },
        seoTitleEn: { type: "string" },
        seoTitleAr: { type: "string" },
        seoDescEn: { type: "string" },
        seoDescAr: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_page",
    description: "Delete a page (non-homepage only). Always confirm with the user before calling.",
    input_schema: {
      type: "object" as const,
      properties: { id: { type: "number" } },
      required: ["id"],
    },
  },
  // ── Sections ─────────────────────────────────────────────────────────────
  {
    name: "list_sections",
    description: "List all sections for a given page ID.",
    input_schema: {
      type: "object" as const,
      properties: { pageId: { type: "number" } },
      required: ["pageId"],
    },
  },
  {
    name: "add_section",
    description: "Add a new section to a page. Type must be one of: hero, text, text_with_image, image_gallery, cards_grid, timeline, contact_strip.",
    input_schema: {
      type: "object" as const,
      properties: {
        pageId: { type: "number" },
        type: { type: "string", enum: ["hero", "text", "text_with_image", "image_gallery", "cards_grid", "timeline", "contact_strip"] },
        titleEn: { type: "string" },
        titleAr: { type: "string" },
        contentEn: { type: "string" },
        contentAr: { type: "string" },
      },
      required: ["pageId", "type"],
    },
  },
  {
    name: "update_section",
    description: "Update a section's content data. Pass only the fields you want to change.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "number" },
        titleEn: { type: "string" },
        titleAr: { type: "string" },
        contentEn: { type: "string" },
        contentAr: { type: "string" },
        locationEn: { type: "string" },
        locationAr: { type: "string" },
        email: { type: "string" },
        linkedin: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "update_section_item",
    description: "Update a single item inside a multi-item section (cards_grid, timeline, image_gallery) by its itemId. Pass only the fields you want to change. Use list_sections first to discover sectionId and the itemId values inside data.items[].",
    input_schema: {
      type: "object" as const,
      properties: {
        sectionId: { type: "number", description: "ID of the parent section" },
        itemId: { type: "string", description: "Stable id of the item within data.items[]" },
        titleEn: { type: "string" },
        titleAr: { type: "string" },
        descriptionEn: { type: "string" },
        descriptionAr: { type: "string" },
        subheadingEn: { type: "string" },
        subheadingAr: { type: "string" },
        icon: { type: "string", description: "Lucide icon name, e.g. Briefcase" },
        date: { type: "string", description: "Date label for timeline entries" },
        bullets: {
          type: "array",
          description: "Bullet points for timeline entries",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              textEn: { type: "string" },
              textAr: { type: "string" },
            },
          },
        },
      },
      required: ["sectionId", "itemId"],
    },
  },
  {
    name: "delete_section",
    description: "Delete a section. Always confirm with the user before calling.",
    input_schema: {
      type: "object" as const,
      properties: { id: { type: "number" } },
      required: ["id"],
    },
  },
  // ── Blog ─────────────────────────────────────────────────────────────────
  {
    name: "list_blog_posts",
    description: "List all blog posts with their IDs, titles, slugs, and publish status.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "create_blog_post",
    description: "Create a new blog post draft.",
    input_schema: {
      type: "object" as const,
      properties: {
        titleEn: { type: "string" },
        titleAr: { type: "string" },
        slugEn: { type: "string" },
        slugAr: { type: "string" },
        excerptEn: { type: "string" },
        excerptAr: { type: "string" },
        contentEn: { type: "string" },
        contentAr: { type: "string" },
        isPublished: { type: "boolean" },
      },
      required: ["titleEn", "titleAr", "slugEn", "slugAr"],
    },
  },
  {
    name: "update_blog_post",
    description: "Update a blog post's content or metadata.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "number" },
        titleEn: { type: "string" },
        titleAr: { type: "string" },
        slugEn: { type: "string" },
        slugAr: { type: "string" },
        excerptEn: { type: "string" },
        excerptAr: { type: "string" },
        contentEn: { type: "string" },
        contentAr: { type: "string" },
        isPublished: { type: "boolean" },
      },
      required: ["id"],
    },
  },
  {
    name: "update_branding",
    description: "Update site branding settings (colors, default language, SEO structured data).",
    input_schema: {
      type: "object" as const,
      properties: {
        primaryColor: { type: "string", description: "Hex color e.g. #0e1a2a" },
        accentColor: { type: "string" },
        defaultLanguage: { type: "string", enum: ["ar", "en"] },
        seoPersonJobTitle: { type: "string" },
        seoWebsiteUrl: { type: "string" },
        seoLinkedinUrl: { type: "string" },
      },
      required: [],
    },
  },
  // ── Read-only data tools for audit/review ─────────────────────────────────
  {
    name: "get_all_pages_with_sections",
    description: "Return all pages and their sections with full content — used for site review and SEO audit.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_all_blog_posts",
    description: "Return all blog posts with titles, excerpts, and content — used for site review.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_branding_settings",
    description: "Return current site branding and SEO structured data settings.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
];

type ToolResult = { success: boolean; data?: unknown; error?: string };

/** Execute a tool call and return its result. */
export async function executeTool(name: string, input: Record<string, unknown>): Promise<ToolResult> {
  try {
    switch (name) {
      case "list_pages": {
        const pages = await db.select().from(pagesTable).orderBy(asc(pagesTable.id));
        return { success: true, data: pages.map(p => ({ id: p.id, titleEn: p.titleEn, titleAr: p.titleAr, slug: p.slug, isPublished: p.isPublished, isHomepage: p.isHomepage })) };
      }
      case "create_page": {
        const { titleEn, titleAr, slug, isPublished = false, showInNav = true } = input as Record<string, string | boolean>;
        const [page] = await db.insert(pagesTable).values({ titleEn: titleEn as string, titleAr: titleAr as string, slug: slug as string, isPublished: isPublished as boolean, showInNav: showInNav as boolean }).returning();
        return { success: true, data: { id: page!.id, titleEn: page!.titleEn, slug: page!.slug } };
      }
      case "update_page": {
        const { id, ...updates } = input as Record<string, unknown>;
        const [page] = await db.update(pagesTable).set(updates).where(eq(pagesTable.id, id as number)).returning();
        if (!page) return { success: false, error: "Page not found" };
        return { success: true, data: { id: page.id, titleEn: page.titleEn, slug: page.slug } };
      }
      case "delete_page": {
        const [page] = await db.select().from(pagesTable).where(eq(pagesTable.id, input.id as number));
        if (!page) return { success: false, error: "Page not found" };
        if (page.isHomepage) return { success: false, error: "Cannot delete the homepage" };
        await db.delete(pagesTable).where(eq(pagesTable.id, input.id as number));
        return { success: true, data: { deleted: true, id: input.id } };
      }
      case "list_sections": {
        const sections = await db.select().from(sectionsTable).where(eq(sectionsTable.pageId, input.pageId as number)).orderBy(asc(sectionsTable.sortOrder));
        return { success: true, data: sections.map(s => ({ id: s.id, type: s.type, sortOrder: s.sortOrder, isVisible: s.isVisible, data: s.data })) };
      }
      case "add_section": {
        const { pageId, type, titleEn, titleAr, contentEn, contentAr } = input as Record<string, unknown>;
        const existing = await db.select().from(sectionsTable).where(eq(sectionsTable.pageId, pageId as number));
        const maxOrder = existing.length > 0 ? Math.max(...existing.map(s => s.sortOrder)) : -1;
        const data: Record<string, unknown> = {};
        if (titleEn) data.titleEn = titleEn;
        if (titleAr) data.titleAr = titleAr;
        if (contentEn) data.contentEn = contentEn;
        if (contentAr) data.contentAr = contentAr;
        const [section] = await db.insert(sectionsTable).values({ pageId: pageId as number, type: type as string, sortOrder: maxOrder + 1, data }).returning();
        return { success: true, data: { id: section!.id, type: section!.type, pageId: section!.pageId } };
      }
      case "update_section": {
        const { id, ...rest } = input as Record<string, unknown>;
        const [current] = await db.select().from(sectionsTable).where(eq(sectionsTable.id, id as number));
        if (!current) return { success: false, error: "Section not found" };
        const merged = { ...(current.data as Record<string, unknown> || {}), ...rest };
        const [section] = await db.update(sectionsTable).set({ data: merged }).where(eq(sectionsTable.id, id as number)).returning();
        return { success: true, data: { id: section!.id, type: section!.type } };
      }
      case "update_section_item": {
        const { sectionId, itemId, ...fields } = input as Record<string, unknown>;
        const [current] = await db.select().from(sectionsTable).where(eq(sectionsTable.id, sectionId as number));
        if (!current) return { success: false, error: "Section not found" };
        const data = (current.data as Record<string, unknown>) ?? {};
        const items = Array.isArray(data.items) ? [...(data.items as Record<string, unknown>[])] : [];
        const idx = items.findIndex(item => item.id === itemId);
        if (idx === -1) return { success: false, error: `Item '${itemId as string}' not found in section ${sectionId as number}` };
        items[idx] = { ...items[idx], ...fields };
        const updatedData = { ...data, items };
        const [updated] = await db.update(sectionsTable).set({ data: updatedData }).where(eq(sectionsTable.id, sectionId as number)).returning();
        return { success: true, data: { sectionId: updated!.id, itemId, type: updated!.type } };
      }
      case "delete_section": {
        const [section] = await db.select().from(sectionsTable).where(eq(sectionsTable.id, input.id as number));
        if (!section) return { success: false, error: "Section not found" };
        await db.delete(sectionsTable).where(eq(sectionsTable.id, input.id as number));
        return { success: true, data: { deleted: true, id: input.id } };
      }
      case "list_blog_posts": {
        const posts = await db.select().from(postsTable).orderBy(desc(postsTable.createdAt));
        return { success: true, data: posts.map(p => ({ id: p.id, titleEn: p.titleEn, titleAr: p.titleAr, slugEn: p.slugEn, isPublished: p.isPublished })) };
      }
      case "create_blog_post": {
        const { titleEn, titleAr, slugEn, slugAr, excerptEn = "", excerptAr = "", contentEn = "", contentAr = "", isPublished = false } = input as Record<string, unknown>;
        const [post] = await db.insert(postsTable).values({ titleEn: titleEn as string, titleAr: titleAr as string, slugEn: slugEn as string, slugAr: slugAr as string, excerptEn: excerptEn as string, excerptAr: excerptAr as string, contentEn: contentEn as string, contentAr: contentAr as string, isPublished: isPublished as boolean }).returning();
        return { success: true, data: { id: post!.id, titleEn: post!.titleEn } };
      }
      case "update_blog_post": {
        const { id, ...updates } = input as Record<string, unknown>;
        const [post] = await db.update(postsTable).set(updates).where(eq(postsTable.id, id as number)).returning();
        if (!post) return { success: false, error: "Post not found" };
        return { success: true, data: { id: post.id, titleEn: post.titleEn } };
      }
      case "update_branding": {
        await db.select().from(settingsTable); // ensure row exists
        const [s] = await db.update(settingsTable).set(input).returning();
        return { success: true, data: { updated: true, primaryColor: s!.primaryColor, defaultLanguage: s!.defaultLanguage } };
      }
      case "get_all_pages_with_sections": {
        const pages = await db.select().from(pagesTable).orderBy(asc(pagesTable.id));
        const sections = await db.select().from(sectionsTable).orderBy(asc(sectionsTable.sortOrder));
        const images = await db.select().from(imagesTable);
        const result = pages.map(p => ({
          ...p,
          sections: sections.filter(s => s.pageId === p.id).map(s => ({
            ...s,
            images: images.filter(i => i.sectionId === s.id),
          })),
        }));
        return { success: true, data: result };
      }
      case "get_all_blog_posts": {
        const posts = await db.select().from(postsTable).orderBy(desc(postsTable.createdAt));
        return { success: true, data: posts };
      }
      case "get_branding_settings": {
        const rows = await db.select().from(settingsTable);
        const s = rows[0];
        if (!s) return { success: true, data: {} };
        // Never expose the API key
        return { success: true, data: { primaryColor: s.primaryColor, accentColor: s.accentColor, defaultLanguage: s.defaultLanguage, seoPersonJobTitle: s.seoPersonJobTitle, seoWebsiteUrl: s.seoWebsiteUrl, seoLinkedinUrl: s.seoLinkedinUrl, seoTwitterUrl: s.seoTwitterUrl, seoGithubUrl: s.seoGithubUrl } };
      }
      default:
        return { success: false, error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
