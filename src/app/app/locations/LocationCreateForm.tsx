"use client";

import { useFormState } from "react-dom";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
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
      <FormField label="ロケーション名" required>
        <Input
          name="name"
          placeholder="例: TEPPEN 渋谷"
          disabled={isDisabled}
          required
        />
      </FormField>
      <FormField label="住所">
        <Input
          name="address"
          placeholder="例: 東京都渋谷区渋谷1-2-3"
          disabled={isDisabled}
        />
      </FormField>
      <div className="grid gap-3 md:grid-cols-2">
        <FormField label="緯度">
          <Input
            name="latitude"
            type="number"
            step="any"
            placeholder="例: 35.6595"
            disabled={isDisabled}
          />
        </FormField>
        <FormField label="経度">
          <Input
            name="longitude"
            type="number"
            step="any"
            placeholder="例: 139.7005"
            disabled={isDisabled}
          />
        </FormField>
      </div>
      <p className="text-sm text-slate-500">
        住所・緯度・経度は任意です。未入力でも作成できます。
      </p>
      {state.error && (
        <p className="text-sm font-semibold text-rose-600">{state.error}</p>
      )}
      {disabledReason && (
        <p className="text-sm text-slate-500">{disabledReason}</p>
      )}
      <Button type="submit" className="w-full" disabled={isDisabled}>
        新規作成
      </Button>
    </form>
  );
}
