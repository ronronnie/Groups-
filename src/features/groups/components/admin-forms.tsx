"use client";

import { useActionState, useId, type ReactNode } from "react";
import {
  Archive,
  Flag,
  RotateCcw,
  Save,
  Shield,
  UserMinus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  canManageMember,
  reportReasons,
  reportReasonLabels,
  type GroupSettings,
} from "@/domains/groups/admin";
import { groupAdminAction } from "@/server/groups/admin-actions";
import type {
  ManagedMember,
  ModerationContent,
} from "@/server/groups/admin-service";

const selectClass =
  "min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
function ActionForm({
  children,
  action,
  groupId,
  submitLabel,
  icon,
  destructive = false,
}: {
  children?: ReactNode;
  action: string;
  groupId: string;
  submitLabel: string;
  icon?: ReactNode;
  destructive?: boolean;
}) {
  const [state, submit, pending] = useActionState(groupAdminAction, {
    error: null,
    success: null,
  });
  return (
    <form action={submit} className="space-y-3">
      <input type="hidden" name="action" value={action} />
      <input type="hidden" name="groupId" value={groupId} />
      <fieldset disabled={pending} className="min-w-0 space-y-3">
        {children}
        <Button
          type="submit"
          size="sm"
          variant={destructive ? "destructive" : "outline"}
          disabled={pending}
        >
          {icon}
          {pending ? "Saving..." : submitLabel}
        </Button>
      </fieldset>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="text-sm text-success">
          {state.success}
        </p>
      )}
    </form>
  );
}

export function GroupSettingsForm({
  groupId,
  name,
  settings,
}: {
  groupId: string;
  name: string;
  settings: GroupSettings;
}) {
  return (
    <ActionForm
      action="settings"
      groupId={groupId}
      submitLabel="Save settings"
      icon={<Save className="size-4" aria-hidden="true" />}
    >
      <label className="block space-y-2 font-secondary text-sm font-bold">
        Group name
        <Input
          name="name"
          defaultValue={name}
          minLength={2}
          maxLength={80}
          required
        />
      </label>
      <p className="text-sm text-muted-foreground">
        Engine: Jobs &amp; Referrals (fixed)
      </p>
      <div className="space-y-3 border-t pt-4">
        <h3 className="text-lg font-bold">Invitations</h3>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="invitesEnabled"
            defaultChecked={settings.invitesEnabled}
          />
          Accept new joins through invite links
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="allowMemberInvites"
            defaultChecked={settings.allowMemberInvites}
          />
          Allow members to create invite links
        </label>
      </div>
      <div className="space-y-3 border-t pt-4">
        <h3 className="text-lg font-bold">Profile privacy</h3>
        <label className="block space-y-2 text-sm">
          Profile details in this group
          <select
            name="defaultProfileVisibility"
            className={selectClass}
            defaultValue={settings.defaultProfileVisibility}
          >
            <option value="members">Member-shared details</option>
            <option value="private">Names only</option>
          </select>
        </label>
        <p className="font-secondary text-sm text-muted-foreground">
          Private profiles and application trackers remain private.
        </p>
      </div>
      <div className="space-y-3 border-t pt-4">
        <h3 className="text-lg font-bold">Notification defaults</h3>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="jobNotificationsDefault"
            defaultChecked={settings.jobNotificationsDefault}
          />
          Job activity
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="groupNotificationsDefault"
            defaultChecked={settings.groupNotificationsDefault}
          />
          Group activity
        </label>
        <label className="block space-y-2 text-sm">
          Digest cadence
          <select
            name="digestCadenceDefault"
            className={selectClass}
            defaultValue={settings.digestCadenceDefault}
          >
            <option value="off">Off</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>
        <p className="font-secondary text-sm text-muted-foreground">
          Members&apos; saved notification preferences take priority.
        </p>
      </div>
    </ActionForm>
  );
}

