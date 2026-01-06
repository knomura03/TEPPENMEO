"use client";

import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createLocationAction,
  type CreateLocationState,
} from "@/server/actions/locations";

const initialState: CreateLocationState = { error: null };

type LocationCreateFormProps = {
  disabledReason?: string | null;
};

export function LocationCreateForm({ disabledReason }: LocationCreateFormProps) {
  const [state, action] = useFormState(createLocationAction, initialState);
  const isDisabled = Boolean(disabledReason);

  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-700">
          ロケーション名
        </label>
        <Input
          name="name"
          placeholder="例: TEPPEN 渋谷"
          disabled={isDisabled}
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-700">住所</label>
        <Input
          name="address"
          placeholder="例: 東京都渋谷区渋谷1-2-3"
          disabled={isDisabled}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">緯度</label>
          <Input
            name="latitude"
            type="number"
            step="any"
            placeholder="例: 35.6595"
            disabled={isDisabled}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">経度</label>
          <Input
            name="longitude"
            type="number"
            step="any"
            placeholder="例: 139.7005"
            disabled={isDisabled}
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        住所・緯度・経度は任意です。未入力でも作成できます。
      </p>
      {state.error && (
        <p className="text-xs font-semibold text-rose-600">{state.error}</p>
      )}
      {disabledReason && (
        <p className="text-xs text-slate-500">{disabledReason}</p>
      )}
      <Button type="submit" className="w-full" disabled={isDisabled}>
        新規作成
      </Button>
    </form>
  );
}
