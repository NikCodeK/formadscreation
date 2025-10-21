export interface OptionWithCode {
  label: string;
  code: string;
}

export const phases: OptionWithCode[] = [
  { label: 'Awareness', code: 'AW' },
  { label: 'Lead Generation', code: 'LG' },
  { label: 'Consideration', code: 'CON' },
  { label: 'Conversion', code: 'CO' },
  { label: 'Text & Spotlight Ads', code: 'TA' },
  { label: 'Message Ads', code: 'MA' },
  { label: 'Google Search Network', code: 'GSN' },
  { label: 'Google Display Network', code: 'GDN' }
];

export const adFormats: OptionWithCode[] = [
  { label: 'Single Image Ad', code: 'SI' },
  { label: 'Carousel Image Ad', code: 'CAR' },
  { label: 'Video Ad', code: 'VA' },
  { label: 'Text Ad', code: 'TA' },
  { label: 'Spotlight Ad', code: 'SA' },
  { label: 'Message Ad', code: 'MA' },
  { label: 'Conversation Ad', code: 'CA' },
  { label: 'Event Ad', code: 'EA' },
  { label: 'Document Ad', code: 'DA' },
  { label: 'Single Image Thought Leader', code: 'SITL' },
  { label: 'Responsive Search Ad', code: 'RSA' },
  { label: 'Responsive Display Ad', code: 'RDA' }
];

export const campaignGoals: OptionWithCode[] = [
  { label: 'Brand Awareness', code: 'BA' },
  { label: 'Website Visits', code: 'WV' },
  { label: 'Engagement', code: 'EN' },
  { label: 'Video Views', code: 'VV' },
  { label: 'Lead Generation', code: 'LG' },
  { label: 'Website Conversions', code: 'WC' },
  { label: 'Job Applicants', code: 'JA' }
];

export const offers = ['Videotraining', 'PDF LM', 'Webinar', 'Website', 'Blog', 'Termin', 'Video'];

export const targetAudienceTypes: OptionWithCode[] = [
  { label: 'Webinar_RT', code: '41313221' },
  { label: 'ZG B - Update 280725', code: '40863286' },
  { label: 'ZG D - Branchen-Test - JB', code: '40863320' },
  { label: 'ZG D - Branchen-Test', code: '40839446' },
  { label: 'ZG B - LeadGen Phase', code: '40868307' },
  { label: 'Awareness - Gewinner ZG', code: '40809858' },
  { label: 'ZG B - Update 170725', code: '40849047' },
  { label: 'ZG_C StB DE 1-500MA', code: '40169700' },
  { label: 'ZG B - JB CxO BR IT', code: '40753368' },
  { label: '270625-AW-PA-B-JB', code: '40800929' },
  { label: '270625-AW-PA', code: '40803891' },
  { label: 'ZG A - TB KS DE BR IT', code: '40746720' },
  { label: 'IT-Entscheider 20052025', code: '40737305' }
];

export const targetAudienceCategory: OptionWithCode[] = [
  { label: 'Cold Audience', code: 'CA' },
  { label: 'Retargeting', code: 'RT' },
  { label: 'Predictive Audience', code: 'PA' },
  { label: 'Cold + Retargeting', code: 'CART' }
];

export const leadGenForms: OptionWithCode[] = [
  { label: 'lgf002', code: '13588364' },
  { label: 'lgf003', code: '13591544' }
];

export const mediaTypes: OptionWithCode[] = [
  { label: 'Image', code: 'i' },
  { label: 'Video', code: 'v' },
  { label: 'Carousel Image', code: 'car' },
  { label: 'Branded Image', code: 'bi' },
  { label: 'Infografik', code: 'ig' },
  { label: 'Stock', code: 's' },
  { label: 'Produkt', code: 'p' },
  { label: 'Search Ad', code: 'sa' }
];

export const adCtas = ['DOWNLOAD', 'LEARN_MORE', 'REGISTER', 'SIGN_UP'];

export const targetUrls = [
  'https://clever-funding.de/danke-fuer-dein-interesse-5-schritte/',
  'https://clever-funding.de/forschungszulage-webinar/',
  'https://clever-funding.de/',
  'https://clever-funding.de/forschungszulage-webinar/'
];

export const utmSources: OptionWithCode[] = [
  { label: 'linkedin', code: 'li' },
  { label: 'google', code: 'go' },
  { label: 'twitter', code: 'tw' },
  { label: 'facebook', code: 'fb' },
  { label: 'adroll', code: 'ar' },
  { label: 'youtube', code: 'yt' },
  { label: 'newsletter', code: 'nl' },
  { label: 'xing', code: 'xi' },
  { label: 'mailchimp', code: 'MC' }
];

export const utmMediums = ['paid', 'social', 'email', 'organic'];

export const otherAbbrev: OptionWithCode[] = [
  { label: 'Industry', code: 'BR' },
  { label: 'Job title', code: 'JT' },
  { label: 'Jobbezeichnung', code: 'JB' },
  { label: 'Job function', code: 'JF' },
  { label: 'Tätigkeitsbereich', code: 'TB' },
  { label: 'Seniority', code: 'KS' },
  { label: 'KMU', code: 'KMU' },
  { label: 'Company Size', code: 'CS' },
  { label: 'Angle of approach', code: 'AW' },
  { label: 'Copy', code: 'c' },
  { label: 'Visual / Creative', code: 'v' },
  { label: 'Lead Gen Form', code: 'LGF' },
  { label: 'Ideal Customer Profile', code: 'ICP' },
  { label: 'Quality Score', code: 'QS' },
  { label: 'ABM', code: 'ABM' },
  { label: 'Lead Magnet', code: 'LM' },
  { label: 'Skills', code: 'KN' },
  { label: 'Manuelles Gebot', code: 'MG' }
];

export const numericOptions = Array.from({ length: 20 }, (_, index) => index + 1);

export interface VariantDetail {
  id: string;
  headline: string;
  copy: string;
  assetUrl: string;
}

export interface CampaignBuilderFormState {
  phase: string;
  format: string;
  target: string;
  offer: string;
  cta: string;
  targetAudience: string;
  targetAudienceCode: string;
  targetAudienceType: string;
  targetAudienceTypeCode: string;
  targetUrl: string;
  leadGenForm: string;
  leadGenFormId: string;
  leadGenFormDraft: LeadGenFormDraft;
  country: string;
  budget: number | null;
  source: string;
  creatives: number;
  headlines: number;
  copys: number;
  assetType: string;
  variants: VariantDetail[];
}

export interface VariantRow {
  variante: string;
  headline: string;
  copy: string;
  assetType: string;
  assetUrl: string;
  phase: string;
  format: string;
  target: string;
  offer: string;
  cta: string;
  targetAudience: string;
  targetAudienceCode: string;
  targetAudienceType: string;
  targetAudienceTypeCode: string;
  targetUrl: string;
  leadGenForm: string;
  leadGenFormId: string;
  leadGenFormDraft: LeadGenFormDraft;
  country: string;
  source: string;
  budget: number | null;
}

export interface LeadGenFormDraft {
  phase: string;
  imageId: string;
  imageLink: string;
  title: string;
  detail: string;
  thankYouMessage: string;
  cta: string;
  targetLink: string;
}
