import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import {
  SectionWithImages,
  useGetBrandingSettings,
  useSubmitContactForm,
} from '@workspace/api-client-react';

/** Strip HTML tags for plain-text display */
function stripHtml(html?: string): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
}

export function SectionRenderer({ section }: { section: SectionWithImages }) {
  const { lang, t, isRTL } = useLanguage();
  const colors = useColors();
  const d = section.data;

  const textAlign = isRTL ? ('right' as const) : ('left' as const);
  const flexDir = isRTL ? ('row-reverse' as const) : ('row' as const);

  if (section.type === 'hero') {
    return <HeroSection section={section} />;
  }

  if (section.type === 'text') {
    const content = stripHtml(t(d.contentAr, d.contentEn));
    return (
      <View style={[styles.sectionPad, { backgroundColor: colors.background }]}>
        {(d.titleAr || d.titleEn) && (
          <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign }]}>
            {t(d.titleAr, d.titleEn)}
          </Text>
        )}
        {content ? (
          <Text style={[styles.body, { color: colors.mutedForeground, textAlign }]}>
            {content}
          </Text>
        ) : null}
      </View>
    );
  }

  if (section.type === 'text_with_image') {
    const image = section.images[0];
    const content = stripHtml(t(d.contentAr, d.contentEn));
    return (
      <View style={[styles.sectionPad, { backgroundColor: colors.muted }]}>
        {(d.titleAr || d.titleEn) && (
          <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign }]}>
            {t(d.titleAr, d.titleEn)}
          </Text>
        )}
        {image && (
          <Image
            source={{ uri: image.url }}
            style={[styles.textWithImage, { borderRadius: colors.radius * 2 }]}
            resizeMode="cover"
          />
        )}
        {content ? (
          <Text style={[styles.body, { color: colors.mutedForeground, textAlign }]}>
            {content}
          </Text>
        ) : null}
      </View>
    );
  }

  if (section.type === 'cards_grid') {
    return (
      <View style={[styles.sectionPad, { backgroundColor: colors.background }]}>
        {(d.titleAr || d.titleEn) && (
          <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign }]}>
            {t(d.titleAr, d.titleEn)}
          </Text>
        )}
        {(d.contentAr || d.contentEn) && (
          <Text style={[styles.body, { color: colors.mutedForeground, textAlign, marginBottom: 16 }]}>
            {t(d.contentAr, d.contentEn)}
          </Text>
        )}
        <View style={styles.cardsGrid}>
          {d.items?.map((item) => (
            <View
              key={item.id}
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: colors.radius * 2,
                },
              ]}
            >
              {item.icon && (
                <View
                  style={[
                    styles.cardIcon,
                    { backgroundColor: colors.accent + '18', borderRadius: colors.radius },
                  ]}
                >
                  <Text style={[styles.cardIconText, { color: colors.accent }]}>
                    {item.icon.charAt(0)}
                  </Text>
                </View>
              )}
              <Text style={[styles.cardTitle, { color: colors.foreground, textAlign }]}>
                {t(item.titleAr, item.titleEn)}
              </Text>
              {(item.descriptionAr || item.descriptionEn) && (
                <Text style={[styles.cardDesc, { color: colors.mutedForeground, textAlign }]}>
                  {t(item.descriptionAr, item.descriptionEn)}
                </Text>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (section.type === 'timeline') {
    return (
      <View style={[styles.sectionPad, { backgroundColor: colors.primary }]}>
        {(d.titleAr || d.titleEn) && (
          <Text
            style={[styles.sectionTitle, { color: colors.primaryForeground, textAlign: 'center' }]}
          >
            {t(d.titleAr, d.titleEn)}
          </Text>
        )}
        {d.items?.map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.timelineItem,
              { borderLeftColor: colors.accent + '40' },
              isRTL && styles.timelineItemRTL,
              isRTL && { borderRightColor: colors.accent + '40' },
            ]}
          >
            <View
              style={[
                styles.timelineDot,
                { backgroundColor: colors.accent },
                isRTL && styles.timelineDotRTL,
              ]}
            />
            {item.date && (
              <Text style={[styles.timelineDate, { color: colors.accent, textAlign }]}>
                {item.date}
              </Text>
            )}
            <Text style={[styles.timelineTitle, { color: colors.primaryForeground, textAlign }]}>
              {t(item.titleAr, item.titleEn)}
            </Text>
            {(item.subheadingAr || item.subheadingEn) && (
              <Text
                style={[styles.timelineSubhead, { color: colors.primaryForeground + 'b3', textAlign }]}
              >
                {t(item.subheadingAr, item.subheadingEn)}
              </Text>
            )}
            {(item.descriptionAr || item.descriptionEn) && (
              <Text
                style={[styles.timelineDesc, { color: colors.primaryForeground + 'cc', textAlign }]}
              >
                {t(item.descriptionAr, item.descriptionEn)}
              </Text>
            )}
            {item.bullets && item.bullets.length > 0 && (
              <View style={{ marginTop: 8, gap: 6 }}>
                {item.bullets.map((b) => (
                  <View
                    key={b.id}
                    style={[styles.bulletRow, { flexDirection: flexDir }]}
                  >
                    <View
                      style={[styles.bulletDot, { backgroundColor: colors.accent + '99' }]}
                    />
                    <Text
                      style={[
                        styles.bulletText,
                        { color: colors.primaryForeground + 'e6', textAlign },
                      ]}
                    >
                      {t(b.textAr, b.textEn)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>
    );
  }

  if (section.type === 'image_gallery') {
    if (!section.images.length) return null;
    return (
      <View style={[styles.sectionPad, { backgroundColor: colors.background }]}>
        {(d.titleAr || d.titleEn) && (
          <Text
            style={[styles.sectionTitle, { color: colors.foreground, textAlign: 'center' }]}
          >
            {t(d.titleAr, d.titleEn)}
          </Text>
        )}
        <View style={styles.galleryGrid}>
          {section.images.map((img) => (
            <View
              key={img.id}
              style={[
                styles.galleryItem,
                { borderRadius: colors.radius * 1.5 },
              ]}
            >
              <Image
                source={{ uri: img.url }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (section.type === 'contact_strip') {
    return <ContactStripSection section={section} />;
  }

  return null;
}

// ── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection({ section }: { section: SectionWithImages }) {
  const { t, isRTL } = useLanguage();
  const colors = useColors();
  const d = section.data;

  const { data: branding } = useGetBrandingSettings();

  const profilePhoto = section.images[0];
  const heroBg = branding?.primaryColor ?? colors.primary;
  const heroFg = colors.primaryForeground;
  const cta1Bg = branding?.cta1BgColor ?? colors.accent;
  const cta1Text = branding?.cta1TextColor ?? '#ffffff';
  const cta2Bg = branding?.cta2BgColor ?? '#ffffff';
  const cta2Text = branding?.cta2TextColor ?? colors.primary;

  const textAlign = isRTL ? ('right' as const) : ('left' as const);
  const flexDir = isRTL ? ('row-reverse' as const) : ('row' as const);

  return (
    <View style={[styles.heroContainer, { backgroundColor: heroBg }]}>
      {profilePhoto && (
        <Image
          source={{ uri: profilePhoto.url }}
          style={styles.heroAvatar}
          resizeMode="cover"
        />
      )}
      <Text style={[styles.heroTitle, { color: heroFg, textAlign }]}>
        {t(d.titleAr, d.titleEn)}
      </Text>
      {(d.contentAr || d.contentEn) && (
        <Text style={[styles.heroSubtitle, { color: heroFg + 'cc', textAlign }]}>
          {t(d.contentAr, d.contentEn)}
        </Text>
      )}
      {(d.locationAr || d.locationEn) && (
        <View style={[styles.heroLocation, { flexDirection: flexDir }]}>
          <Feather name="map-pin" size={14} color={heroFg + '99'} />
          <Text style={[styles.heroLocationText, { color: heroFg + '99', marginLeft: 6 }]}>
            {t(d.locationAr, d.locationEn)}
          </Text>
        </View>
      )}
      <View style={[styles.heroButtons, { flexDirection: flexDir }]}>
        {(d.cta1Ar || d.cta1En) && (
          <TouchableOpacity
            style={[styles.heroCta, { backgroundColor: cta1Bg, borderRadius: colors.radius }]}
            activeOpacity={0.85}
          >
            <Text style={[styles.heroCtaText, { color: cta1Text }]}>
              {t(d.cta1Ar, d.cta1En)}
            </Text>
          </TouchableOpacity>
        )}
        {(d.cta2Ar || d.cta2En) && (
          <TouchableOpacity
            style={[styles.heroCta, { backgroundColor: cta2Bg, borderRadius: colors.radius }]}
            activeOpacity={0.85}
          >
            <Text style={[styles.heroCtaText, { color: cta2Text }]}>
              {t(d.cta2Ar, d.cta2En)}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Contact Strip ─────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  email: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

function ContactStripSection({ section }: { section: SectionWithImages }) {
  const { lang, t, isRTL } = useLanguage();
  const colors = useColors();
  const d = section.data;
  const mutation = useSubmitContactForm();

  const [form, setForm] = useState<FormState>({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const textAlign = isRTL ? ('right' as const) : ('left' as const);

  const labels = {
    name: lang === 'ar' ? 'الاسم' : 'Name',
    email: lang === 'ar' ? 'البريد الإلكتروني' : 'Email',
    message: lang === 'ar' ? 'الرسالة' : 'Message',
    send: lang === 'ar' ? 'إرسال الرسالة' : 'Send Message',
    sending: lang === 'ar' ? 'جارٍ الإرسال…' : 'Sending…',
    success: lang === 'ar' ? 'تم الإرسال!' : 'Message sent!',
    successBody: lang === 'ar' ? 'شكراً لتواصلك. سأرد عليك في أقرب وقت.' : "Thanks! I'll get back to you soon.",
    sendAnother: lang === 'ar' ? 'إرسال رسالة أخرى' : 'Send another',
    required: lang === 'ar' ? 'هذا الحقل مطلوب' : 'Required',
    invalidEmail: lang === 'ar' ? 'بريد إلكتروني غير صحيح' : 'Invalid email',
  };

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!form.name.trim()) errs.name = labels.required;
    if (!form.email.trim()) {
      errs.email = labels.required;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = labels.invalidEmail;
    }
    if (!form.message.trim()) errs.message = labels.required;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    try {
      await mutation.mutateAsync({
        data: { name: form.name, email: form.email, message: form.message },
      });
      setSubmitted(true);
      setForm({ name: '', email: '', message: '' });
    } catch {
      // error shown via mutation.isError
    }
  }

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: colors.radius,
      color: colors.foreground,
      textAlign,
    },
  ];

  return (
    <View style={[styles.sectionPad, { backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border }]}>
      {(d.titleAr || d.titleEn) && (
        <Text style={[styles.sectionTitle, { color: colors.foreground, textAlign: 'center' }]}>
          {t(d.titleAr, d.titleEn)}
        </Text>
      )}

      {/* Social links */}
      <View style={styles.socialRow}>
        {d.email && (
          <TouchableOpacity
            style={styles.socialLink}
            onPress={() => Linking.openURL(`mailto:${d.email}`)}
          >
            <Feather name="mail" size={16} color={colors.accent} />
            <Text style={[styles.socialText, { color: colors.mutedForeground, marginLeft: 6 }]}>
              {d.email}
            </Text>
          </TouchableOpacity>
        )}
        {d.linkedin && (
          <TouchableOpacity
            style={styles.socialLink}
            onPress={() => Linking.openURL(d.linkedin!)}
          >
            <Feather name="linkedin" size={16} color={colors.accent} />
            <Text style={[styles.socialText, { color: colors.mutedForeground, marginLeft: 6 }]}>
              LinkedIn
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {submitted ? (
        <View style={styles.successContainer}>
          <Feather name="check-circle" size={48} color="#22c55e" />
          <Text style={[styles.successTitle, { color: colors.foreground }]}>{labels.success}</Text>
          <Text style={[styles.successBody, { color: colors.mutedForeground }]}>{labels.successBody}</Text>
          <TouchableOpacity onPress={() => { setSubmitted(false); mutation.reset(); }}>
            <Text style={[styles.sendAnother, { color: colors.accent }]}>{labels.sendAnother}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          {mutation.isError && (
            <View style={[styles.errorBanner, { backgroundColor: colors.destructive + '18', borderColor: colors.destructive + '40' }]}>
              <Feather name="alert-circle" size={16} color={colors.destructive} />
              <Text style={[styles.errorBannerText, { color: colors.destructive, marginLeft: 6 }]}>
                {lang === 'ar' ? 'حدث خطأ. يرجى المحاولة لاحقًا.' : 'Something went wrong. Please try again.'}
              </Text>
            </View>
          )}

          {/* Name */}
          <View>
            <Text style={[styles.label, { color: colors.foreground, textAlign }]}>{labels.name}</Text>
            <TextInput
              style={inputStyle}
              value={form.name}
              onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
              placeholder={lang === 'ar' ? 'أدخل اسمك' : 'Your name'}
              placeholderTextColor={colors.mutedForeground}
              maxLength={100}
            />
            {errors.name && <Text style={[styles.fieldError, { color: colors.destructive }]}>{errors.name}</Text>}
          </View>

          {/* Email */}
          <View>
            <Text style={[styles.label, { color: colors.foreground, textAlign }]}>{labels.email}</Text>
            <TextInput
              style={inputStyle}
              value={form.email}
              onChangeText={(v) => setForm((p) => ({ ...p, email: v }))}
              placeholder="your@email.com"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={254}
            />
            {errors.email && <Text style={[styles.fieldError, { color: colors.destructive }]}>{errors.email}</Text>}
          </View>

          {/* Message */}
          <View>
            <Text style={[styles.label, { color: colors.foreground, textAlign }]}>{labels.message}</Text>
            <TextInput
              style={[inputStyle, styles.textarea]}
              value={form.message}
              onChangeText={(v) => setForm((p) => ({ ...p, message: v }))}
              placeholder={lang === 'ar' ? 'اكتب رسالتك هنا…' : 'Write your message here…'}
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={5}
              maxLength={5000}
              textAlignVertical="top"
            />
            {errors.message && <Text style={[styles.fieldError, { color: colors.destructive }]}>{errors.message}</Text>}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              {
                backgroundColor: colors.accent,
                borderRadius: colors.radius,
                opacity: mutation.isPending ? 0.6 : 1,
              },
            ]}
            onPress={handleSubmit}
            disabled={mutation.isPending}
            activeOpacity={0.85}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <View style={styles.submitBtnInner}>
                <Feather name="send" size={16} color="#ffffff" />
                <Text style={[styles.submitBtnText, { marginLeft: 8 }]}>{labels.send}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sectionPad: {
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    marginBottom: 16,
    fontFamily: 'Inter_700Bold',
  },
  body: {
    fontSize: 16,
    lineHeight: 26,
    fontFamily: 'Inter_400Regular',
  },
  textWithImage: {
    width: '100%',
    height: 220,
    marginBottom: 20,
  },

  // Hero
  heroContainer: {
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: 'center',
  },
  heroAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 24,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700' as const,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Inter_700Bold',
  },
  heroSubtitle: {
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 26,
    fontFamily: 'Inter_400Regular',
  },
  heroLocation: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heroLocationText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  heroButtons: {
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  heroCta: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  heroCtaText: {
    fontSize: 15,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
  },

  // Cards
  cardsGrid: {
    gap: 14,
  },
  card: {
    padding: 20,
    borderWidth: 1,
  },
  cardIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardIconText: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    marginBottom: 8,
    fontFamily: 'Inter_700Bold',
  },
  cardDesc: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
  },

  // Timeline
  timelineItem: {
    borderLeftWidth: 2,
    paddingLeft: 20,
    paddingBottom: 32,
    position: 'relative',
  },
  timelineItemRTL: {
    borderLeftWidth: 0,
    borderRightWidth: 2,
    paddingLeft: 0,
    paddingRight: 20,
  },
  timelineDot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    left: -8,
    top: 4,
  },
  timelineDotRTL: {
    left: undefined,
    right: -8,
  },
  timelineDate: {
    fontSize: 13,
    fontWeight: '700' as const,
    marginBottom: 4,
    fontFamily: 'Inter_700Bold',
  },
  timelineTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 4,
    fontFamily: 'Inter_700Bold',
  },
  timelineSubhead: {
    fontSize: 15,
    marginBottom: 8,
    fontFamily: 'Inter_400Regular',
  },
  timelineDesc: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
  },
  bulletRow: {
    alignItems: 'flex-start',
    gap: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    flexShrink: 0,
  },
  bulletText: {
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
    fontFamily: 'Inter_400Regular',
  },

  // Gallery
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  galleryItem: {
    width: '48%',
    aspectRatio: 1,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },

  // Contact
  socialRow: {
    gap: 12,
    marginBottom: 24,
  },
  socialLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  socialText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginBottom: 6,
    fontFamily: 'Inter_500Medium',
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  textarea: {
    minHeight: 120,
    paddingTop: 12,
  },
  fieldError: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Inter_400Regular',
  },
  submitBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600' as const,
    fontFamily: 'Inter_600SemiBold',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    fontFamily: 'Inter_700Bold',
  },
  successBody: {
    fontSize: 15,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
  },
  sendAnother: {
    fontSize: 14,
    textDecorationLine: 'underline',
    fontFamily: 'Inter_400Regular',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  errorBannerText: {
    fontSize: 14,
    flex: 1,
    fontFamily: 'Inter_400Regular',
  },
});