export function MemberControls({
  groupId,
  actorId,
  actorRole,
  member,
}: {
  groupId: string;
  actorId: string;
  actorRole: "owner" | "admin";
  member: ManagedMember;
}) {
  if (
    member.status !== "active" ||
    !canManageMember(actorRole, member.role, actorId === member.userId)
  )
    return null;
  return (
    <details className="text-sm">
      <summary className="cursor-pointer py-2 font-bold">
        Manage {member.name}
      </summary>
      <div className="grid gap-6 py-3 sm:grid-cols-2">
        {actorRole === "owner" && (
          <ActionForm
            action="role"
            groupId={groupId}
            submitLabel="Change role"
            icon={<Shield className="size-4" aria-hidden="true" />}
          >
            <input type="hidden" name="memberId" value={member.userId} />
            <label className="block space-y-2">
              Role for {member.name}
              <select
                className={selectClass}
                name="role"
                defaultValue={member.role}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          </ActionForm>
        )}
        <ActionForm
          action="remove"
          groupId={groupId}
          submitLabel="Remove member"
          destructive
          icon={<UserMinus className="size-4" aria-hidden="true" />}
        >
          <input type="hidden" name="memberId" value={member.userId} />
          <label className="flex items-start gap-3">
            <input className="mt-1" type="checkbox" name="confirm" required />
            Remove {member.name}&apos;s access and block rejoining through
            invites.
          </label>
        </ActionForm>
      </div>
    </details>
  );
}

export function ModerationControl({
  groupId,
  content,
}: {
  groupId: string;
  content: ModerationContent;
}) {
  return (
    <ActionForm
      action="moderate"
      groupId={groupId}
      submitLabel={
        content.hidden
          ? "Restore"
          : content.targetType === "message"
            ? "Hide message"
            : "Archive share"
      }
      icon={
        content.hidden ? (
          <RotateCcw className="size-4" aria-hidden="true" />
        ) : (
          <Archive className="size-4" aria-hidden="true" />
        )
      }
    >
      <input type="hidden" name="targetType" value={content.targetType} />
      <input type="hidden" name="targetId" value={content.id} />
      <input type="hidden" name="hidden" value={String(!content.hidden)} />
      <label className="block space-y-2 text-sm">
        Reason
        <Input name="reason" required minLength={3} maxLength={300} />
      </label>
    </ActionForm>
  );
}

export function DismissReportForm({
  groupId,
  reportId,
}: {
  groupId: string;
  reportId: string;
}) {
  return (
    <ActionForm
      action="dismiss"
      groupId={groupId}
      submitLabel="Dismiss report"
      icon={<X className="size-4" aria-hidden="true" />}
    >
      <input type="hidden" name="reportId" value={reportId} />
    </ActionForm>
  );
}

export function ReportContentForm({
  groupId,
  targetId,
  targetType,
}: {
  groupId: string;
  targetId: string;
  targetType: "job_share" | "message";
}) {
  const id = useId();
  return (
    <details className="mt-3 text-sm">
      <summary className="w-fit cursor-pointer text-muted-foreground">
        <Flag className="mr-1 inline size-3.5" aria-hidden="true" />
        Report
      </summary>
      <div className="max-w-md py-3">
        <ActionForm
          action="report"
          groupId={groupId}
          submitLabel="Send report"
          icon={<Flag className="size-4" aria-hidden="true" />}
        >
          <input type="hidden" name="targetId" value={targetId} />
          <input type="hidden" name="targetType" value={targetType} />
          <label htmlFor={id} className="block">
            Reason
          </label>
          <select
            id={id}
            name="reason"
            className={selectClass}
            defaultValue="off_topic"
          >
            {reportReasons.map((reason) => (
              <option key={reason} value={reason}>
                {reportReasonLabels[reason]}
              </option>
            ))}
          </select>
          <label className="block space-y-2">
            Details (optional)
            <Textarea name="details" maxLength={500} rows={2} />
          </label>
        </ActionForm>
      </div>
    </details>
  );
}
