import { FormEvent, useEffect, useState } from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { useAuth } from "@hooks/useAuth";
import { Select, useSiteDialog } from "@components/common";
import {
  getBusiness,
  listBusinesses,
  type Business,
} from "@api/modules/businesses.api";
import { reauthenticateRequest } from "@api/modules/auth.api";
import {
  activateMpesaConfiguration,
  disablePaymentPilotBusiness,
  enablePaymentPilotBusiness,
  getBusinessPaymentBranches,
  getMpesaConfiguration,
  getPaymentAudit,
  getPaymentRollout,
  saveMpesaConfiguration,
  suspendMpesaConfiguration,
  testMpesaConfiguration,
  updatePaymentRollout,
  type MpesaConfiguration,
  type MpesaProviderAccount,
  type PaymentRolloutStatus,
} from "@api/modules/platformPayments.api";

const panel = "rounded-2xl border border-border bg-white shadow-sm";
const input =
  "mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";
const primary =
  "rounded-xl bg-primary-dark px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const secondary =
  "rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-text-secondary transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-50";

const emptyForm: MpesaConfiguration = {
  environment: "sandbox",
  merchant_type: "paybill",
  shortcode: "",
  transaction_type: "CustomerPayBillOnline",
  reason: "",
};

const errorText = (error: unknown) => {
  if (typeof error === "object" && error && "response" in error) {
    const response = (
      error as { response?: { data?: { message?: unknown; detail?: unknown } } }
    ).response;
    const detail = response?.data?.detail;
    const detailMessage =
      typeof detail === "object" && detail && "message" in detail
        ? (detail as { message?: unknown }).message
        : detail;
    return typeof response?.data?.message === "string"
      ? response.data.message
      : typeof detailMessage === "string"
        ? detailMessage
        : "The request could not be completed.";
  }
  return error instanceof Error
    ? error.message
    : "The request could not be completed.";
};

const requiresReauthentication = (error: unknown) => {
  if (typeof error !== "object" || !error || !("response" in error))
    return false;
  const response = (
    error as { response?: { status?: number; data?: Record<string, unknown> } }
  ).response;
  const data = response?.data;
  const detail = data?.detail;
  return (
    data?.reauthentication_required === true ||
    (typeof detail === "object" &&
      detail !== null &&
      (detail as Record<string, unknown>).reauthentication_required === true) ||
    (response?.status === 403 &&
      errorText(error).toLowerCase().includes("recent authentication"))
  );
};

