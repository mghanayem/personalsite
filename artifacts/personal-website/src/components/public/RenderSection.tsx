import DOMPurify from "dompurify";
import { useLanguage } from "@/lib/i18n";
import { SectionWithImages, useSubmitContactForm } from "@workspace/api-client-react";
import { MapPin, Mail, Linkedin, ArrowRight, ArrowLeft, Send, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

interface ContactFormValues {
  name: string;
  email: string;
  message: string;
  /** Honeypot — hidden from real users; bots fill it and get silently rejected. */
  website?: string;
}

/** Sanitize HTML before dangerouslySetInnerHTML — defense-in-depth. */
function safeHtml(html: string | undefined): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "u", "p", "br", "ul", "ol", "li",
      "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "code", "pre", "span", "a"],
    ALLOWED_ATTR: ["href", "title", "target"],
  });
}

export function RenderSection({ section }: { section: SectionWithImages }) {
  const { lang } = useLanguage();
  const d = section.data;

  const t = (ar?: string, en?: string) => lang === "ar" ? (ar || "") : (en || "");

  if (section.type === "hero") {
    const profilePhoto = section.images[0];
    const cta1Label = t(d.cta1Ar, d.cta1En) || (lang === "ar" ? "استعرض الخبرات" : "View Experience");
    const cta1Href  = d.cta1Url || "#experience";
    const cta2Label = t(d.cta2Ar, d.cta2En) || (lang === "ar" ? "تواصل معي" : "Contact Me");
    const cta2Href  = d.cta2Url || "#contact";

    return (
      <section className="relative overflow-hidden bg-primary text-primary-foreground py-24 md:py-32">
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className={`flex flex-col gap-12 ${profilePhoto ? "md:flex-row md:items-center" : ""}`}>
            {/* Text content */}
            <div className="flex-1 max-w-3xl">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                {t(d.titleAr, d.titleEn)}
              </h1>
              <p className="text-xl md:text-2xl text-primary-foreground/80 mb-8 font-medium leading-relaxed">
                {t(d.contentAr, d.contentEn)}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-primary-foreground/60 mb-10">
                {(d.locationAr || d.locationEn) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{t(d.locationAr, d.locationEn)}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-4">
                {/* Primary CTA — background + text driven by branding CSS vars */}
                <a
                  href={cta1Href}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-base font-semibold transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    backgroundColor: "var(--hero-cta1-bg, #5b91c8)",
                    color: "var(--hero-cta1-text, #ffffff)",
                  }}
                >
                  {cta1Label}
                  {lang === "ar" ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </a>

                {/* Secondary CTA — solid fill for guaranteed readability */}
                <a
                  href={cta2Href}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-base font-semibold transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    backgroundColor: "var(--hero-cta2-bg, #ffffff)",
                    color: "var(--hero-cta2-text, #0e1a2a)",
                  }}
                >
                  {cta2Label}
                </a>
              </div>
            </div>

            {/* Profile photo */}
            {profilePhoto && (
              <div className="flex-shrink-0 flex justify-center md:justify-end">
                <div className="w-52 h-52 md:w-64 md:h-64 rounded-full overflow-hidden border-4 border-primary-foreground/20 shadow-2xl">
                  <img
                    src={profilePhoto.url}
                    alt={t(profilePhoto.captionAr, profilePhoto.captionEn) || t(d.titleAr, d.titleEn)}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (section.type === "text") {
    return (
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          {(d.titleAr || d.titleEn) && (
            <h2 className="text-3xl font-bold mb-8 text-foreground">{t(d.titleAr, d.titleEn)}</h2>
          )}
          <div 
            className="prose prose-lg dark:prose-invert max-w-none text-muted-foreground prose-p:leading-relaxed"
            dangerouslySetInnerHTML={{ __html: safeHtml(t(d.contentAr, d.contentEn)) }}
          />
        </div>
      </section>
    );
  }

  if (section.type === "text_with_image") {
    const isImageLeft = d.imagePosition === "left";
    const image = section.images[0];
    
    return (
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4 md:px-8">
          <div className={`grid md:grid-cols-2 gap-12 items-center ${isImageLeft ? "md:flex-row-reverse" : ""}`}>
            <div className={`${isImageLeft ? "md:order-2" : "md:order-1"}`}>
              {(d.titleAr || d.titleEn) && (
                <h2 className="text-3xl font-bold mb-6 text-foreground">{t(d.titleAr, d.titleEn)}</h2>
              )}
              <div 
                className="prose prose-lg dark:prose-invert text-muted-foreground prose-p:leading-relaxed"
                dangerouslySetInnerHTML={{ __html: safeHtml(t(d.contentAr, d.contentEn)) }}
              />
            </div>
            {image && (
              <div className={`${isImageLeft ? "md:order-1" : "md:order-2"}`}>
                <figure>
                  <img src={image.url} alt={t(image.captionAr, image.captionEn)} className="rounded-xl shadow-lg w-full object-cover aspect-[4/3]" />
                  {(image.captionAr || image.captionEn) && (
                    <figcaption className="text-sm text-center text-muted-foreground mt-4">{t(image.captionAr, image.captionEn)}</figcaption>
                  )}
                </figure>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (section.type === "cards_grid") {
    return (
      <section id="experience" className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-8">
          {(d.titleAr || d.titleEn) && (
            <div className="max-w-3xl mb-12">
              <h2 className="text-3xl font-bold mb-4 text-foreground">{t(d.titleAr, d.titleEn)}</h2>
              {(d.contentAr || d.contentEn) && (
                <p className="text-lg text-muted-foreground">{t(d.contentAr, d.contentEn)}</p>
              )}
            </div>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {d.items?.map((item) => (
              <div key={item.id} className="bg-card border border-border rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow">
                {item.icon && (
                  <div className="w-12 h-12 rounded-lg bg-primary/5 text-primary flex items-center justify-center mb-6 text-xl">
                    <span className="opacity-70">{item.icon.charAt(0)}</span>
                  </div>
                )}
                <h3 className="text-xl font-bold mb-3">{t(item.titleAr, item.titleEn)}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t(item.descriptionAr, item.descriptionEn)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (section.type === "timeline") {
    return (
      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          {(d.titleAr || d.titleEn) && (
            <h2 className="text-3xl font-bold mb-12 text-center">{t(d.titleAr, d.titleEn)}</h2>
          )}
          <div className="space-y-12">
            {d.items?.map((item) => (
              <div key={item.id} className="relative pl-8 md:pl-0 rtl:pr-8 rtl:md:pr-0 rtl:md:pl-0">
                <div className="md:grid md:grid-cols-5 md:gap-8 items-start">
                  <div className="md:col-span-1 md:text-right rtl:md:text-left mb-2 md:mb-0 pt-1">
                    <span className="text-ring font-bold whitespace-nowrap">{item.date}</span>
                  </div>
                  <div className="md:col-span-4 relative pb-12 border-l-2 rtl:border-l-0 rtl:border-r-2 border-primary-foreground/20 pl-8 rtl:pr-8 rtl:pl-0">
                    <div className="absolute w-4 h-4 rounded-full bg-ring -left-[9px] rtl:-right-[9px] top-1.5 ring-4 ring-primary" />
                    <h3 className="text-2xl font-bold mb-1">{t(item.titleAr, item.titleEn)}</h3>
                    <h4 className="text-lg text-primary-foreground/70 mb-4">{t(item.subheadingAr, item.subheadingEn)}</h4>
                    <p className="text-primary-foreground/80 mb-6">{t(item.descriptionAr, item.descriptionEn)}</p>
                    
                    {item.bullets && item.bullets.length > 0 && (
                      <ul className="space-y-3">
                        {item.bullets.map((bullet) => (
                          <li key={bullet.id} className="flex items-start gap-3 text-primary-foreground/90">
                            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-ring/60 shrink-0" />
                            <span>{t(bullet.textAr, bullet.textEn)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (section.type === "image_gallery") {
    if (!section.images.length) return null;
    return (
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-8">
          {(d.titleAr || d.titleEn) && (
            <h2 className="text-3xl font-bold mb-10 text-foreground text-center">{t(d.titleAr, d.titleEn)}</h2>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {section.images.map((img) => (
              <figure key={img.id} className="group relative overflow-hidden rounded-xl aspect-square bg-muted">
                <img src={img.url} alt={t(img.captionAr, img.captionEn)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                {(img.captionAr || img.captionEn) && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <figcaption className="text-white text-sm font-medium">{t(img.captionAr, img.captionEn)}</figcaption>
                  </div>
                )}
              </figure>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (section.type === "contact_strip") {
    return <ContactStripSection d={d} lang={lang} t={t} />;
  }

  return null;
}

// ── Contact Strip with embedded form ─────────────────────────────────────────

interface ContactStripProps {
  d: SectionWithImages["data"];
  lang: string;
  t: (ar?: string, en?: string) => string;
}

function ContactStripSection({ d, lang, t }: ContactStripProps) {
  const [submitted, setSubmitted] = useState(false);
  const mutation = useSubmitContactForm();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContactFormValues>();

  const labels = {
    name:        lang === "ar" ? "الاسم"          : "Name",
    email:       lang === "ar" ? "البريد الإلكتروني" : "Email",
    message:     lang === "ar" ? "الرسالة"         : "Message",
    send:        lang === "ar" ? "إرسال الرسالة"    : "Send Message",
    sending:     lang === "ar" ? "جارٍ الإرسال…"   : "Sending…",
    successTitle:lang === "ar" ? "تم إرسال رسالتك!" : "Message sent!",
    successBody: lang === "ar" ? "شكراً لتواصلك. سأرد عليك في أقرب وقت." : "Thanks for reaching out. I'll get back to you soon.",
    sendAnother: lang === "ar" ? "إرسال رسالة أخرى" : "Send another",
    required:    lang === "ar" ? "هذا الحقل مطلوب" : "This field is required",
    invalidEmail:lang === "ar" ? "بريد إلكتروني غير صحيح" : "Invalid email address",
    tooLong:     (max: number) => lang === "ar" ? `الحد الأقصى ${max} حرفًا` : `Max ${max} characters`,
  };

  const onSubmit = async (values: ContactFormValues) => {
    await mutation.mutateAsync(
      { data: values },
      {
        onSuccess: () => {
          setSubmitted(true);
          reset();
        },
      },
    );
  };

  return (
    <section id="contact" className="py-16 md:py-24 bg-card border-t border-border">
      <div className="container mx-auto px-4 md:px-8 max-w-3xl">
        {/* Header */}
        <div className="mb-10 text-center">
          {(d.titleAr || d.titleEn) && (
            <h2 className="text-3xl font-bold text-foreground mb-3">
              {t(d.titleAr, d.titleEn)}
            </h2>
          )}
          {/* Social links */}
          <div className="flex flex-wrap justify-center items-center gap-6 mt-4 text-sm text-muted-foreground font-medium">
            {d.email && (
              <a
                href={`mailto:${d.email}`}
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span>{d.email}</span>
              </a>
            )}
            {d.linkedin && (
              <a
                href={d.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-primary transition-colors"
              >
                <Linkedin className="w-4 h-4" />
                <span>LinkedIn</span>
              </a>
            )}
          </div>
        </div>

        {/* Success state */}
        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <CheckCircle className="w-14 h-14 text-green-500" />
            <h3 className="text-xl font-bold text-foreground">{labels.successTitle}</h3>
            <p className="text-muted-foreground">{labels.successBody}</p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-2 text-sm text-primary underline hover:no-underline"
            >
              {labels.sendAnother}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Honeypot — visually hidden, never filled by real users */}
            <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}>
              <label htmlFor="hp-website">Website</label>
              <input
                id="hp-website"
                type="text"
                {...register("website")}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {/* Error banner */}
            {mutation.isError && (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  {(mutation.error as Error)?.message ||
                    (lang === "ar"
                      ? "حدث خطأ. يرجى المحاولة لاحقًا."
                      : "Something went wrong. Please try again.")}
                </span>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {labels.name}
              </label>
              <input
                type="text"
                {...register("name", {
                  required: labels.required,
                  maxLength: { value: 100, message: labels.tooLong(100) },
                })}
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={lang === "ar" ? "أدخل اسمك" : "Your name"}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {labels.email}
              </label>
              <input
                type="email"
                {...register("email", {
                  required: labels.required,
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: labels.invalidEmail,
                  },
                  maxLength: { value: 254, message: labels.tooLong(254) },
                })}
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder={lang === "ar" ? "example@email.com" : "your@email.com"}
                dir="ltr"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {labels.message}
              </label>
              <textarea
                rows={5}
                {...register("message", {
                  required: labels.required,
                  maxLength: { value: 5000, message: labels.tooLong(5000) },
                })}
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder={
                  lang === "ar" ? "اكتب رسالتك هنا…" : "Write your message here…"
                }
              />
              {errors.message && (
                <p className="mt-1 text-xs text-destructive">{errors.message.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || mutation.isPending}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {isSubmitting || mutation.isPending ? labels.sending : labels.send}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
