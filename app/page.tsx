/**
 * README
 * How to run: pnpm install && pnpm dev
 * Env: (none required) — logic is fully client-side
 * POST payload: not applicable — use the generated variants table
 */
'use client';

import { ChangeEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  adCtas,
  adFormats,
  campaignGoals,
  CampaignBuilderFormState,
  VariantDetail,
  targetAudienceCategory,
  mediaTypes,
  numericOptions,
  offers,
  phases,
  targetAudienceTypes,
  targetUrls,
  VariantRow
} from '@/lib/types';
import { clearState, getStorageKey, loadState, saveState } from '@/lib/storage';
import { Section } from '@/components/Section';

const STORAGE_KEY = getStorageKey();
const COUNTRY = 'DE';
const SOURCE = 'li';
const WEBHOOK_URL = 'https://cleverfunding.app.n8n.cloud/webhook-test/9b2b0503-c872-407f-8d53-e26a2a9232dd';

const DEFAULT_CREATIVES = 2;
const DEFAULT_HEADLINES = 2;
const DEFAULT_COPYS = 2;

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
};

const createVariantDetail = (): VariantDetail => ({
  id: createId(),
  headline: '',
  copy: '',
  assetUrl: ''
});

const resizeVariantList = (
  current: VariantDetail[] | undefined,
  total: number
): VariantDetail[] => {
  const normalized = (current ?? []).map((variant) => ({
    id: variant?.id ?? createId(),
    headline: variant?.headline ?? '',
    copy: variant?.copy ?? '',
    assetUrl: variant?.assetUrl ?? ''
  }));
  const next = normalized.slice(0, Math.max(total, 0));
  while (next.length < total) {
    next.push(createVariantDetail());
  }
  return next;
};

function createDefaultFormState(): CampaignBuilderFormState {
  const creatives = DEFAULT_CREATIVES;
  const headlines = DEFAULT_HEADLINES;
  const copys = DEFAULT_COPYS;
  const totalVariants = creatives * headlines * copys;
  const defaultAudience = targetAudienceTypes[0];
  const defaultAudienceType = targetAudienceCategory[0];
  return {
    phase: phases[0]?.label ?? '',
    format: adFormats[0]?.label ?? '',
    target: campaignGoals[0]?.label ?? '',
    offer: offers[0] ?? '',
    cta: adCtas[0] ?? '',
    targetAudience: defaultAudience?.label ?? '',
    targetAudienceCode: defaultAudience?.code ?? '',
    targetAudienceType: defaultAudienceType?.label ?? '',
    targetAudienceTypeCode: defaultAudienceType?.code ?? '',
    targetUrl: targetUrls[0] ?? '',
    country: COUNTRY,
    budget: 100,
    source: SOURCE,
    creatives,
    headlines,
    copys,
    assetType: mediaTypes[0]?.label ?? '',
    variants: resizeVariantList([], totalVariants)
  };
}

type BaseErrors = Partial<
  Record<
    | 'phase'
    | 'format'
    | 'target'
    | 'offer'
    | 'cta'
    | 'targetAudience'
    | 'targetAudienceType'
    | 'targetUrl'
    | 'budget'
    | 'creatives'
    | 'headlines'
    | 'copys'
    | 'assetType',
    string
  >
>;

interface VariantFieldErrors {
  headline?: string;
  copy?: string;
  assetUrl?: string;
}

interface ValidationResult {
  formErrors: BaseErrors;
  variantErrors: VariantFieldErrors[];
  hasErrors: boolean;
}

