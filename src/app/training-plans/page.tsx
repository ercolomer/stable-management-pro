"use client"; // This page uses client-side components like TrainingPlanForm

import { useTranslations } from 'next-intl';
import TrainingPlanForm from "@/components/training/training-plan-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

export default function TrainingPlansPage() {
  const t = useTranslations('training');

  return (
    <div className="container mx-auto py-8 space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center gap-2">
            <Lightbulb className="h-8 w-8 text-primary" />
            {t('suggestPlan')}
          </CardTitle>
          <CardDescription>
            {t('suggestPlanDescription')}
            {t('apiKeyRequired')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TrainingPlanForm />
        </CardContent>
      </Card>
    </div>
  );
}
