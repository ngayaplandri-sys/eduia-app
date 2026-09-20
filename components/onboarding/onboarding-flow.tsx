"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { SCHOOL_LEVELS } from "@/lib/config/levels";
import { SUBJECTS } from "@/lib/config/tool-options";
import {
  ONBOARDING_GOALS,
  LEARNING_STYLES,
} from "@/lib/config/onboarding";
import { saveOnboarding } from "@/lib/actions/onboarding";
import { firstName as extractFirstName } from "@/lib/utils/format";
import { useI18n } from "@/lib/i18n/client";
import { localizeLevel, localizeSubject } from "@/lib/i18n/labels";
import type { OnboardingAnswers } from "@/types";
import { OnboardingProgressBar } from "./progress-bar";
import { ChoiceButton } from "./choice-button";

const TOTAL_STEPS = 6;

function toggleInArray(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function StepShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-title-sm font-bold text-ink-900">{title}</h2>
        <p className="mt-1 text-sm text-ink-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function OnboardingFlow({ userName }: { userName: string }) {
  const { toast } = useToast();
  const { dict } = useI18n();
  const t = dict.onboarding;
  const [step, setStep] = React.useState(1);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  const [answers, setAnswers] = React.useState<OnboardingAnswers>({
    firstName: extractFirstName(userName),
    schoolLevel: "",
    subjects: [],
    goal: "",
    improveSubjects: [],
    learningStyle: "",
  });

  const canProceed = React.useMemo(() => {
    switch (step) {
      case 1:
        return answers.firstName.trim().length > 0;
      case 2:
        return answers.schoolLevel !== "";
      case 3:
        return answers.subjects.length > 0;
      case 4:
        return answers.goal !== "";
      case 5:
        return answers.improveSubjects.length > 0;
      case 6:
        return answers.learningStyle !== "";
      default:
        return false;
    }
  }, [step, answers]);

  function goNext() {
    if (!canProceed || pending) return;

    if (step < TOTAL_STEPS) {
      setStep((current) => current + 1);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await saveOnboarding(answers);
      if (result?.error) {
        setError(result.error);
        toast(result.error);
      }
    });
  }

  function goBack() {
    setError(null);
    setStep((current) => Math.max(1, current - 1));
  }

  const improveSubjectOptions =
    answers.subjects.length > 0 ? answers.subjects : SUBJECTS;

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-6 flex flex-col items-center text-center">
        <BrandLogo withTagline={false} />
        <h1 className="mt-4 text-xl font-extrabold tracking-[-0.02em] text-ink-900">
          {t.header}
        </h1>
        <p className="mt-1 text-sm text-ink-500">{t.subheader}</p>
      </div>

      <Card className="p-5 sm:p-7">
        <OnboardingProgressBar step={step} total={TOTAL_STEPS} />

        <div className="mt-7 min-h-[17rem]">
          {step === 1 ? (
            <StepShell title={t.step1Title} description={t.step1Desc}>
              <Field label={t.firstName} htmlFor="onboarding-first-name">
                <Input
                  id="onboarding-first-name"
                  autoFocus
                  value={answers.firstName}
                  onChange={(e) =>
                    setAnswers((a) => ({ ...a, firstName: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canProceed) goNext();
                  }}
                  placeholder={t.firstNamePlaceholder}
                />
              </Field>
            </StepShell>
          ) : null}

          {step === 2 ? (
            <StepShell title={t.step2Title} description={t.step2Desc}>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {SCHOOL_LEVELS.map((level) => (
                  <ChoiceButton
                    key={level}
                    variant="pill"
                    label={localizeLevel(level, dict)}
                    selected={answers.schoolLevel === level}
                    onClick={() =>
                      setAnswers((a) => ({ ...a, schoolLevel: level }))
                    }
                  />
                ))}
              </div>
            </StepShell>
          ) : null}

          {step === 3 ? (
            <StepShell title={t.step3Title} description={t.step3Desc}>
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map((subject) => (
                  <ChoiceButton
                    key={subject}
                    variant="pill"
                    label={localizeSubject(subject, dict)}
                    selected={answers.subjects.includes(subject)}
                    onClick={() =>
                      setAnswers((a) => {
                        const nextSubjects = toggleInArray(a.subjects, subject);
                        return {
                          ...a,
                          subjects: nextSubjects,
                          improveSubjects: a.improveSubjects.filter((s) =>
                            nextSubjects.includes(s),
                          ),
                        };
                      })
                    }
                  />
                ))}
              </div>
            </StepShell>
          ) : null}

          {step === 4 ? (
            <StepShell title={t.step4Title} description={t.step4Desc}>
              <div className="space-y-2.5">
                {ONBOARDING_GOALS.map((goal) => (
                  <ChoiceButton
                    key={goal.id}
                    label={t.goals[goal.id].label}
                    description={t.goals[goal.id].description}
                    icon={goal.icon}
                    selected={answers.goal === goal.id}
                    onClick={() => setAnswers((a) => ({ ...a, goal: goal.id }))}
                  />
                ))}
              </div>
            </StepShell>
          ) : null}

          {step === 5 ? (
            <StepShell title={t.step5Title} description={t.step5Desc}>
              <div className="flex flex-wrap gap-2">
                {improveSubjectOptions.map((subject) => (
                  <ChoiceButton
                    key={subject}
                    variant="pill"
                    label={localizeSubject(subject, dict)}
                    selected={answers.improveSubjects.includes(subject)}
                    onClick={() =>
                      setAnswers((a) => ({
                        ...a,
                        improveSubjects: toggleInArray(
                          a.improveSubjects,
                          subject,
                        ),
                      }))
                    }
                  />
                ))}
              </div>
            </StepShell>
          ) : null}

          {step === 6 ? (
            <StepShell title={t.step6Title} description={t.step6Desc}>
              <div className="space-y-2.5">
                {LEARNING_STYLES.map((style) => (
                  <ChoiceButton
                    key={style.id}
                    label={t.styles[style.id].label}
                    description={t.styles[style.id].description}
                    icon={style.icon}
                    selected={answers.learningStyle === style.id}
                    onClick={() =>
                      setAnswers((a) => ({ ...a, learningStyle: style.id }))
                    }
                  />
                ))}
              </div>
            </StepShell>
          ) : null}
        </div>

        {error ? (
          <p className="mt-5 rounded-lg bg-danger-50 px-3 py-2 text-fine font-medium text-danger-600">
            {error}
          </p>
        ) : null}

        <div className="mt-7 flex items-center justify-between gap-3 border-t border-line-soft pt-5">
          <Button
            type="button"
            variant="ghost"
            onClick={goBack}
            disabled={step === 1 || pending}
            className={step === 1 ? "invisible" : undefined}
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t.back}
          </Button>

          <Button type="button" onClick={goNext} disabled={!canProceed || pending}>
            {pending ? t.saving : step === TOTAL_STEPS ? t.finish : t.next}
            {pending ? null : step === TOTAL_STEPS ? (
              <Sparkles className="size-4" aria-hidden />
            ) : (
              <ArrowRight className="size-4" aria-hidden />
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