function BusinessMpesaRow({
  business,
  account,
  accountLoading,
  onOpen,
}: {
  business: Business;
  account?: MpesaProviderAccount;
  accountLoading: boolean;
  onOpen: (view: "account" | "configuration") => void;
}) {
  const providerAccount = account;

  return (
    <article className="px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-bold text-text">
              {business.display_name}
            </h3>
            {providerAccount && (
              <span className="rounded-full bg-success-light px-2.5 py-1 text-xs font-bold text-success-dark">
                Configured
              </span>
            )}
            {!providerAccount && !accountLoading && (
              <span className="rounded-full bg-background px-2.5 py-1 text-xs font-bold text-text-secondary">
                Not configured
              </span>
            )}
            {providerAccount && (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                  providerAccount.environment === "sandbox"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-success-light text-success-dark"
                }`}
              >
                {providerAccount.environment}
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-text-secondary">
            {business.legal_name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {accountLoading ? (
            <button className={secondary} disabled>
              Checking configuration…
            </button>
          ) : providerAccount ? (
            <>
              <button className={secondary} onClick={() => onOpen("account")}>
                View configuration
              </button>
              <button
                className={primary}
                onClick={() => onOpen("configuration")}
              >
                Update
              </button>
            </>
          ) : (
            <button
              className={primary}
              onClick={() => onOpen("configuration")}
            >
              Configure M-Pesa
            </button>
          )}
        </div>
      </div>

      {providerAccount ? (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Account status", providerAccount.status.replace(/_/g, " ")],
            [
              "Merchant",
              `${providerAccount.merchant_type === "till" ? "Till / Buy Goods" : "PayBill"} · ${providerAccount.shortcode}`,
            ],
            ["Transaction type", providerAccount.transaction_type],
            [
              "Credentials",
              providerAccount.credentials_configured
                ? `Configured · v${providerAccount.credential_version}`
                : "Not configured",
            ],
            [
              "Last connection test",
              providerAccount.last_test_status
                ? `${providerAccount.last_test_status}${
                    providerAccount.last_tested_at
                      ? ` · ${new Date(providerAccount.last_tested_at).toLocaleDateString()}`
                      : ""
                  }`
                : "Not tested",
            ],
          ].map(([label, value]) => (
            <div className="rounded-xl bg-background p-3" key={label}>
              <dt className="text-xs text-text-tertiary">{label}</dt>
              <dd className="mt-1 break-words font-semibold capitalize text-text">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        !accountLoading && (
          <p className="mt-3 text-sm text-text-tertiary">
            No M-Pesa account has been configured for this business.
          </p>
        )
      )}
    </article>
  );
}

type PlatformMpesaPageProps = {
  accountScope?: "system" | "business";
};

export default function PlatformMpesaPage({
  accountScope,
}: PlatformMpesaPageProps) {
  const { id: routeBusinessId } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const dialog = useSiteDialog();
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<"system" | "business">(
    accountScope ?? (routeBusinessId ? "business" : "system"),
  );
  const [businessId, setBusinessId] = useState(
    routeBusinessId ?? searchParams.get("business") ?? "",
  );
  const [businessSearch, setBusinessSearch] = useState("");
  const [form, setForm] = useState<MpesaConfiguration>(emptyForm);
  const selectedBusinessId = scope === "business" ? businessId || null : null;
  const requestedView = searchParams.get("view");
  const view =
    requestedView === "configuration" ||
    requestedView === "rollout" ||
    requestedView === "activity"
      ? requestedView
      : "account";
  const activeView =
    scope === "business" && view === "rollout" ? "account" : view;
  const isBusinessConfigurationModal =
    accountScope === "business" &&
    scope === "business" &&
    activeView === "configuration" &&
    Boolean(businessId);

  const openView = (
    nextView: "account" | "configuration" | "rollout" | "activity",
  ) => {
    const next = new URLSearchParams(searchParams);
    if (nextView === "account") next.delete("view");
    else next.set("view", nextView);
    setSearchParams(next);
  };

  const changeScope = (nextScope: "system" | "business") => {
    setScope(nextScope);
    if (nextScope === "business" && view === "rollout") openView("account");
  };

  const selectBusiness = (
    id: string,
    nextView: "account" | "configuration" = "configuration",
  ) => {
    setBusinessId(id);
    const next = new URLSearchParams(searchParams);
    next.set("business", id);
    if (nextView === "account") next.delete("view");
    else next.set("view", nextView);
    setSearchParams(next);
  };

  const clearBusiness = () => {
    setBusinessId("");
    const next = new URLSearchParams(searchParams);
    next.delete("business");
    next.set("view", "configuration");
    setSearchParams(next);
  };

  useEffect(() => {
    if (!isBusinessConfigurationModal) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") clearBusiness();
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [isBusinessConfigurationModal]);

  useEffect(() => {
    if (routeBusinessId) {
      setScope("business");
      setBusinessId(routeBusinessId);
    }
  }, [routeBusinessId]);

  useEffect(() => {
    if (accountScope) setScope(accountScope);
  }, [accountScope]);

  const businesses = useQuery({
    queryKey: ["platform-businesses-for-payments"],
    queryFn: () => listBusinesses(),
    enabled: hasPermission("platform.payments.read"),
  });
  const businessAccountQueries = useQueries({
    queries: (businesses.data ?? []).map((item) => ({
      queryKey: ["platform-mpesa", "business", item.public_id],
      queryFn: () => getMpesaConfiguration(item.public_id),
      enabled:
        accountScope === "business" &&
        hasPermission("platform.payments.read"),
      retry: false,
    })),
  });
  const businessAccounts = new Map(
    (businesses.data ?? []).map((item, index) => [
      item.public_id,
      businessAccountQueries[index]?.data,
    ]),
  );
  const configuredBusinessCount = [...businessAccounts.values()].filter(
    Boolean,
  ).length;
  const account = useQuery({
    queryKey: ["platform-mpesa", scope, selectedBusinessId],
    queryFn: () => getMpesaConfiguration(selectedBusinessId),
    enabled: scope === "system" || Boolean(selectedBusinessId),
    retry: false,
  });
  const business = useQuery({
    queryKey: ["platform-business-payment-detail", selectedBusinessId],
    queryFn: () => getBusiness(selectedBusinessId!),
    enabled: Boolean(selectedBusinessId),
  });
  const branches = useQuery({
    queryKey: ["platform-business-payment-branches", selectedBusinessId],
    queryFn: () => getBusinessPaymentBranches(selectedBusinessId!),
    enabled: Boolean(selectedBusinessId),
  });
  const audit = useQuery({
    queryKey: ["platform-payment-audit", selectedBusinessId],
    queryFn: () => getPaymentAudit(selectedBusinessId),
  });
  const rollout = useQuery({
    queryKey: ["platform-payment-rollout"],
    queryFn: getPaymentRollout,
    enabled: scope === "system" && hasPermission("platform.payments.read"),
  });

  useEffect(() => {
    if (!account.data) {
      setForm(emptyForm);
      return;
    }
    setForm({
      environment: account.data.environment,
      merchant_type: account.data.merchant_type,
      shortcode: "",
      transaction_type: account.data.transaction_type,
      reason: "",
    });
  }, [account.data, scope, selectedBusinessId]);

  const refresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["platform-mpesa", scope, selectedBusinessId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["platform-payment-audit", selectedBusinessId],
    });
  };
  const runSensitive = async <T,>(operation: () => Promise<T>): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      if (!requiresReauthentication(error)) throw error;
      const password = await dialog.prompt({
        title: "Confirm your identity",
        message:
          "Enter your account password to authorize sensitive payment changes for the next 10 minutes.",
        inputLabel: "Password",
        inputType: "password",
        trim: false,
        minLength: 1,
        maxLength: 1024,
        confirmLabel: "Continue",
      });
      if (password === null) throw error;
      await reauthenticateRequest(password);
      return operation();
    }
  };
  const save = useMutation({
    mutationFn: (payload: MpesaConfiguration) =>
      runSensitive(() => saveMpesaConfiguration(payload, selectedBusinessId)),
    onSuccess: async () => {
      setForm((current) => ({
        ...current,
        consumer_key: "",
        consumer_secret: "",
        passkey: "",
        reason: "",
      }));
      await refresh();
      await dialog.alert({
        title: "Configuration saved",
        message:
          "Credentials remain write-only. Test this account before activation.",
      });
      if (accountScope === "business") clearBusiness();
    },
  });
  const test = useMutation({
    mutationFn: () =>
      runSensitive(() => testMpesaConfiguration(selectedBusinessId)),
    onSuccess: refresh,
  });
  const activate = useMutation({
    mutationFn: (reason: string) =>
      runSensitive(() =>
        activateMpesaConfiguration(reason, selectedBusinessId),
      ),
    onSuccess: refresh,
  });
  const suspend = useMutation({
    mutationFn: (reason: string) =>
      runSensitive(() => suspendMpesaConfiguration(reason, selectedBusinessId)),
    onSuccess: refresh,
  });
  const refreshRollout = () =>
    queryClient.invalidateQueries({ queryKey: ["platform-payment-rollout"] });
  const changeRollout = useMutation({
    mutationFn: ({
      mode,
      reason,
    }: {
      mode: PaymentRolloutStatus["online_mode"];
      reason: string;
    }) => runSensitive(() => updatePaymentRollout(mode, reason)),
    onSuccess: refreshRollout,
  });
  const addPilot = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      runSensitive(() => enablePaymentPilotBusiness(id, reason)),
    onSuccess: refreshRollout,
  });
  const removePilot = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      runSensitive(() => disablePaymentPilotBusiness(id, reason)),
    onSuccess: refreshRollout,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const secrets = [
      form.consumer_key,
      form.consumer_secret,
      form.passkey,
    ].filter(Boolean);
    if (secrets.length > 0 && secrets.length < 3) {
      void dialog.alert({
        title: "Complete the credential set",
        message:
          "Consumer key, consumer secret, and passkey must be entered together.",
      });
      return;
    }
    save.mutate({
      ...form,
      shortcode: form.shortcode?.trim() || undefined,
      consumer_key: form.consumer_key || undefined,
      consumer_secret: form.consumer_secret || undefined,
      passkey: form.passkey || undefined,
      reason: form.reason.trim(),
    });
  };

  const requestReason = async (action: "activate" | "suspend") => {
    const reason = await dialog.prompt({
      title:
        action === "activate"
          ? "Activate M-Pesa account"
          : "Suspend M-Pesa account",
      message:
        action === "activate"
          ? "Confirm why this tested account should start processing payments."
          : "Payments using this account will stop immediately.",
      inputLabel: "Audit reason",
      minLength: 3,
      maxLength: 500,
      confirmLabel:
        action === "activate" ? "Activate account" : "Suspend account",
      tone: action === "suspend" ? "danger" : "default",
    });
    if (!reason) return;
    if (action === "activate") activate.mutate(reason);
    else suspend.mutate(reason);
  };

  const requestRolloutMode = async (
    mode: PaymentRolloutStatus["online_mode"],
  ) => {
    const reason = await dialog.prompt({
      title: "Change online M-Pesa audience",
      message: `Move online checkout to “${mode}”. This affects who can start new payments immediately.`,
      inputLabel: "Audit and rollout reason",
      minLength: 3,
      maxLength: 500,
      confirmLabel: "Change audience",
      tone: mode === "disabled" ? "danger" : "default",
    });
    if (reason) changeRollout.mutate({ mode, reason });
  };

  const requestPilot = async (id: string, enabled: boolean) => {
    const reason = await dialog.prompt({
      title: enabled ? "Add pilot business" : "Remove pilot business",
      message: enabled
        ? "Customers may use online M-Pesa for this seller while pilot mode is active."
        : "New online M-Pesa attempts for this seller will stop in pilot mode.",
      inputLabel: "Audit reason",
      minLength: 3,
      maxLength: 500,
      confirmLabel: enabled ? "Add to pilot" : "Remove from pilot",
      tone: enabled ? "default" : "danger",
    });
    if (!reason) return;
    if (enabled) addPilot.mutate({ id, reason });
    else removePilot.mutate({ id, reason });
  };

  const current = account.data;
  const visibleBusinesses = (businesses.data ?? []).filter((item) => {
    const term = businessSearch.trim().toLowerCase();
    if (!term) return true;
    return [item.display_name, item.legal_name, item.status]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
  });
  const busy =
    save.isPending || test.isPending || activate.isPending || suspend.isPending;
  const actionError =
    save.error ?? test.error ?? activate.error ?? suspend.error;

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-dark">
            Platform payments
          </p>
          <h1 className="mt-1 text-3xl font-bold text-text">
            {scope === "system"
              ? "System Online M-Pesa"
              : "Business POS M-Pesa"}
          </h1>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${current?.status === "active" ? "bg-success-light text-success-dark" : "bg-background text-text-secondary"}`}
        >
          {scope === "business" && accountScope && !businessId
            ? `${configuredBusinessCount} configured`
            : (current?.status ?? "Not configured")}
        </span>
      </header>

      {!routeBusinessId && !accountScope && (
        <section className={`${panel} p-4`}>
          <div className="flex flex-wrap gap-2">
            <button
              className={scope === "system" ? primary : secondary}
              onClick={() => changeScope("system")}
            >
              System online
            </button>
            <button
              className={scope === "business" ? primary : secondary}
              onClick={() => changeScope("business")}
            >
              Business POS
            </button>
          </div>
          {scope === "business" && (
            <label className="mt-4 block max-w-xl text-sm font-semibold text-text">
              Business
              <Select
                className={input}
                value={businessId}
                onChange={(event) => setBusinessId(event.target.value)}
              >
                <option value="">Select a business</option>
                {businesses.data?.map((business) => (
                  <option value={business.public_id} key={business.public_id}>
                    {business.display_name}
                  </option>
                ))}
              </Select>
            </label>
          )}
        </section>
      )}

      {scope === "business" && accountScope && (
        <section className={`${panel} overflow-hidden`}>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5">
            <div>
              <h2 className="text-lg font-bold text-text">
                Business M-Pesa accounts
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {businesses.data?.length ?? 0} businesses available
              </p>
            </div>
            <input
              className={`${input} mt-0 w-full sm:w-72`}
              type="search"
              placeholder="Search businesses"
              aria-label="Search businesses"
              value={businessSearch}
              onChange={(event) => setBusinessSearch(event.target.value)}
            />
          </div>
          {businesses.isPending && (
            <p role="status" className="p-5 text-sm text-text-secondary">
              Loading businesses…
            </p>
          )}
          <div className="divide-y divide-border">
            {visibleBusinesses.map((item) => (
              <BusinessMpesaRow
                key={item.public_id}
                business={item}
                account={businessAccounts.get(item.public_id)}
                accountLoading={
                  businessAccountQueries[
                    (businesses.data ?? []).findIndex(
                      (business) => business.public_id === item.public_id,
                    )
                  ]?.isPending ?? false
                }
                onOpen={(nextView) =>
                  selectBusiness(item.public_id, nextView)
                }
              />
            ))}
            {!businesses.isPending && visibleBusinesses.length === 0 && (
              <div className="p-10 text-center">
                <p className="font-semibold text-text">No businesses found</p>
                <p className="mt-1 text-sm text-text-secondary">
                  Try a different business name.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {(scope === "system" || businessId) && !isBusinessConfigurationModal && (
        <nav
          className={`${panel} flex gap-1 overflow-x-auto p-1.5`}
          aria-label="M-Pesa account sections"
        >
          {(
            [
              ["account", "Account"],
              ["configuration", current ? "Configuration" : "Set up account"],
              ...(scope === "system" ? [["rollout", "Online rollout"]] : []),
              ["activity", "Activity"],
            ] as Array<[typeof activeView, string]>
          ).map(([itemView, label]) => (
            <button
              key={itemView}
              className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition ${activeView === itemView ? "bg-primary-dark text-white shadow-sm" : "text-text-secondary hover:bg-background hover:text-text"}`}
              onClick={() => openView(itemView)}
            >
              {label}
            </button>
          ))}
        </nav>
      )}

      {scope === "system" && activeView === "rollout" && rollout.data && (
        <section className={`${panel} p-5 sm:p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary-dark">
                Controlled rollout
              </p>
              <h2 className="mt-1 text-xl font-bold text-text">
                Online payment audience
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-text-secondary">
                Provider activation and customer availability are separate.
                Start with internal users, then selected sellers, before general
                release.
              </p>
            </div>
            <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-bold uppercase text-primary-dark">
              {rollout.data.online_mode}
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            {(["disabled", "internal", "pilot", "all"] as const).map((mode) => (
              <button
                key={mode}
                className={
                  rollout.data?.online_mode === mode ? primary : secondary
                }
                disabled={
                  !hasPermission("platform.payments.activate") ||
                  changeRollout.isPending
                }
                onClick={() => void requestRolloutMode(mode)}
              >
                {mode === "disabled"
                  ? "Disabled"
                  : mode === "internal"
                    ? "Internal users"
                    : mode === "pilot"
                      ? "Pilot sellers"
                      : "All customers"}
              </button>
            ))}
          </div>
          {rollout.data.readiness && (
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {[
                [
                  "Reconciled",
                  rollout.data.readiness.reconciled ? "Yes" : "Action needed",
                ],
                ["Online paid", rollout.data.readiness.successful_online_total],
                [
                  "Ledger gross",
                  rollout.data.readiness.online_ledger_gross_total,
                ],
                [
                  "Open alerts",
                  String(rollout.data.readiness.open_operational_alerts),
                ],
              ].map(([label, value]) => (
                <div className="rounded-xl bg-background p-3" key={label}>
                  <p className="text-xs text-text-tertiary">{label}</p>
                  <p className="mt-1 font-bold text-text">{value}</p>
                </div>
              ))}
            </div>
          )}
          {rollout.data.online_mode === "pilot" && (
            <div className="mt-6 border-t border-border pt-5">
              <h3 className="font-bold text-text">Pilot businesses</h3>
              <div className="mt-3 flex gap-3">
                <Select
                  className={input}
                  value={businessId}
                  onChange={(event) => setBusinessId(event.target.value)}
                >
                  <option value="">Select business to add</option>
                  {businesses.data
                    ?.filter(
                      (item) =>
                        !rollout.data?.pilot_businesses.some(
                          (pilot) => pilot.business_id === item.public_id,
                        ),
                    )
                    .map((item) => (
                      <option value={item.public_id} key={item.public_id}>
                        {item.display_name}
                      </option>
                    ))}
                </Select>
                <button
                  className={primary}
                  disabled={!businessId || addPilot.isPending}
                  onClick={() => void requestPilot(businessId, true)}
                >
                  Add pilot
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {rollout.data.pilot_businesses.map((item) => (
                  <div
                    className="flex items-center justify-between rounded-xl bg-background p-3"
                    key={item.business_id}
                  >
                    <div>
                      <p className="font-semibold text-text">
                        {item.business_name}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        {item.reason}
                      </p>
                    </div>
                    <button
                      className={secondary}
                      disabled={removePilot.isPending}
                      onClick={() => void requestPilot(item.business_id, false)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {rollout.data.pilot_businesses.length === 0 && (
                  <p className="text-sm text-text-secondary">
                    No pilot businesses enabled.
                  </p>
                )}
              </div>
            </div>
          )}
          {(changeRollout.error || addPilot.error || removePilot.error) && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-error/5 p-3 text-sm text-error"
            >
              {errorText(
                changeRollout.error ?? addPilot.error ?? removePilot.error,
              )}
            </p>
          )}
        </section>
      )}

      {selectedBusinessId && business.data && !isBusinessConfigurationModal && (
        <section
          className={`${panel} flex flex-wrap items-center justify-between gap-4 p-5`}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary-dark">
              Business POS account
            </p>
            <h2 className="mt-1 text-xl font-bold text-text">
              {business.data.business.display_name}
            </h2>
            <p className="text-sm text-text-secondary">
              {business.data.business.legal_name} ·{" "}
              {business.data.business.status}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {accountScope === "business" && (
              <button className={secondary} onClick={clearBusiness}>
                Back to businesses
              </button>
            )}
            <Link
              className={secondary}
              to={`/platform/businesses?business=${selectedBusinessId}`}
            >
              View business
            </Link>
          </div>
        </section>
      )}

      {(scope === "system" || businessId) &&
        (activeView === "account" || activeView === "configuration") && (
          <div>
            {activeView === "account" && (
              <section className={`${panel} p-5 sm:p-6`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-text">
                      Account status
                    </h2>
                    <p className="mt-1 text-sm text-text-secondary">
                      Provider readiness and payment controls.
                    </p>
                  </div>
                  <button
                    className={secondary}
                    onClick={() => openView("configuration")}
                  >
                    {current ? "Edit configuration" : "Configure account"}
                  </button>
                </div>
                {account.isLoading && (
                  <p className="mt-5 text-sm text-text-secondary">
                    Loading configuration…
                  </p>
                )}
                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["Environment", current?.environment ?? "—"],
                    [
                      "Merchant",
                      current
                        ? `${current.merchant_type} · ${current.shortcode}`
                        : "—",
                    ],
                    [
                      "Credentials",
                      current?.credentials_configured
                        ? `Configured · v${current.credential_version}`
                        : "Not configured",
                    ],
                    [
                      "Connection test",
                      current?.last_test_status ?? "Not tested",
                    ],
                  ].map(([label, value]) => (
                    <div className="rounded-xl bg-background p-3" key={label}>
                      <dt className="text-xs text-text-tertiary">{label}</dt>
                      <dd className="mt-1 font-bold text-text">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-5 flex flex-wrap gap-3">
                  {hasPermission("platform.payments.test") && (
                    <button
                      disabled={!current || busy}
                      className={secondary}
                      onClick={() => test.mutate()}
                    >
                      {test.isPending ? "Testing…" : "Test connection"}
                    </button>
                  )}
                  {hasPermission("platform.payments.activate") && (
                    <button
                      disabled={
                        !current ||
                        current.last_test_status !== "passed" ||
                        busy
                      }
                      className={primary}
                      onClick={() => void requestReason("activate")}
                    >
                      Activate account
                    </button>
                  )}
                  {hasPermission("platform.payments.suspend") &&
                    current?.status === "active" && (
                      <button
                        disabled={busy}
                        className={secondary}
                        onClick={() => void requestReason("suspend")}
                      >
                        Suspend account
                      </button>
                    )}
                </div>
                <details className="mt-5 rounded-xl border border-border bg-background px-4 py-3">
                  <summary className="cursor-pointer text-sm font-bold text-text">
                    Callback and account details
                  </summary>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-text-tertiary">
                        Callback URL
                      </dt>
                      <dd className="mt-1 break-all font-semibold text-text">
                        {current?.callback_url ?? "Not configured"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-text-tertiary">
                        Default online account
                      </dt>
                      <dd className="mt-1 font-semibold text-text">
                        {current?.scope === "platform"
                          ? current.is_default
                            ? "Yes"
                            : "No"
                          : "Not applicable"}
                      </dd>
                    </div>
                  </dl>
                </details>
                {actionError && (
                  <p
                    role="alert"
                    className="mt-4 rounded-xl bg-error/5 p-3 text-sm text-error"
                  >
                    {errorText(actionError)}
                  </p>
                )}
              </section>
            )}

            {activeView === "configuration" && (
              <div
                className={
                  isBusinessConfigurationModal
                    ? "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-[2px] sm:p-6"
                    : undefined
                }
                role={isBusinessConfigurationModal ? "dialog" : undefined}
                aria-modal={isBusinessConfigurationModal ? true : undefined}
                aria-labelledby={
                  isBusinessConfigurationModal
                    ? "mpesa-configuration-title"
                    : undefined
                }
                onMouseDown={(event) => {
                  if (
                    isBusinessConfigurationModal &&
                    event.target === event.currentTarget
                  ) {
                    clearBusiness();
                  }
                }}
              >
                <section
                  className={`${panel} ${
                    isBusinessConfigurationModal
                      ? "max-h-[92vh] w-full max-w-3xl overflow-y-auto p-5 shadow-2xl sm:p-6"
                      : "p-5 sm:p-6"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <ShieldCheckIcon className="h-6 w-6 text-primary-dark" />
                      <div>
                        <h2
                          id="mpesa-configuration-title"
                          className="text-lg font-bold text-text"
                        >
                          {current
                            ? "Edit M-Pesa configuration"
                            : "Set up M-Pesa account"}
                        </h2>
                        <p className="mt-1 text-sm text-text-secondary">
                          {business.data?.business.display_name
                            ? `${business.data.business.display_name} · `
                            : ""}
                          Saved credentials remain hidden.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={secondary}
                      onClick={() =>
                        isBusinessConfigurationModal
                          ? clearBusiness()
                          : openView("account")
                      }
                    >
                      Cancel
                    </button>
                  </div>
                  {hasPermission("platform.payments.configure") ? (
                    <form
                      className="mt-6 grid gap-4 sm:grid-cols-2"
                      onSubmit={submit}
                    >
                      <label className="text-sm font-semibold text-text">
                        Environment
                        <Select
                          className={input}
                          value={form.environment}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              environment: event.target
                                .value as MpesaConfiguration["environment"],
                            })
                          }
                        >
                          <option value="sandbox">Sandbox</option>
                          <option value="production">Production</option>
                        </Select>
                      </label>
                      <label className="text-sm font-semibold text-text">
                        Merchant type
                        <Select
                          className={input}
                          value={form.merchant_type}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              merchant_type: event.target
                                .value as MpesaConfiguration["merchant_type"],
                            })
                          }
                        >
                          <option value="paybill">PayBill</option>
                          <option value="till">Till / Buy Goods</option>
                        </Select>
                      </label>
                      <label className="text-sm font-semibold text-text">
                        Shortcode
                        <input
                          className={input}
                          required={!current}
                          minLength={2}
                          value={form.shortcode ?? ""}
                          placeholder={
                            current
                              ? `Leave blank to keep ${current.shortcode}`
                              : "Enter shortcode"
                          }
                          onChange={(event) =>
                            setForm({ ...form, shortcode: event.target.value })
                          }
                        />
                      </label>
                      <label className="text-sm font-semibold text-text">
                        Transaction type
                        <input
                          className={input}
                          required
                          value={form.transaction_type}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              transaction_type: event.target.value,
                            })
                          }
                        />
                      </label>
                      <div className="rounded-xl border border-primary/20 bg-primary-light/35 p-3 sm:col-span-2">
                        <p className="text-sm font-bold text-text">
                          Callback URL configured automatically
                        </p>
                        <p className="mt-1 text-xs leading-5 text-text-secondary">
                          MtaaMall creates a secure, account-specific callback
                          URL after this configuration is saved. No callback
                          address is required from you.
                        </p>
                      </div>
                      <label className="text-sm font-semibold text-text">
                        Consumer key
                        <input
                          className={input}
                          type="password"
                          autoComplete="new-password"
                          value={form.consumer_key ?? ""}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              consumer_key: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className="text-sm font-semibold text-text">
                        Consumer secret
                        <input
                          className={input}
                          type="password"
                          autoComplete="new-password"
                          value={form.consumer_secret ?? ""}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              consumer_secret: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className="text-sm font-semibold text-text sm:col-span-2">
                        Passkey
                        <input
                          className={input}
                          type="password"
                          autoComplete="new-password"
                          value={form.passkey ?? ""}
                          onChange={(event) =>
                            setForm({ ...form, passkey: event.target.value })
                          }
                        />
                      </label>
                      <label className="text-sm font-semibold text-text sm:col-span-2">
                        Audit reason
                        <textarea
                          className={input}
                          required
                          minLength={3}
                          maxLength={500}
                          rows={3}
                          value={form.reason}
                          onChange={(event) =>
                            setForm({ ...form, reason: event.target.value })
                          }
                        />
                      </label>
                      {actionError && (
                        <p
                          role="alert"
                          className="rounded-xl bg-error/5 p-3 text-sm text-error sm:col-span-2"
                        >
                          {errorText(actionError)}
                        </p>
                      )}
                      <button
                        className={`${primary} sm:col-span-2`}
                        disabled={busy || form.reason.trim().length < 3}
                      >
                        {save.isPending
                          ? "Saving securely…"
                          : current && form.consumer_key
                            ? "Save and rotate credentials"
                            : "Save configuration"}
                      </button>
                    </form>
                  ) : (
                    <p className="mt-5 rounded-xl bg-background p-4 text-sm text-text-secondary">
                      Your role has read-only access to payment configuration.
                    </p>
                  )}
                </section>
              </div>
            )}
          </div>
        )}

      {activeView === "account" && selectedBusinessId && (
        <section className={`${panel} p-5`}>
          <h2 className="font-bold text-text">POS branches</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {branches.data?.map((branch) => (
              <div
                key={branch.id}
                className="flex items-center justify-between rounded-xl bg-background p-3"
              >
                <div>
                  <p className="font-semibold text-text">{branch.name}</p>
                  <p className="text-xs text-text-tertiary">{branch.code}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${branch.mpesa_enabled ? "bg-success-light text-success-dark" : "bg-white text-text-secondary"}`}
                >
                  {branch.mpesa_enabled ? "Enabled" : "Not enabled"}
                </span>
              </div>
            ))}
            {branches.data?.length === 0 && (
              <p className="text-sm text-text-secondary">No branches found.</p>
            )}
          </div>
        </section>
      )}

      {activeView === "activity" && (
        <section className={`${panel} p-5`}>
          <h2 className="text-lg font-bold text-text">Account activity</h2>
          <div className="mt-4 divide-y divide-border">
            {audit.data?.slice(0, 20).map((event) => (
              <div
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                key={event.id}
              >
                <div>
                  <p className="font-semibold capitalize text-text">
                    {event.action
                      .replace("platform.payments.", "")
                      .replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    Actor #{event.actor_user_id ?? "system"}
                  </p>
                </div>
                <time className="text-xs text-text-secondary">
                  {new Date(event.created_at).toLocaleString()}
                </time>
              </div>
            ))}
            {audit.data?.length === 0 && (
              <div className="py-10 text-center">
                <p className="font-semibold text-text">No activity yet</p>
                <p className="mt-1 text-sm text-text-secondary">
                  Configuration changes and account actions will appear here.
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
