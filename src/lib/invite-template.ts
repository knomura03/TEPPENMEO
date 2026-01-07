export const INVITE_LINK_STORAGE_KEY = "teppen_admin_last_invite_link";

type InviteTemplateInput = {
  organizationName?: string | null;
  inviteLink?: string | null;
  message?: string | null;
};

export function buildInviteTemplate(input: InviteTemplateInput): {
  subject: string;
  body: string;
} {
  const organizationName = input.organizationName?.trim() ?? "";
  const inviteLink = input.inviteLink?.trim() ?? "";
  const message = input.message?.trim() ?? "";

  const subject = organizationName
    ? `【TEPPEN MEO】${organizationName} 招待のご案内`
    : "【TEPPEN MEO】招待のご案内";

  const lines = [
    "TEPPEN MEOへの招待をご案内します。",
    organizationName
      ? `${organizationName}の運用メンバーとして招待されています。`
      : null,
    "",
    "以下の招待リンクから登録してください。",
    inviteLink ? `招待リンク: ${inviteLink}` : "招待リンク: （未入力）",
    "",
    message ? `管理者メッセージ: ${message}` : null,
    "※リンクは第三者に共有しないでください。",
    "※リンクが無効な場合は管理者に連絡してください。",
  ].filter((line) => line !== null);

  return { subject, body: lines.join("\n") };
}
