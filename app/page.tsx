/**
 * README
 * How to run: pnpm install && pnpm dev
 * Env: (none required) — logic is fully client-side
 * POST payload: not applicable — use the generated variants table
 */
'use client';

import { ChangeEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  adCtas,
  adFormats,
  campaignGoals,
  CampaignBuilderFormState,
  type LeadGenFormDraft,
  type OptionWithCode,
  VariantDetail,
  targetAudienceCategory,
  leadGenForms,
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
const DEFAULT_LEADGEN_WEBHOOK_URL = 'https://cleverfunding.app.n8n.cloud/webhook-test/edaa879d-442a-4fcf-8fc1-dd9df5797efe';
const LEADGEN_WEBHOOK_URL = process.env.NEXT_PUBLIC_LEADGEN_WEBHOOK_URL ?? DEFAULT_LEADGEN_WEBHOOK_URL;
const DEFAULT_LEADGEN_WEBHOOK_TOKEN = 'n8n_ingest_7e2f4a913c8d4fb1b1d51b64b83a92c1';
const LEADGEN_WEBHOOK_TOKEN = process.env.NEXT_PUBLIC_N8N_TOKEN ?? DEFAULT_LEADGEN_WEBHOOK_TOKEN;
const DEFAULT_LEADGEN_WEBHOOK_METHOD = 'POST';
const LEADGEN_WEBHOOK_METHOD = (process.env.NEXT_PUBLIC_LEADGEN_WEBHOOK_METHOD ?? DEFAULT_LEADGEN_WEBHOOK_METHOD).toUpperCase();

const DEFAULT_CREATIVES = 2;
const DEFAULT_HEADLINES = 2;
const DEFAULT_COPYS = 2;

const createEmptyLeadGenDraft = (): LeadGenFormDraft => ({
  phase: '',
  imageId: '',
  imageLink: '',
  title: '',
  detail: '',
  thankYouMessage: '',
  cta: '',
  targetLink: ''
});

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
  const defaultLeadGen = leadGenForms[0];
  const defaultLeadGenDraft = {
    ...createEmptyLeadGenDraft(),
    phase: phases[0]?.label ?? ''
  };
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
    leadGenForm: defaultLeadGen?.label ?? '',
    leadGenFormId: defaultLeadGen?.code ?? '',
    leadGenFormDraft: defaultLeadGenDraft,
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
    | 'leadGenForm'
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
  const [isLeadGenModalOpen, setIsLeadGenModalOpen] = useState(false);
  const [leadGenDraft, setLeadGenDraft] = useState<LeadGenFormDraft>(formState.leadGenFormDraft);
  const [isLeadGenSubmitting, setIsLeadGenSubmitting] = useState(false);
  const [leadGenSubmitFeedback, setLeadGenSubmitFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [customLeadGenForms, setCustomLeadGenForms] = useState<OptionWithCode[]>([]);
  const isLeadGenWebhookConfigured = Boolean(LEADGEN_WEBHOOK_URL);
  const [leadGenStatus, setLeadGenStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const logLeadGenDebug = useCallback((label: string, data?: unknown) => {
    // eslint-disable-next-line no-console
    console.log(`[leadgen] ${label}`, data);
  }, []);

  const targetAudienceCodeMap = useMemo(
    () => new Map(targetAudienceTypes.map(({ label, code }) => [label, code])),
    []
  );
  const targetAudienceTypeCodeMap = useMemo(
    () => new Map(targetAudienceCategory.map(({ label, code }) => [label, code])),
    []
  );
  const targetUrlOptions = useMemo(() => Array.from(new Set(targetUrls)), []);
  const leadGenFormOptions = useMemo(() => [...leadGenForms, ...customLeadGenForms], [customLeadGenForms]);
  const leadGenFormIdMap = useMemo(
    () => new Map(leadGenFormOptions.map(({ label, code }) => [label, code])),
    [leadGenFormOptions]
  );
  const leadGenTicker = useMemo(() => {
    if (leadGenStatus === 'sending') {
      return {
        label: 'Sending…',
        wrapper: 'border-rose-200 bg-rose-50 text-rose-600',
        dot: 'bg-rose-500'
      };
    }
    if (leadGenStatus === 'success') {
      const message =
        typeof leadGenSubmitFeedback?.message === 'string'
          ? leadGenSubmitFeedback.message
          : 'Successfully created';
      return {
        label: message,
        wrapper: 'border-emerald-200 bg-emerald-50 text-emerald-600',
        dot: 'bg-emerald-500'
      };
    }
    if (leadGenStatus === 'error') {
      const message =
        leadGenSubmitFeedback?.message ?? 'Send failed';
      return {
        label: message,
        wrapper: 'border-rose-200 bg-rose-50 text-rose-600',
        dot: 'bg-rose-500'
      };
    }
    return {
      label: 'Not in use',
      wrapper: 'border-slate-200 bg-slate-100 text-slate-600',
      dot: 'bg-slate-400'
    };
  }, [leadGenStatus, leadGenSubmitFeedback]);

  const updateLeadGenDraft = useCallback(
    (updates: Partial<LeadGenFormDraft>) => {
      setLeadGenDraft((prev) => {
        const next = { ...prev, ...updates };
        setFormState((prevState) => ({
          ...prevState,
          leadGenFormDraft: next
        }));
        return next;
      });
    },
    [setFormState]
  );

  const resetLeadGenDraft = useCallback((draft?: LeadGenFormDraft) => {
    const next = draft ?? createEmptyLeadGenDraft();
    setLeadGenDraft(next);
    setFormState((prevState) => ({
      ...prevState,
      leadGenFormDraft: next
    }));
  }, [setFormState]);

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
      merged.targetAudienceCode = targetAudienceCodeMap.get(merged.targetAudience) ?? '';
      merged.targetAudienceTypeCode = targetAudienceTypeCodeMap.get(merged.targetAudienceType) ?? '';
      if (!merged.targetAudienceType) {
        merged.targetAudienceType = targetAudienceCategory[0]?.label ?? '';
        merged.targetAudienceTypeCode = targetAudienceCategory[0]?.code ?? '';
      } else {
        merged.targetAudienceTypeCode =
          targetAudienceTypeCodeMap.get(merged.targetAudienceType) ?? merged.targetAudienceTypeCode ?? '';
      }
      if (!merged.targetUrl) {
        merged.targetUrl = targetUrls[0] ?? '';
      }
      merged.leadGenForm = merged.leadGenForm || leadGenForms[0]?.label || '';
      merged.leadGenFormId = leadGenFormIdMap.get(merged.leadGenForm) ?? leadGenForms[0]?.code ?? '';
      merged.leadGenFormDraft = {
        ...createEmptyLeadGenDraft(),
        ...(merged.leadGenFormDraft ?? {}),
        phase: merged.leadGenFormDraft?.phase || merged.phase || ''
      };
      if (
        merged.leadGenForm &&
        !leadGenForms.some((item) => item.label === merged.leadGenForm)
      ) {
        setCustomLeadGenForms((prev) => {
          const filtered = prev.filter((item) => item.label !== merged.leadGenForm);
          return [...filtered, { label: merged.leadGenForm, code: merged.leadGenFormId }];
        });
      }
      setFormState(merged);
      setLeadGenDraft(merged.leadGenFormDraft);
    }
    setShowErrors(false);
    setHydrated(true);
  }, [targetAudienceCodeMap, targetAudienceTypeCodeMap, leadGenFormIdMap]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    saveState(formState, STORAGE_KEY);
  }, [formState, hydrated]);

  useEffect(() => {
    setLeadGenDraft(formState.leadGenFormDraft);
  }, [formState.leadGenFormDraft]);

  const validation = useMemo(() => validateForm(formState), [formState]);

  const totalVariants = formState.variants.length;

  const assetTypeCode = useMemo(() => {
    return mediaTypes.find((item) => item.label === formState.assetType)?.code ?? '';
  }, [formState.assetType]);

  const leadGenInfo = formState.leadGenFormDraft;
  const hasLeadGenInfo = useMemo(
    () => Object.values(leadGenInfo).some((value) => Boolean(value && String(value).trim())),
    [leadGenInfo]
  );
  const reportLeadGenError = useCallback(
    (message: string) => {
      setLeadGenSubmitFeedback({ type: 'error', message });
      setLeadGenStatus('error');
    },
    [setLeadGenStatus, setLeadGenSubmitFeedback]
  );

  useEffect(() => {
    if (!leadGenDraft.phase && formState.phase) {
      updateLeadGenDraft({ phase: formState.phase });
    }
  }, [formState.phase, leadGenDraft.phase, updateLeadGenDraft]);

  const variants = useMemo(() => generateVariants(formState), [formState]);

  const handleSelectChange = <Key extends keyof CampaignBuilderFormState>(field: Key, value: string) => {
    if (field === 'targetAudience') {
      setFormState((prev) => ({
        ...prev,
        targetAudience: value,
        targetAudienceCode: targetAudienceCodeMap.get(value) ?? ''
      }));
      return;
    }

    if (field === 'targetAudienceType') {
      setFormState((prev) => ({
        ...prev,
        targetAudienceType: value,
        targetAudienceTypeCode: targetAudienceTypeCodeMap.get(value) ?? ''
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

    if (field === 'leadGenForm') {
      setFormState((prev) => ({
        ...prev,
        leadGenForm: value,
        leadGenFormId: leadGenFormIdMap.get(value) ?? ''
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
    const defaultState = createDefaultFormState();
    setFormState(defaultState);
    setShowErrors(false);
    setSubmitFeedback(null);
    resetLeadGenDraft(defaultState.leadGenFormDraft);
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
        leadGenForm: formState.leadGenForm,
        leadGenFormId: formState.leadGenFormId,
        leadGenFormDraft: formState.leadGenFormDraft,
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

  const handleLeadGenSubmit = async () => {
    setLeadGenSubmitFeedback(null);

    if (!LEADGEN_WEBHOOK_URL) {
      reportLeadGenError('Kein Leadgen-WebHook konfiguriert.');
      return;
    }

    if (!leadGenDraft.title.trim()) {
      reportLeadGenError('Bitte einen Titel für das Leadgen-Formular angeben.');
      return;
    }

    if (!leadGenDraft.targetLink.trim()) {
      reportLeadGenError('Bitte einen Ziellink für das Leadgen-Formular angeben.');
      return;
    }

    if (!isValidUrl(leadGenDraft.targetLink)) {
      reportLeadGenError('Bitte einen gültigen Ziellink (https://) angeben.');
      return;
    }

    if (leadGenDraft.imageLink && !isValidUrl(leadGenDraft.imageLink)) {
      reportLeadGenError('Bitte einen gültigen Bildlink (https://) angeben.');
      return;
    }

    setLeadGenStatus('sending');
    setIsLeadGenSubmitting(true);

    const draftPayload: LeadGenFormDraft = {
      ...leadGenDraft,
      phase: leadGenDraft.phase || formState.phase
    };

    const payload = {
      form: {
        label: formState.leadGenForm,
        id: formState.leadGenFormId
      },
      draft: draftPayload,
      campaign: {
        phase: formState.phase,
        target: formState.target,
        offer: formState.offer
      },
      success: true
    };

    try {
      logLeadGenDebug('submission-started', { payload });
      const sendLeadGenRequest = (url: string, method: string) => {
        const normalizedMethod = method.toUpperCase();
        const supportsBody = normalizedMethod !== 'GET' && normalizedMethod !== 'HEAD';
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        if (LEADGEN_WEBHOOK_TOKEN) {
          headers.Authorization = `Bearer ${LEADGEN_WEBHOOK_TOKEN}`;
        }

        let requestUrl = url;
        let body: string | undefined;
        if (supportsBody) {
          body = JSON.stringify(payload);
        } else {
          try {
            const urlObject = new URL(url);
            urlObject.searchParams.set('payload', JSON.stringify(payload));
            requestUrl = urlObject.toString();
          } catch {
            // Fallback for environments where URL parsing fails
            requestUrl = `${url}${url.includes('?') ? '&' : '?'}payload=${encodeURIComponent(
              JSON.stringify(payload)
            )}`;
          }
        }

        logLeadGenDebug('request-dispatch', { url: requestUrl, method: normalizedMethod, supportsBody });

        return fetch(requestUrl, {
          method: normalizedMethod,
          headers,
          body
        }).then((response) => {
          const headers: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            headers[key] = value;
          });
          logLeadGenDebug('response-meta', {
            url: requestUrl,
            method: normalizedMethod,
            status: response.status,
            statusText: response.statusText,
            headers
          });
          return response;
        });
      };

      let activeUrl = LEADGEN_WEBHOOK_URL;
      let activeMethod = LEADGEN_WEBHOOK_METHOD;
      let response = await sendLeadGenRequest(activeUrl, activeMethod);

      if (response.status === 404 && activeUrl.includes('/webhook-test/')) {
        logLeadGenDebug('fallback-webhook-url', { from: activeUrl, to: activeUrl.replace('/webhook-test/', '/webhook/') });
        activeUrl = activeUrl.replace('/webhook-test/', '/webhook/');
        response = await sendLeadGenRequest(activeUrl, activeMethod);
      }

      if (response.status === 405 && activeMethod !== 'GET') {
        logLeadGenDebug('method-retry', { previousMethod: activeMethod, nextMethod: 'GET' });
        activeMethod = 'GET';
        response = await sendLeadGenRequest(activeUrl, activeMethod);
      }

      if (!response.ok) {
        const errorText = await response.text();
        const statusInfo = response.status ? ` (Status ${response.status})` : '';
        logLeadGenDebug('response-error', { status: response.status, statusText: response.statusText, body: errorText });
        throw new Error(errorText || `Leadgen-Webhook antwortete mit einem Fehler${statusInfo}.`);
      }

      let parsedBody: unknown = {};
      try {
        parsedBody = await response.json();
        logLeadGenDebug('response-body', parsedBody);
      } catch (parseError) {
        logLeadGenDebug('response-json-parse-error', parseError);
        parsedBody = {};
      }

      const interpretIngestResponse = (
        payload: unknown
      ): { success: boolean; message?: string; metaStatus?: string } => {
        const inspectables = Array.isArray(payload) ? payload : [payload];
        let fallbackMessage: string | undefined;
        let fallbackStatus: string | undefined;

        for (const item of inspectables) {
          if (!item || typeof item !== 'object') {
            continue;
          }
          const data = item as Record<string, unknown>;
          const body =
            data.body && typeof data.body === 'object' && data.body !== null
              ? (data.body as Record<string, unknown>)
              : data;

          const dataStatus = data['status'];
          const dataStatusCode = data['statusCode'];
          const bodyStatus = (body as Record<string, unknown>)['status'];
          const bodyStatusCode = (body as Record<string, unknown>)['statusCode'];

          const rawStatus =
            (typeof dataStatus === 'string' && dataStatus) ||
            (typeof dataStatusCode === 'string' && dataStatusCode) ||
            (typeof dataStatusCode === 'number' && String(dataStatusCode)) ||
            (typeof bodyStatus === 'string' && bodyStatus) ||
            (typeof bodyStatusCode === 'string' && bodyStatusCode) ||
            (typeof bodyStatusCode === 'number' && String(bodyStatusCode)) ||
            undefined;
          if (rawStatus && !fallbackStatus) {
            fallbackStatus = rawStatus;
          }

          const bodyMessage = (body as Record<string, unknown>)['message'];
          const dataMessage = data['message'];
          const rawMessage =
            (typeof bodyMessage === 'string' && bodyMessage.trim()) ||
            (typeof dataMessage === 'string' && dataMessage.trim()) ||
            undefined;
          if (rawMessage && !fallbackMessage) {
            fallbackMessage = rawMessage;
          }

          const successFlags = [
            (body as Record<string, unknown>)['received'],
            data['received'],
            (body as Record<string, unknown>)['success'],
            data['success']
          ].map((value) => {
            if (value === true) return true;
            if (typeof value === 'string') {
              const normalized = value.trim().toLowerCase();
              return normalized === 'true' || normalized === 'ok' || normalized === 'success' || normalized === 'created';
            }
            return false;
          });

          if (successFlags.some(Boolean)) {
            return { success: true, message: rawMessage, metaStatus: rawStatus };
          }

          const normalizedStatus = rawStatus?.trim().toLowerCase();
          if (normalizedStatus && ['ok', 'success', 'created'].includes(normalizedStatus)) {
            return { success: true, message: rawMessage, metaStatus: rawStatus };
          }

          if (typeof dataStatusCode === 'number' && dataStatusCode >= 200 && dataStatusCode < 300) {
            return { success: true, message: rawMessage, metaStatus: rawStatus };
          }
        }

        const normalizedFallbackMessage = fallbackMessage?.trim().toLowerCase();
        if (normalizedFallbackMessage && normalizedFallbackMessage.includes('workflow was started')) {
          return { success: true, message: fallbackMessage, metaStatus: fallbackStatus };
        }

        return { success: false, message: fallbackMessage, metaStatus: fallbackStatus };
      };

      const interpreted = interpretIngestResponse(parsedBody);
      logLeadGenDebug('response-interpreted', interpreted);
      if (!interpreted.success) {
        const statusSuffix = interpreted.metaStatus ? ` (${interpreted.metaStatus})` : '';
        const message =
          interpreted.message ??
          (Array.isArray(parsedBody) && parsedBody.length === 0
            ? 'Leadgen-Webhook lieferte keine Daten.'
            : 'Leadgen-Webhook meldete keinen Erfolg.');
        logLeadGenDebug('interpreted-failure', { interpreted, raw: parsedBody });
        throw new Error(`${message}${statusSuffix}`);
      }

      const successMessage =
        interpreted.message && interpreted.message.trim() ? interpreted.message : 'Workflow has succeed';

      const resolvedResult =
        Array.isArray(parsedBody)
          ? (() => {
              const withBody = parsedBody.find(
                (item) => item && typeof item === 'object' && 'body' in (item as Record<string, unknown>)
              ) as { body?: Record<string, unknown> } | undefined;
              if (withBody?.body && typeof withBody.body === 'object') {
                return withBody.body;
              }
              const firstObject = parsedBody.find((item) => item && typeof item === 'object') as
                | Record<string, unknown>
                | undefined;
              return firstObject;
            })()
          : (parsedBody as Record<string, unknown> | undefined);

      logLeadGenDebug('response-resolved', resolvedResult);

      const resolvedLeadGenForm =
        resolvedResult && typeof resolvedResult.leadGenForm === 'object' && resolvedResult.leadGenForm !== null
          ? (resolvedResult.leadGenForm as Record<string, unknown>)
          : undefined;

      const newFormLabel =
        (resolvedLeadGenForm && typeof resolvedLeadGenForm.label === 'string'
          ? String(resolvedLeadGenForm.label)
          : null) ??
        (typeof resolvedResult?.label === 'string' ? resolvedResult.label : null) ??
        formState.leadGenForm ??
        `LeadGen ${Date.now()}`;
      const newFormId =
        (resolvedLeadGenForm && typeof resolvedLeadGenForm.id === 'string'
          ? String(resolvedLeadGenForm.id)
          : null) ??
        (typeof resolvedResult?.code === 'string' ? resolvedResult.code : null) ??
        formState.leadGenFormId ??
        `${Date.now()}`;
      const newDraft: LeadGenFormDraft = {
        ...draftPayload,
        ...(resolvedResult?.leadGenFormDraft && typeof resolvedResult.leadGenFormDraft === 'object'
          ? (resolvedResult.leadGenFormDraft as Partial<LeadGenFormDraft>)
          : {})
      };

      setCustomLeadGenForms((prev) => {
        if (leadGenForms.some((item) => item.label === newFormLabel)) {
          return prev;
        }
        const filtered = prev.filter((item) => item.label !== newFormLabel);
        return [...filtered, { label: newFormLabel, code: newFormId }];
      });

      setFormState((prev) => ({
        ...prev,
        leadGenForm: newFormLabel,
        leadGenFormId: newFormId,
        leadGenFormDraft: newDraft
      }));
      setLeadGenDraft(newDraft);
      setLeadGenStatus('success');
      setLeadGenSubmitFeedback({ type: 'success', message: successMessage });
      logLeadGenDebug('submission-success', { successMessage, newFormLabel, newFormId });
      setIsLeadGenModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler beim Leadgen-Webhook.';
      logLeadGenDebug('submission-error', { error, message });
      reportLeadGenError(message);
    } finally {
      setIsLeadGenSubmitting(false);
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
      />
      <SelectControl
        label="Target Audience Type"
        value={formState.targetAudienceType}
        options={targetAudienceCategory.map((item) => item.label)}
        onChange={(value) => handleSelectChange('targetAudienceType', value)}
        error={showErrors ? validation.formErrors.targetAudienceType : undefined}
      />
      <SelectControl
        label="Target URL"
        value={formState.targetUrl}
        options={targetUrlOptions}
        onChange={(value) => handleSelectChange('targetUrl', value)}
        error={showErrors ? validation.formErrors.targetUrl : undefined}
      />
      <SelectControl
        label="Lead Gen Form"
        value={formState.leadGenForm}
        options={leadGenFormOptions.map((item) => item.label)}
        onChange={(value) => handleSelectChange('leadGenForm', value)}
        error={showErrors ? validation.formErrors.leadGenForm : undefined}
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
                      <VariantMetaField label="Lead Gen Form" value={variant.leadGenForm} />
                      <VariantMetaField label="Lead Gen Form ID" value={variant.leadGenFormId} />
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
              <dt>Lead Gen Form</dt>
              <dd className="font-medium text-slate-900">{formState.leadGenForm}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Lead Gen Form ID</dt>
              <dd className="font-medium text-slate-900">{formState.leadGenFormId || '—'}</dd>
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
          <button
            type="button"
            onClick={() => {
              resetLeadGenDraft({
                ...formState.leadGenFormDraft,
                phase: formState.phase
              });
              setLeadGenSubmitFeedback(null);
              setIsLeadGenSubmitting(false);
              setLeadGenStatus('idle');
              setIsLeadGenModalOpen(true);
            }}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          >
            Leadgen Form erstellen
          </button>
          <div
            className={`mt-2 inline-flex min-h-[32px] w-full items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${leadGenTicker.wrapper}`}
          >
            <span className={`h-2 w-2 rounded-full ${leadGenTicker.dot}`} />
            <span className="flex-1 text-left">{leadGenTicker.label}</span>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-400"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sendet…' : 'Abschicken'}
          </button>
          {submitFeedback ? (
            <p className={`text-xs ${submitFeedback.type === 'success' ? 'text-emerald-600' : 'text-rose-500'}`}>
              {submitFeedback.message}
            </p>
          ) : showErrors && validation.hasErrors ? (
            <p className="text-xs text-rose-500">Bitte alle Pflichtfelder und Asset-Links prüfen.</p>
          ) : null}
        </div>
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          {hasLeadGenInfo ? (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lead Gen Form Details</h4>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <LeadGenInfoGrid info={leadGenInfo} />
              </div>
            </div>
          ) : null}
        </div>
      </aside>

      <Modal
        open={isLeadGenModalOpen}
        onClose={() => {
          setLeadGenSubmitFeedback(null);
          setIsLeadGenModalOpen(false);
        }}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField
            label="Phase"
            value={leadGenDraft.phase}
            onChange={(value) => updateLeadGenDraft({ phase: value })}
          />
          <TextField
            label="LG Form Image ID"
            value={leadGenDraft.imageId}
            onChange={(value) => updateLeadGenDraft({ imageId: value })}
          />
          <TextField
            label="LG Form Image Link"
            value={leadGenDraft.imageLink}
            onChange={(value) => updateLeadGenDraft({ imageLink: value })}
            placeholder="https://"
          />
          <TextField
            label="LG Form Title (60 Zeichen)"
            value={leadGenDraft.title}
            onChange={(value) => updateLeadGenDraft({ title: value })}
          />
          <TextField
            label="LG Form Detail (160 Zeichen)"
            value={leadGenDraft.detail}
            onChange={(value) => updateLeadGenDraft({ detail: value })}
            multiline
            rows={3}
          />
          <TextField
            label="LG Form Thank You Message (300 Zeichen)"
            value={leadGenDraft.thankYouMessage}
            onChange={(value) => updateLeadGenDraft({ thankYouMessage: value })}
            multiline
            rows={4}
          />
          <TextField
            label="LGF CTA"
            value={leadGenDraft.cta}
            onChange={(value) => updateLeadGenDraft({ cta: value })}
          />
          <TextField
            label="LGF Target Link"
            value={leadGenDraft.targetLink}
            onChange={(value) => updateLeadGenDraft({ targetLink: value })}
            placeholder="https://"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            onClick={() => {
              resetLeadGenDraft({
                ...createEmptyLeadGenDraft(),
                phase: formState.phase
              });
              setLeadGenStatus('idle');
            }}
          >
            Zurücksetzen
          </button>
          <div
            className={`inline-flex min-h-[32px] items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${leadGenTicker.wrapper}`}
          >
            <span className={`h-2 w-2 rounded-full ${leadGenTicker.dot}`} />
            <span>{leadGenTicker.label}</span>
          </div>
          <button
            type="button"
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-400"
            onClick={handleLeadGenSubmit}
            disabled={isLeadGenSubmitting || !isLeadGenWebhookConfigured}
          >
            {isLeadGenSubmitting ? 'Sendet…' : 'Leadgen Form senden'}
          </button>
          <button
            type="button"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            onClick={() => {
              setLeadGenSubmitFeedback(null);
              setIsLeadGenModalOpen(false);
            }}
          >
            Schließen
          </button>
        </div>
      </Modal>
    </div>
  );
}

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      onMouseDown={handleBackdropClick}
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-card"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Leadgen Form erstellen</h3>
          <button
            type="button"
            className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
            onClick={onClose}
          >
            Schließen
          </button>
        </div>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-2">{children}</div>
      </div>
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
  if (!formState.leadGenForm) formErrors.leadGenForm = 'Lead gen form is required.';
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
    leadGenForm: state.leadGenForm,
    leadGenFormId: state.leadGenFormId,
    leadGenFormDraft: state.leadGenFormDraft,
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
        {options.map((option, index) => (
          <option key={`${option}-${index}`} value={option}>
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
  placeholder,
  multiline,
  rows
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helper?: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <label className="flex flex-col gap-2 md:col-span-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {multiline ? (
        <textarea
          className={`min-h-[96px] rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 ${
            error ? 'border-rose-400' : 'border-slate-200'
          }`}
          value={value}
          placeholder={placeholder}
          rows={rows}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className={`rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 ${
            error ? 'border-rose-400' : 'border-slate-200'
          }`}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
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

function LeadGenInfoGrid({ info }: { info: LeadGenFormDraft }) {
  const entries = [
    { label: 'Phase', value: info.phase },
    { label: 'Image ID', value: info.imageId },
    { label: 'Image Link', value: info.imageLink },
    { label: 'Title', value: info.title },
    { label: 'Detail', value: info.detail },
    { label: 'Thank You Message', value: info.thankYouMessage },
    { label: 'CTA', value: info.cta },
    { label: 'Target Link', value: info.targetLink }
  ];

  return (
    <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {entries.map(({ label, value }) => (
        <div key={label} className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
          <dd className="text-sm text-slate-800 break-words">
            {value && String(value).trim() ? (
              label.toLowerCase().includes('link') ? (
                <a href={value} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                  {value}
                </a>
              ) : (
                value
              )
            ) : (
              '—'
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
