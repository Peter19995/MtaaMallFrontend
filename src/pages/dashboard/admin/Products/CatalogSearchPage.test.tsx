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
import CatalogSearchPage from "./CatalogSearchPage";
import {
  listCatalogBrandsRequest,
  listCatalogCategoriesRequest,
  proposeCatalogProductRequest,
  searchCatalogProductsRequest,
} from "@api/modules/catalog.api";
import {
  adoptCatalogProductRequest,
  listProductsRequest,
  updateProductCatalogueLinkRequest,
} from "@api/modules/products.api";
import { listTaxRatesRequest } from "@api/modules/finance.api";

const permissions = [
  "catalog.products.read",
  "catalog.products.propose",
  "products.read",
  "products.create",
  "products.update",
  "finance.read",
];

vi.mock("@hooks/useAuth", () => ({
  useAuth: () => ({
    hasPermission: (permission: string) => permissions.includes(permission),
  }),
}));
vi.mock("@api/modules/catalog.api", () => ({
  listCatalogBrandsRequest: vi.fn(),
  listCatalogCategoriesRequest: vi.fn(),
  proposeCatalogProductRequest: vi.fn(),
  searchCatalogProductsRequest: vi.fn(),
}));
vi.mock("@api/modules/products.api", () => ({
  adoptCatalogProductRequest: vi.fn(),
  listProductsRequest: vi.fn(),
  updateProductCatalogueLinkRequest: vi.fn(),
}));
vi.mock("@api/modules/finance.api", () => ({ listTaxRatesRequest: vi.fn() }));

const result = {
  public_id: "catalog-1",
  name: "Coca-Cola",
  brand: "Coca-Cola",
  category: "Drinks",
  package_quantity: 500,
  package_unit: "ml",
  unit_of_measure: "bottle",
  barcode: "4006381333931",
  identifiers: [],
  variants: [],
  approval_status: "approved",
  businesses_using: 2,
  match_type: "exact_identifier" as const,
  match_score: 1,
  requires_confirmation: false,
};

const mount = (initialView: "search" | "proposal" = "search") =>
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
      <MemoryRouter initialEntries={["/business/products/add-from-catalog"]}>
        <CatalogSearchPage initialView={initialView} />
      </MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(searchCatalogProductsRequest).mockResolvedValue([result]);
  vi.mocked(listProductsRequest).mockResolvedValue([]);
  vi.mocked(listTaxRatesRequest).mockResolvedValue([]);
  vi.mocked(listCatalogCategoriesRequest).mockResolvedValue([]);
  vi.mocked(listCatalogBrandsRequest).mockResolvedValue([]);
  vi.mocked(adoptCatalogProductRequest).mockResolvedValue({
    name: "Coca-Cola",
  } as never);
  vi.mocked(updateProductCatalogueLinkRequest).mockResolvedValue({
    name: "Coca-Cola",
  } as never);
  vi.mocked(proposeCatalogProductRequest).mockResolvedValue({
    outcome: "created",
    requires_confirmation: false,
    can_confirm_create: false,
    suggestions: [],
    proposal: {
      public_id: "proposal-1",
      name: "New Soap",
      status: "pending_review",
    },
    business_listing: null,
  });
});
afterEach(cleanup);

describe("business catalogue workflow", () => {
  it("starts with search, distinguishes shared and business fields, and adopts the selected product", async () => {
    mount();
    expect(
      screen.getByRole("heading", { name: "Find existing product" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Propose a new product" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Shared across MtaaMall")).toBeInTheDocument();
    expect(
      screen.getByText("Visible and editable only by this business"),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Product name, barcode or code"), {
      target: { value: "4006381333931" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search catalogue" }));
    expect(await screen.findByText("Exact barcode")).toBeInTheDocument();
    expect(searchCatalogProductsRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        q: "4006381333931",
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Use product" }));
    expect(
      screen.getByRole("dialog", { name: "Coca-Cola" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Business SKU"), {
      target: { value: "COKE-A" },
    });
    fireEvent.change(screen.getByLabelText("Selling price"), {
      target: { value: "80" },
    });
    fireEvent.change(screen.getByLabelText("Description override (optional)"), {
      target: { value: "Seller A description" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create listing" }));

    await waitFor(() =>
      expect(adoptCatalogProductRequest).toHaveBeenCalledWith({
        catalog_product_id: "catalog-1",
        business_sku: "COKE-A",
        selling_price: "80",
        cost_price: null,
        tax_rate_id: null,
        available_online: false,
        description_override: "Seller A description",
        image_override: null,
      }),
    );
  });

  it("submits a new product through the separate proposal path", async () => {
    mount();
    fireEvent.click(
      screen.getByRole("button", { name: "Create new product proposal" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Propose a new product",
    });
    expect(dialog).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Product name"), {
      target: { value: "New Soap" },
    });
    fireEvent.change(screen.getByLabelText("Barcode (optional)"), {
      target: { value: "4006381333931" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check and submit" }));

    await waitFor(() =>
      expect(proposeCatalogProductRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "New Soap",
          barcode: "4006381333931",
          confirm_create: false,
        }),
      ),
    );
  });
});
