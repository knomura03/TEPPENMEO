"use client";

import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  replyReviewFromInboxAction,
  type InboxReplyState,
} from "@/server/actions/reviews-inbox";

type UiError = {
  cause: string;
  nextAction: string;
};

const initialState: InboxReplyState = { error: null, success: null };

function ErrorBox({ error }: { error: UiError }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
      <p className="font-semibold">原因</p>
      <p>{error.cause}</p>
      <p className="mt-2 font-semibold">次にやること</p>
      <p>{error.nextAction}</p>
    </div>
  );
}

function SuccessBox({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
      {message}
    </div>
  );
}

export function ReviewInboxReplyForm(props: {
  locationId: string;
  reviewId: string;
  canEdit: boolean;
  existingReply?: { replyText: string; createdAt: string } | null;
}) {
  const [state, action] = useFormState(replyReviewFromInboxAction, initialState);

  if (props.existingReply) {
    return (
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <p className="font-semibold text-slate-700">返信済み</p>
        <p className="mt-2 whitespace-pre-wrap">
          {props.existingReply.replyText}
        </p>
        <p className="mt-2 text-[11px] text-slate-500">
          返信日時: {props.existingReply.createdAt}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="locationId" value={props.locationId} />
      <input type="hidden" name="reviewId" value={props.reviewId} />
      <textarea
        name="replyText"
        rows={3}
        placeholder="返信内容を入力"
        className="w-full rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-700 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
        disabled={!props.canEdit}
      />
      {state.error && <ErrorBox error={state.error} />}
      {state.success && <SuccessBox message={state.success} />}
      <Button type="submit" className="w-full" disabled={!props.canEdit}>
        返信を送信
      </Button>
    </form>
  );
}
