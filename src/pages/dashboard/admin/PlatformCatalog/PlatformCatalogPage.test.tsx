// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import PlatformCatalogPage from "./PlatformCatalogPage";
import {
  decideCatalogProductRequest,
  getPlatformCatalogProductRequest,
  listCatalogProposalsRequest,
  listPlatformCatalogProductsRequest,
  mergeCatalogProductRequest,
  updatePlatformCatalogProductRequest,
} from "@api/modules/platformCatalog.api";

const auth = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock("@hooks/useAuth", () => ({
  useAuth: () => ({
    hasPermission: (permission: string) =>
      auth.permissions.includes(permission),
  }),
}));
vi.mock("@api/modules/catalog.api", () => ({
  listCatalogBrandsRequest: vi.fn().mockResolvedValue([]),
  listCatalogCategoriesRequest: vi.fn().mockResolvedValue([]),
}));
vi.mock("@api/modules/platformCatalog.api", () => ({
  decideCatalogProductRequest: vi.fn(),
  getPlatformCatalogProductRequest: vi.fn(),
  listCatalogProposalsRequest: vi.fn(),
  listPlatformCatalogProductsRequest: vi.fn(),
  mergeCatalogProductRequest: vi.fn(),
  updatePlatformCatalogProductRequest: vi.fn(),
}));

const pending = {
  public_id: "pending-1",
  name: "Proposed Cola",
  status: "pending_review",
  business_id: "business-a",
  business_name: "Seller A",
  brand: "Cola",
  category: "Drinks",
  package_quantity: 500,
  package_unit: "ml",
  barcode: "4006381333931",
  submitted_at: "2026-09-20T10:00:00Z",
};
const survivor = {
  ...pending,
  public_id: "approved-1",
  name: "Canonical Cola",
  status: "approved",
};
const detail = {
  ...pending,
  description: "Submitted product",
  unit_of_measure: "bottle",
  merged_into_product_id: null,
  version: 1,
  potential_duplicates: [survivor],
  linked_listings: [
    {
      public_id: "listing-a",
      business_id: "business-a",
      business_name: "Seller A",
      sku: "COLA-A",
      catalogue_link_status: "suggested",
    },
  ],
  audit_history: [],
};

const mount = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <MemoryRouter>
        <PlatformCatalogPage view="proposals" />
      </MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(listCatalogProposalsRequest).mockResolvedValue([pending]);
  vi.mocked(listPlatformCatalogProductsRequest).mockResolvedValue([survivor]);
  vi.mocked(getPlatformCatalogProductRequest).mockResolvedValue(detail);
  vi.mocked(decideCatalogProductRequest).mockResolvedValue(detail);
  vi.mocked(mergeCatalogProductRequest).mockResolvedValue({
    ...detail,
    public_id: survivor.public_id,
  });
  vi.mocked(updatePlatformCatalogProductRequest).mockResolvedValue(detail);
});
afterEach(cleanup);

describe("platform catalogue moderation", () => {
  it("hides mutation controls when effective permissions do not allow moderation", async () => {
    auth.permissions = ["catalog.products.read"];
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Review" }));
    expect(await screen.findByText("Submitted product")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Approve" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Merge" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit" }),
    ).not.toBeInTheDocument();
  });

  it("executes review and merge using the exact selected products and reason", async () => {
    auth.permissions = ["catalog.products.review", "catalog.products.merge"];
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Review" }));
    await screen.findByText("Submitted product");

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "Verified packaging" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm approve" }));
    await waitFor(() =>
      expect(decideCatalogProductRequest).toHaveBeenCalledWith(
        "pending-1",
        "approve",
        "Verified packaging",
      ),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Confirm approve" }),
      ).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Merge" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Surviving approved product" }),
    );
    fireEvent.click(screen.getByRole("option", { name: /Canonical Cola/ }));
    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "Confirmed duplicate" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm merge" }));
    await waitFor(() =>
      expect(mergeCatalogProductRequest).toHaveBeenCalledWith(
        "pending-1",
        "approved-1",
        "Confirmed duplicate",
      ),
    );
  });
});