export default function CampaignBuilderPage() {
  const [formState, setFormState] = useState<CampaignBuilderFormState>(() => createDefaultFormState());
  const [hydrated, setHydrated] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const stored = loadState<CampaignBuilderFormState | null>(null, STORAGE_KEY);
    if (stored) {
      const mergedBase = createDefaultFormState();
      const merged: CampaignBuilderFormState = {
        ...mergedBase,
        ...stored,
        country: COUNTRY,
        source: SOURCE
      };
      const total = merged.creatives * merged.headlines * merged.copys;
      merged.variants = resizeVariantList(stored.variants ?? merged.variants, total);
      if (!merged.targetAudienceCode) {
        const matchedAudience = targetAudienceTypes.find((item) => item.label === merged.targetAudience);
        merged.targetAudienceCode = matchedAudience?.code ?? '';
      }
      if (!merged.targetAudienceTypeCode) {
        const matchedType = targetAudienceCategory.find((item) => item.label === merged.targetAudienceType);
        merged.targetAudienceTypeCode = matchedType?.code ?? '';
      }
      if (!merged.targetAudienceType) {
        merged.targetAudienceType = targetAudienceCategory[0]?.label ?? '';
        merged.targetAudienceTypeCode = targetAudienceCategory[0]?.code ?? '';
      } else {
        const matchedType = targetAudienceCategory.find((item) => item.label === merged.targetAudienceType);
        if (matchedType && matchedType.code !== merged.targetAudienceTypeCode) {
          merged.targetAudienceTypeCode = matchedType.code;
        }
      }
      if (!merged.targetUrl) {
        merged.targetUrl = targetUrls[0] ?? '';
      }
      setFormState(merged);
    }
    setShowErrors(false);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    saveState(formState, STORAGE_KEY);
  }, [formState, hydrated]);

  const validation = useMemo(() => validateForm(formState), [formState]);

  const totalVariants = formState.variants.length;

  const assetTypeCode = useMemo(() => {
    return mediaTypes.find((item) => item.label === formState.assetType)?.code ?? '';
  }, [formState.assetType]);

  const kombinatorikOutput = useMemo(() => {
    if (!totalVariants) {
      return '';
    }
    const typeLabel = assetTypeCode ? `Asset Type: ${assetTypeCode}` : 'Asset Type: —';
    return `Variante 1..${totalVariants} = (Headline, Copy, Asset URL). ${typeLabel}`;
  }, [assetTypeCode, totalVariants]);

  const variants = useMemo(() => generateVariants(formState), [formState]);

  const handleSelectChange = <Key extends keyof CampaignBuilderFormState>(field: Key, value: string) => {
    if (field === 'targetAudience') {
      const matched = targetAudienceTypes.find((item) => item.label === value);
      setFormState((prev) => ({
        ...prev,
        targetAudience: value,
        targetAudienceCode: matched?.code ?? ''
      }));
      return;
    }

    if (field === 'targetAudienceType') {
      const matchedType = targetAudienceCategory.find((item) => item.label === value);
      setFormState((prev) => ({
        ...prev,
        targetAudienceType: value,
        targetAudienceTypeCode: matchedType?.code ?? ''
      }));
      return;
    }

    if (field === 'targetUrl') {
      setFormState((prev) => ({
        ...prev,
        targetUrl: value
      }));
      return;
    }

    setFormState((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNumberSelect = (field: 'creatives' | 'headlines' | 'copys', value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return;
    }
    setFormState((prev) => {
      const nextCounts = {
        ...prev,
        [field]: parsed
      };
      const total =
        nextCounts.creatives * nextCounts.headlines * nextCounts.copys;
      return {
        ...nextCounts,
        variants: resizeVariantList(prev.variants, total)
      };
    });
  };

  const handleBudgetChange = (value: string) => {
    if (value.trim() === '') {
      setFormState((prev) => ({ ...prev, budget: null }));
      return;
    }
    const parsed = Number.parseFloat(value);
    setFormState((prev) => ({
      ...prev,
      budget: Number.isNaN(parsed) ? prev.budget : parsed
    }));
  };

  const handleVariantFieldChange = (
    index: number,
    field: 'headline' | 'copy' | 'assetUrl',
    value: string
  ) => {
    setFormState((prev) => {
      const nextVariants = prev.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [field]: value } : variant
      );
      return {
        ...prev,
        variants: nextVariants
      };
    });
  };

  const handleReset = () => {
    clearState(STORAGE_KEY);
    setFormState(createDefaultFormState());
    setShowErrors(false);
    setSubmitFeedback(null);
  };

  const handleSubmit = async () => {
    setShowErrors(true);
    setSubmitFeedback(null);

    const latest = validateForm(formState);
    if (latest.hasErrors) {
      setSubmitFeedback({ type: 'error', message: 'Bitte fehlende Angaben ergänzen.' });
      return;
    }

    const payload = {
      campaign: {
        phase: formState.phase,
        format: formState.format,
        target: formState.target,
        offer: formState.offer,
        cta: formState.cta,
        targetAudience: formState.targetAudience,
        targetAudienceCode: formState.targetAudienceCode,
        targetAudienceType: formState.targetAudienceType,
        targetAudienceTypeCode: formState.targetAudienceTypeCode,
        targetUrl: formState.targetUrl,
        country: formState.country,
        source: formState.source,
        budget: formState.budget,
        assetType: formState.assetType
      },
      variants: generateVariants(formState)
    };

    setIsSubmitting(true);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Webhook antwortete mit einem Fehler.');
      }

      // eslint-disable-next-line no-console
      console.log('Abschicken-Payload', payload);
      setSubmitFeedback({ type: 'success', message: 'Webhook erfolgreich ausgelöst.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler beim Abschicken.';
      setSubmitFeedback({ type: 'error', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasErrors = validation.hasErrors;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 lg:flex-row lg:items-start">
      <div className="flex-1 space-y-6">
        <Section title="Campaign Builder" countLabel={`Variants: ${totalVariants}`}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <SelectControl
              label="Phase"
              value={formState.phase}
              options={phases.map((item) => item.label)}
              onChange={(value) => handleSelectChange('phase', value)}
              error={showErrors ? validation.formErrors.phase : undefined}
            />
            <SelectControl
              label="Format"
              value={formState.format}
              options={adFormats.map((item) => item.label)}
              onChange={(value) => handleSelectChange('format', value)}
              error={showErrors ? validation.formErrors.format : undefined}
            />
            <SelectControl
              label="Target"
              value={formState.target}
              options={campaignGoals.map((item) => item.label)}
              onChange={(value) => handleSelectChange('target', value)}
              error={showErrors ? validation.formErrors.target : undefined}
            />
            <SelectControl
              label="Offer"
              value={formState.offer}
              options={offers}
              onChange={(value) => handleSelectChange('offer', value)}
              error={showErrors ? validation.formErrors.offer : undefined}
            />
            <SelectControl
              label="CTA"
              value={formState.cta}
              options={adCtas}
              onChange={(value) => handleSelectChange('cta', value)}
              error={showErrors ? validation.formErrors.cta : undefined}
            />
      <SelectControl
        label="Target Audience"
        value={formState.targetAudience}
        options={targetAudienceTypes.map((item) => item.label)}
        onChange={(value) => handleSelectChange('targetAudience', value)}
        error={showErrors ? validation.formErrors.targetAudience : undefined}
        helper={formState.targetAudienceCode ? `ID: ${formState.targetAudienceCode}` : undefined}
      />
      <SelectControl
        label="Target Audience Type"
        value={formState.targetAudienceType}
        options={targetAudienceCategory.map((item) => item.label)}
        onChange={(value) => handleSelectChange('targetAudienceType', value)}
        helper={formState.targetAudienceTypeCode ? `Code: ${formState.targetAudienceTypeCode}` : undefined}
      />
      <SelectControl
        label="Target URL"
        value={formState.targetUrl}
        options={targetUrls}
        onChange={(value) => handleSelectChange('targetUrl', value)}
        error={showErrors ? validation.formErrors.targetUrl : undefined}
        helper={showErrors && validation.formErrors.targetUrl ? validation.formErrors.targetUrl : 'Ziellink für die Kampagne'}
      />
            <ReadOnlyField label="Country" value={formState.country} />
            <NumberField
              label="Tagesbudget"
              value={formState.budget}
              onChange={handleBudgetChange}
              error={showErrors ? validation.formErrors.budget : undefined}
            />
            <ReadOnlyField label="Source" value={formState.source} />
            <SelectControl
              label="#Creatives"
              value={String(formState.creatives)}
              options={numericOptions.map((item) => String(item))}
              onChange={(value) => handleNumberSelect('creatives', value)}
              error={showErrors ? validation.formErrors.creatives : undefined}
            />
            <SelectControl
              label="#Headlines"
              value={String(formState.headlines)}
              options={numericOptions.map((item) => String(item))}
              onChange={(value) => handleNumberSelect('headlines', value)}
              error={showErrors ? validation.formErrors.headlines : undefined}
            />
            <SelectControl
              label="#Copys"
              value={String(formState.copys)}
              options={numericOptions.map((item) => String(item))}
              onChange={(value) => handleNumberSelect('copys', value)}
              error={showErrors ? validation.formErrors.copys : undefined}
            />
            <SelectControl
              label="Asset Type"
              value={formState.assetType}
              options={mediaTypes.map((item) => item.label)}
              onChange={(value) => handleSelectChange('assetType', value)}
              error={showErrors ? validation.formErrors.assetType : undefined}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            >
              Reset
            </button>
            {showErrors && hasErrors ? (
              <span className="text-sm text-rose-500">Please resolve highlighted errors.</span>
            ) : null}
          </div>
        </Section>

        <Section
          title="Variants Preview"
          subtitle="Review the generated combinations (Variante 1..N)."
          countLabel={`${variants.length} rows`}
        >
          {variants.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              Adjust the counts above to generate variants.
            </div>
          ) : (
            <div className="space-y-3">
              {variants.map((variant, index) => {
                const detail = formState.variants[index];
                const variantErrors = showErrors ? validation.variantErrors[index] : undefined;
                const assetUrl = detail?.assetUrl ?? variant.assetUrl;
                return (
                  <article
                    key={detail?.id ?? variant.variante}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300"
                  >
                    <header className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{variant.variante}</p>
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          {variant.phase} · {variant.format} · {variant.target}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">
                        {variant.budget !== null
                          ? variant.budget.toLocaleString('de-DE', { minimumFractionDigits: 2 }) + ' €'
                          : '—'}
                      </p>
                    </header>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <VariantEditableField
                        label="Headline"
                        value={detail?.headline ?? ''}
                        placeholder="Headline for this ad"
                        error={variantErrors?.headline}
                        onChange={(value) => handleVariantFieldChange(index, 'headline', value)}
                      />
                      <VariantEditableField
                        label="Copy"
                        value={detail?.copy ?? ''}
                        placeholder="Primary ad copy"
                        error={variantErrors?.copy}
                        onChange={(value) => handleVariantFieldChange(index, 'copy', value)}
                      />
                      <VariantEditableField
                        label="Asset URL"
                        value={detail?.assetUrl ?? ''}
                        placeholder="https://drive.google.com/..."
                        error={variantErrors?.assetUrl}
                        onChange={(value) => handleVariantFieldChange(index, 'assetUrl', value)}
                        multiline={false}
                        type="url"
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <VariantMetaField label="Asset Type" value={variant.assetType} />
                      <VariantMetaField label="Asset URL">
                        {assetUrl ? (
                          <a
                            href={assetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="break-all text-blue-600 underline"
                          >
                            {assetUrl}
                          </a>
                        ) : (
                          '—'
                        )}
                      </VariantMetaField>
                      <VariantMetaField label="CTA" value={variant.cta} />
                      <VariantMetaField label="Target Audience" value={variant.targetAudience} />
                      <VariantMetaField label="Audience Type" value={variant.targetAudienceType} />
                      <VariantMetaField label="Audience Type Code" value={variant.targetAudienceTypeCode} />
                      <VariantMetaField label="Target Audience ID" value={variant.targetAudienceCode} />
                      <VariantMetaField label="Target URL">
                        {variant.targetUrl ? (
                          <a href={variant.targetUrl} target="_blank" rel="noreferrer" className="break-all text-blue-600 underline">
                            {variant.targetUrl}
                          </a>
                        ) : (
                          '—'
                        )}
                      </VariantMetaField>
                      <VariantMetaField label="Offer" value={variant.offer} />
                      <VariantMetaField label="Country" value={variant.country} />
                      <VariantMetaField label="Source" value={variant.source} />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Section>
      </div>

      <aside className="w-full shrink-0 space-y-5 lg:w-[320px] xl:sticky xl:top-12">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <h3 className="text-lg font-semibold text-slate-900">Summary</h3>
          <dl className="space-y-2 text-sm text-slate-600">
            <div className="flex justify-between">
              <dt>Phase</dt>
              <dd className="font-medium text-slate-900">{formState.phase}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Format</dt>
              <dd className="font-medium text-slate-900">{formState.format}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Target</dt>
              <dd className="font-medium text-slate-900">{formState.target}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Target Audience Type</dt>
              <dd className="font-medium text-slate-900">{formState.targetAudienceType}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Audience Type Code</dt>
              <dd className="font-medium text-slate-900">{formState.targetAudienceTypeCode || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Target Audience ID</dt>
              <dd className="font-medium text-slate-900">{formState.targetAudienceCode || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Target URL</dt>
              <dd className="font-medium text-slate-900">{formState.targetUrl || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Total Variants</dt>
              <dd className="font-semibold text-slate-900">{totalVariants}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Asset Type Code</dt>
              <dd className="font-medium text-slate-900">{assetTypeCode}</dd>
            </div>
          </dl>
          <textarea
            className="min-h-[160px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
            value={kombinatorikOutput}
            readOnly
          />
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-400"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sendet…' : 'Abschicken'}
          </button>
          {submitFeedback ? (
            <p
              className={`text-xs ${submitFeedback.type === 'success' ? 'text-emerald-600' : 'text-rose-500'}`}
            >
              {submitFeedback.message}
            </p>
          ) : showErrors && validation.hasErrors ? (
            <p className="text-xs text-rose-500">Bitte alle Pflichtfelder und Asset-Links prüfen.</p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function validateForm(formState: CampaignBuilderFormState): ValidationResult {
  const formErrors: BaseErrors = {};

  if (!formState.phase) formErrors.phase = 'Phase is required.';
  if (!formState.format) formErrors.format = 'Format is required.';
  if (!formState.target) formErrors.target = 'Target is required.';
  if (!formState.offer) formErrors.offer = 'Offer is required.';
  if (!formState.cta) formErrors.cta = 'CTA is required.';
  if (!formState.targetAudience) formErrors.targetAudience = 'Target audience is required.';
  if (!formState.targetAudienceType) formErrors.targetAudienceType = 'Audience type is required.';
  if (!formState.targetUrl) {
    formErrors.targetUrl = 'Target URL is required.';
  } else if (!isValidUrl(formState.targetUrl)) {
    formErrors.targetUrl = 'Enter a valid https:// URL.';
  }
  if (formState.budget === null || Number.isNaN(formState.budget) || formState.budget <= 0) {
    formErrors.budget = 'Provide a positive budget.';
  }
  if (!formState.creatives) formErrors.creatives = 'Select at least 1 creative.';
  if (!formState.headlines) formErrors.headlines = 'Select at least 1 headline.';
  if (!formState.copys) formErrors.copys = 'Select at least 1 copy.';
  if (!formState.assetType) formErrors.assetType = 'Choose an asset type.';

  const variantErrors: VariantFieldErrors[] = formState.variants.map(() => ({}));
  formState.variants.forEach((variant, index) => {
    const entry: VariantFieldErrors = {};
    if (!variant.headline.trim()) {
      entry.headline = 'Headline is required.';
    }
    if (!variant.copy.trim()) {
      entry.copy = 'Copy is required.';
    }
    if (!variant.assetUrl.trim()) {
      entry.assetUrl = 'Asset URL is required.';
    } else if (!isValidUrl(variant.assetUrl)) {
      entry.assetUrl = 'Enter a valid https:// URL.';
    }
    variantErrors[index] = entry;
  });

  const hasFormErrors = Object.keys(formErrors).length > 0;
  const hasVariantErrors = variantErrors.some((entry) => Object.keys(entry).length > 0);

  return {
    formErrors,
    variantErrors,
    hasErrors: hasFormErrors || hasVariantErrors
  };
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function generateVariants(state: CampaignBuilderFormState): VariantRow[] {
  return state.variants.map((variant, index) => ({
    variante: `Variante ${index + 1}`,
    headline: variant.headline,
    copy: variant.copy,
    assetType: state.assetType,
    assetUrl: variant.assetUrl,
    phase: state.phase,
    format: state.format,
    target: state.target,
    offer: state.offer,
    cta: state.cta,
    targetAudience: state.targetAudience,
    targetAudienceCode: state.targetAudienceCode,
    targetAudienceType: state.targetAudienceType,
    targetAudienceTypeCode: state.targetAudienceTypeCode,
    targetUrl: state.targetUrl,
    country: state.country,
    source: state.source,
    budget: state.budget
  }));
}

function SelectControl({
  label,
  value,
  options,
  onChange,
  error,
  helper
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  error?: string;
  helper?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        className={`rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 ${
          error ? 'border-rose-400' : 'border-slate-200'
        }`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {helper ? <span className="text-xs text-slate-500">{helper}</span> : null}
      {error ? <span className="text-xs text-rose-500">{error}</span> : null}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  error
}: {
  label: string;
  value: number | null;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type="number"
        className={`rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 ${
          error ? 'border-rose-400' : 'border-slate-200'
        }`}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <span className="text-xs text-rose-500">{error}</span> : null}
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  error,
  helper,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helper?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-2 md:col-span-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className={`rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 ${
          error ? 'border-rose-400' : 'border-slate-200'
        }`}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {helper ? <span className="text-xs text-slate-500">{helper}</span> : null}
      {error ? <span className="text-xs text-rose-500">{error}</span> : null}
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600"
        value={value}
        readOnly
      />
    </label>
  );
}

function VariantEditableField({
  label,
  value,
  onChange,
  error,
  placeholder,
  multiline = true,
  type = 'text'
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  multiline?: boolean;
  type?: string;
}) {
  const baseClass = `rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 ${
    error ? 'border-rose-400' : 'border-slate-200'
  }`;
  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {multiline ? (
        <textarea
          className={`min-h-[80px] ${baseClass}`}
          value={value}
          placeholder={placeholder}
          onChange={handleChange}
        />
      ) : (
        <input
          className={baseClass}
          value={value}
          placeholder={placeholder}
          onChange={handleChange}
          type={type}
        />
      )}
      {error ? <span className="text-xs text-rose-500">{error}</span> : null}
    </label>
  );
}

function VariantMetaField({
  label,
  value,
  children
}: {
  label: string;
  value?: ReactNode;
  children?: ReactNode;
}) {
  const content = children ?? value;
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-slate-50 px-3 py-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-sm text-slate-800">{content ?? '—'}</span>
    </div>
  );
}
