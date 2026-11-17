import { useWorkspacePath } from "@hooks/useWorkspacePath";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  ArrowUpRightIcon,
  ArrowPathIcon,
  BanknotesIcon,
  ShoppingBagIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  BriefcaseIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@hooks/useAuth";
import { getMyBusiness } from "@api/modules/businesses.api";
import {
  getSalesSummaryRequest,
  getDailySalesRequest,
} from "@api/modules/reports.api";
import { getInventoryDashboardRequest } from "@api/modules/inventory.api";
import { ErrorNotice, StatusBadge } from "./BusinessComponents";
import { Select } from "@components/common";
import "./business-workspace.css";
import "./business-overview.css";

export function overviewRange(days: number, now = new Date()) {
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return {
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
  };
}

export default function BusinessOverviewPage() {
  const workspacePath = useWorkspacePath();
  const { user, hasPermission } = useAuth();
  const [days, setDays] = useState(30);
  const range = overviewRange(days);
  const business = useQuery({
    queryKey: ["businesses", "mine", user?.id],
    queryFn: getMyBusiness,
    refetchInterval: 30000,
  });
  const canReport = hasPermission("reports.read");
  const canReadInventory = hasPermission("inventory.read");
  const reportEnabled =
    Boolean(business.data) && !business.isError && canReport;
  const summary = useQuery({
    queryKey: [
      "business-overview",
      "summary",
      user?.id,
      business.data?.public_id,
      range,
    ],
    queryFn: () => getSalesSummaryRequest(range),
    enabled: reportEnabled,
    refetchInterval: 30000,
  });
  const daily = useQuery({
    queryKey: [
      "business-overview",
      "daily",
      user?.id,
      business.data?.public_id,
      range,
    ],
    queryFn: () => getDailySalesRequest(range),
    enabled: reportEnabled,
    refetchInterval: 30000,
  });
  const inventory = useQuery({
    queryKey: [
      "business-overview",
      "inventory",
      user?.id,
      business.data?.public_id,
    ],
    queryFn: () =>
      getInventoryDashboardRequest({ status_limit: 1, recent_limit: 1 }),
    enabled: Boolean(business.data) && !business.isError && canReadInventory,
    refetchInterval: 30000,
  });
  const activeBranches =
    business.data?.branches.filter((branch) => branch.is_active) ?? [];
  const branchSummaries = useQueries({
    queries: activeBranches.map((branch) => ({
      queryKey: [
        "business-overview",
        "branch-summary",
        business.data?.public_id,
        branch.id,
        range,
      ],
      queryFn: () => getSalesSummaryRequest({ ...range, branch_id: branch.id }),
      enabled: reportEnabled && activeBranches.length > 1,
      refetchInterval: 30000,
    })),
  });
  const formatMoney = (amount: number) => {
    const currency = business.data?.currency ?? "KES";
    try {
      return new Intl.NumberFormat("en", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toLocaleString()}`;
    }
  };
  const stats = summary.data;
  const shortcuts = [
    {
      label: "Sales & orders",
      path: workspacePath("/dashboard/admin/sales"),
      permission: "orders.read",
      icon: ShoppingBagIcon,
    },
    {
      label: "Inventory",
      path: workspacePath("/dashboard/admin/inventory"),
      permission: "inventory.read",
      icon: CubeIcon,
    },
    {
      label: "Projects",
      path: workspacePath("/dashboard/admin/projects"),
      permission: "projects.read",
      icon: BriefcaseIcon,
    },
    {
      label: "Branches",
      path: workspacePath("/dashboard/admin/branches"),
      permission: "branches.read",
      icon: BuildingStorefrontIcon,
    },
  ].filter((item) => hasPermission(item.permission));
  const series = Array.from({ length: days }, (_, index) => {
    const date = new Date(`${range.start_date}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return (
      daily.data?.find((point) => point.date === key) ?? {
        date: key,
        total_sales: 0,
        orders: 0,
      }
    );
  });
  const max = Math.max(1, ...series.map((point) => point.total_sales));
  return (
    <div className="business-workspace business-overview">
      <header className="business-page-heading overview-page-heading">
        <div>
          <h1>Overview</h1>
        </div>
        <Link
          to={workspacePath("/dashboard/business/profile")}
          className="business-outline-button"
        >
          <UserCircleIcon aria-hidden="true" />
          Business profile
        </Link>
      </header>
      {business.isPending && (
        <div role="status" className="business-loading">
          Loading your business…
        </div>
      )}
      {business.isError && (
        <div className="overview-message">
          <ErrorNotice error={business.error} />
          <button
            className="business-outline-button"
            onClick={() => business.refetch()}
          >
            Retry business
          </button>
        </div>
      )}
      {business.data && !business.isError && (
        <>
          <section className="overview-welcome">
            <div>
              <h2>{business.data.display_name}</h2>
              <p>
                {business.data.branches.length}{" "}
                {business.data.branches.length === 1 ? "branch" : "branches"}{" "}
                <span aria-hidden="true">·</span> {business.data.currency}
              </p>
            </div>
            <StatusBadge status={business.data.status} />
          </section>
          <div className="overview-toolbar">
            <h2>Sales summary</h2>
            <div className="overview-controls">
              <Select
                aria-label="Reporting period"
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </Select>
              {canReport && (
                <button
                  className="business-outline-button"
                  aria-label="Refresh sales summary"
                  disabled={summary.isFetching || daily.isFetching}
                  onClick={() => {
                    void summary.refetch();
                    void daily.refetch();
                  }}
                >
                  <ArrowPathIcon aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          {!canReport ? (
            <p className="overview-message">
              Your role does not include access to performance reports. Your
              permitted operational tools are available below.
            </p>
          ) : (
            <>
              {summary.isPending && (
                <p role="status" className="overview-message">
                  Loading performance summary…
                </p>
              )}
              {summary.isError && (
                <div className="overview-message">
                  <ErrorNotice error={summary.error} />
                  <button
                    className="business-outline-button"
                    onClick={() => summary.refetch()}
                  >
                    Retry summary
                  </button>
                </div>
              )}
              {stats && !summary.isError && (
                <>
                  <section
                    className="overview-metrics"
                    aria-label="Performance metrics"
                  >
                    {[
                      {
                        label: "Sales revenue",
                        value: formatMoney(stats.total_sales),
                        icon: BanknotesIcon,
                      },
                      {
                        label: "Total orders",
                        value: stats.total_orders.toLocaleString(),
                        icon: ShoppingBagIcon,
                      },
                      {
                        label: "POS orders",
                        value: stats.pos_orders.toLocaleString(),
                        icon: BuildingStorefrontIcon,
                      },
                      {
                        label: "Online orders",
                        value: stats.online_orders.toLocaleString(),
                        icon: ShoppingBagIcon,
                      },
                    ].map((item) => (
                      <article
                        className="business-card overview-metric"
                        key={item.label}
                      >
                        <div>
                          <p>{item.label}</p>
                          <item.icon aria-hidden="true" />
                        </div>
                        <strong>{item.value}</strong>
                      </article>
                    ))}
                  </section>
                  <div className="overview-analytics-grid">
                    <section className="business-card overview-chart-card">
                      <div className="overview-section-heading">
                        <h2>Sales</h2>
                        <span>Last {days} days</span>
                      </div>
                      {daily.isPending && (
                        <p role="status" className="overview-message">
                          Loading daily sales…
                        </p>
                      )}
                      {daily.isError && (
                        <>
                          <ErrorNotice error={daily.error} />
                          <button
                            className="business-outline-button"
                            onClick={() => daily.refetch()}
                          >
                            Retry daily sales
                          </button>
                        </>
                      )}
                      {daily.data &&
                        !daily.isError &&
                        (series.some((point) => point.total_sales > 0) ? (
                          <>
                            <div
                              className="overview-chart"
                              role="img"
                              aria-label={`Daily sales from ${range.start_date} to ${range.end_date}. Exact amounts are available in the daily sales table below.`}
                            >
                              {series.map((point) => (
                                <div
                                  key={point.date}
                                  className="overview-bar-slot"
                                  title={`${point.date}: ${formatMoney(point.total_sales)}`}
                                >
                                  <div
                                    style={{
                                      height: `${(point.total_sales / max) * 100}%`,
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                            <div className="overview-chart-labels">
                              <span>{range.start_date}</span>
                              <span>{range.end_date}</span>
                            </div>
                            <details className="overview-daily-table">
                              <summary>View daily sales data</summary>
                              <div>
                                <table>
                                  <caption>Daily sales (UTC)</caption>
                                  <thead>
                                    <tr>
                                      <th>Date</th>
                                      <th>Revenue</th>
                                      <th>Paid / fulfilled orders</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {series.map((point) => (
                                      <tr key={point.date}>
                                        <td>{point.date}</td>
                                        <td>
                                          {formatMoney(point.total_sales)}
                                        </td>
                                        <td>{point.orders}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </details>
                          </>
                        ) : (
                          <div className="overview-empty">
                            <BanknotesIcon aria-hidden="true" />
                            <h3>No sales yet</h3>
                          </div>
                        ))}
                    </section>
                    <section className="business-card overview-operations">
                      <div className="overview-section-heading">
                        <h2>Operations</h2>
                      </div>
                      <dl>
                        <div>
                          <dt>
                            <CubeIcon aria-hidden="true" />
                            Low-stock items
                          </dt>
                          <dd
                            className={
                              stats.low_stock_products > 0
                                ? "overview-warning"
                                : ""
                            }
                          >
                            {stats.low_stock_products}
                          </dd>
                        </div>
                        <div>
                          <dt>
                            <BriefcaseIcon aria-hidden="true" />
                            Active projects
                          </dt>
                          <dd>{stats.active_projects}</dd>
                        </div>
                        <div>
                          <dt>
                            <BuildingStorefrontIcon aria-hidden="true" />
                            Active branches
                          </dt>
                          <dd>
                            {
                              business.data.branches.filter(
                                (branch) => branch.is_active,
                              ).length
                            }{" "}
                            / {business.data.branches.length}
                          </dd>
                        </div>
                      </dl>
                      {stats.low_stock_products > 0 && (
                        <Link
                          className="overview-operation-note"
                          to={workspacePath("/dashboard/admin/inventory")}
                        >
                          Review low-stock inventory
                        </Link>
                      )}
                    </section>
                  </div>
                  {activeBranches.length > 1 && (
                    <section
                      className="business-card overview-daily-table"
                      aria-label="Branch comparison"
                    >
                      <div className="overview-section-heading">
                        <div>
                          <h2>Branch comparison</h2>
                          <p>Revenue and orders for the selected period</p>
                        </div>
                      </div>
                      <div>
                        <table>
                          <thead>
                            <tr>
                              <th>Branch</th>
                              <th>Revenue</th>
                              <th>Orders</th>
                              <th>POS orders</th>
                              <th>Online orders</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeBranches.map((branch, index) => {
                              const row = branchSummaries[index];
                              return (
                                <tr key={branch.id}>
                                  <td>{branch.name}</td>
                                  <td>
                                    {row.data
                                      ? formatMoney(row.data.total_sales)
                                      : "—"}
                                  </td>
                                  <td>{row.data?.total_orders ?? "—"}</td>
                                  <td>{row.data?.pos_orders ?? "—"}</td>
                                  <td>{row.data?.online_orders ?? "—"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}
                </>
              )}
            </>
          )}
          {canReadInventory && (
            <section
              className="overview-inventory-section"
              aria-labelledby="inventory-summary-heading"
            >
              <div className="overview-section-heading">
                <div>
                  <h2 id="inventory-summary-heading">Inventory summary</h2>
                  <p>Current stock across your permitted branches</p>
                </div>
                <div className="overview-heading-actions">
                  <button
                    className="business-outline-button"
                    aria-label="Refresh inventory summary"
                    disabled={inventory.isFetching}
                    onClick={() => inventory.refetch()}
                  >
                    <ArrowPathIcon aria-hidden="true" />
                  </button>
                  <Link
                    to={workspacePath("/dashboard/admin/inventory")}
                    className="business-outline-button"
                  >
                    View inventory
                  </Link>
                </div>
              </div>
              {inventory.isPending && (
                <p role="status" className="overview-message">
                  Loading inventory summary…
                </p>
              )}
              {inventory.isError && (
                <div className="overview-message">
                  <ErrorNotice error={inventory.error} />
                  <button
                    className="business-outline-button"
                    onClick={() => inventory.refetch()}
                  >
                    Retry inventory
                  </button>
                </div>
              )}
              {inventory.data && !inventory.isError && (
                <section
                  className="overview-metrics overview-inventory-metrics"
                  aria-label="Inventory metrics"
                >
                  {[
                    {
                      label: "Tracked products",
                      value:
                        inventory.data.summary.total_products.toLocaleString(),
                      icon: CubeIcon,
                      warning: false,
                    },
                    {
                      label: "Stock value",
                      value: formatMoney(
                        inventory.data.summary.total_stock_value,
                      ),
                      icon: BanknotesIcon,
                      warning: false,
                    },
                    {
                      label: "Low-stock items",
                      value:
                        inventory.data.summary.low_stock_items.toLocaleString(),
                      icon: CubeIcon,
                      warning: inventory.data.summary.low_stock_items > 0,
                    },
                    {
                      label: "Out-of-stock items",
                      value:
                        inventory.data.summary.out_of_stock_items.toLocaleString(),
                      icon: ShoppingBagIcon,
                      warning: inventory.data.summary.out_of_stock_items > 0,
                    },
                  ].map((item) => (
                    <article
                      className={`business-card overview-metric${item.warning ? " overview-metric-alert" : ""}`}
                      key={item.label}
                    >
                      <div>
                        <p>{item.label}</p>
                        <item.icon aria-hidden="true" />
                      </div>
                      <strong>{item.value}</strong>
                    </article>
                  ))}
                </section>
              )}
            </section>
          )}
          <section className="overview-tools">
            <div className="overview-section-heading">
              <h2>Quick actions</h2>
              {hasPermission("pos.sell") &&
                (business.data.local_pos_enabled &&
                !["suspended", "closed"].includes(business.data.status) ? (
                  <Link
                    to={workspacePath("/dashboard/admin/sales/create")}
                    className="business-primary-button"
                  >
                    New sale
                  </Link>
                ) : (
                  <span className="overview-pos-locked">POS unavailable</span>
                ))}
            </div>
            <div className="overview-shortcuts">
              {shortcuts.map((item) => (
                <Link key={item.path} to={item.path} className="business-card">
                  <item.icon aria-hidden="true" />
                  <h3>{item.label}</h3>
                  <ArrowUpRightIcon aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
