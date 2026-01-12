"use client";

import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import { replyGoogleReviewAction, type ActionState } from "@/server/actions/google-business-profile";

type UiError = {
  cause: string;
  nextAction: string;
};

const initialState: ActionState = { error: null, success: null };

function ErrorBox({ error }: { error: UiError }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="font-semibold">原因</p>
      <p>{error.cause}</p>
      <p className="mt-2 font-semibold">次にやること</p>
      <p>{error.nextAction}</p>
    </div>
  );
}

function SuccessBox({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
      {message}
    </div>
  );
}

export function ReviewReplyForm(props: {
  locationId: string;
  reviewId: string;
  canEdit: boolean;
  existingReply?: { replyText: string; createdAt: string } | null;
}) {
  const [state, action] = useFormState(replyGoogleReviewAction, initialState);

  if (props.existingReply) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        <p className="font-semibold text-slate-700">返信済み</p>
        <p className="mt-2 whitespace-pre-wrap">
          {props.existingReply.replyText}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          返信日時: {props.existingReply.createdAt}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="locationId" value={props.locationId} />
      <input type="hidden" name="reviewId" value={props.reviewId} />
      <FormField label="返信内容" required>
        <Textarea
          name="replyText"
          rows={3}
          placeholder="返信内容を入力"
          disabled={!props.canEdit}
        />
      </FormField>
      {state.error && <ErrorBox error={state.error} />}
      {state.success && <SuccessBox message={state.success} />}
      <Button type="submit" className="w-full" disabled={!props.canEdit}>
        返信を送信
      </Button>
    </form>
  );
}
