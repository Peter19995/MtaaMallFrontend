import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRightIcon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
  BuildingStorefrontIcon,
  DevicePhoneMobileIcon,
  BeakerIcon,
  HomeIcon,
  CubeIcon,
  GiftIcon,
  ClipboardDocumentListIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import {
  listCategoriesRequest,
} from "@api/modules/products.api";
import {
  listMarketplaceProductsRequest,
  type MarketplaceProduct,
} from "@api/modules/marketplace.api";
import { resolveMediaUrl } from "@utils/media";
import "./home.css";

const categoryIcon = (name: string) => {
  if (/electronic|appliance/i.test(name)) return DevicePhoneMobileIcon;
  if (/care|beauty|clean/i.test(name)) return BeakerIcon;
  if (/home|kitchen/i.test(name)) return HomeIcon;
  if (/baby|kids/i.test(name)) return GiftIcon;
  if (/office|stationery/i.test(name)) return ClipboardDocumentListIcon;
  return ShoppingBagIcon;
};
const catalogLink = (name: string) =>
  "/products?search=" + encodeURIComponent(name);
const benefits = [
  {
    icon: Squares2X2Icon,
    title: "More to discover",
    text: "Everyday essentials & more",
  },
  {
    icon: ShoppingBagIcon,
    title: "One place to shop",
    text: "Browse & build your cart",
  },
  {
    icon: ClipboardDocumentListIcon,
    title: "Your orders, together",
    text: "Keep track in your account",
  },
  {
    icon: BuildingStorefrontIcon,
    title: "Space for your business",
    text: "Bring your store online",
  },
];
function ProductTile({ product }: { product: MarketplaceProduct }) {
  const [failed, setFailed] = useState(false);
  const bestOffer = [...product.offers].sort(
    (left, right) => Number(left.price) - Number(right.price),
  )[0];
  const image = resolveMediaUrl(product.product.image ?? bestOffer?.image);
  const Icon = categoryIcon(product.product.name);
  const price = Number(bestOffer?.price ?? 0);
  const availableQuantity = product.offers.reduce(
    (total, offer) => total + offer.available_quantity,
    0,
  );
  const sellerCount = new Set(product.offers.map((offer) => offer.business_id)).size;
  return (
    <Link className="mall-product" to={catalogLink(product.product.name)}>
      <div className="mall-product-image">
        {image && !failed ? (
          <img
            src={image}
            alt={product.product.name}
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="mall-product-placeholder">
            <Icon aria-hidden="true" />
            <span>Image coming soon</span>
          </div>
        )}
        <span className="mall-product-arrow">
          <ArrowRightIcon aria-hidden="true" />
        </span>
      </div>
      <div className="mall-product-copy">
        <p>{product.product.brand ?? "Marketplace"}</p>
        <h3>{product.product.name}</h3>
        <strong>
          {price > 0
            ? new Intl.NumberFormat("en-KE", {
                style: "currency",
                currency: "KES",
                maximumFractionDigits: 2,
              }).format(price)
            : "Price to be confirmed"}
        </strong>
        <span
          className={
            availableQuantity > 0 ? "mall-stock" : "mall-unavailable"
          }
        >
          {availableQuantity > 0
            ? `${sellerCount} seller${sellerCount === 1 ? "" : "s"} · Explore options`
            : "Currently unavailable"}
        </span>
      </div>
    </Link>
  );
}
// Editorial shopping illustration, not a representation of listed inventory.
function ShoppingIllustration() {
  return (
    <svg
      viewBox="0 0 560 440"
      fill="none"
      aria-hidden="true"
      className="mall-shopping-art"
    >
      <ellipse
        cx="300"
        cy="390"
        rx="210"
        ry="24"
        fill="#1E2B32"
        opacity=".09"
      />
      <circle cx="315" cy="208" r="176" fill="#E0F2F7" />
      <path d="M92 330L126 191H265L300 330V384H92V330Z" fill="#FF8A5C" />
      <path d="M126 191H265L244 225H107L126 191Z" fill="#FFB89A" />
      <path
        d="M168 222V174C168 119 230 119 230 174V222"
        stroke="#1E2B32"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <path d="M127 288H248M127 301H208" stroke="#E66A3A" strokeWidth="3" />
      <text
        x="125"
        y="271"
        fill="#1E2B32"
        fontSize="24"
        fontWeight="800"
        fontFamily="sans-serif"
      >
        mtaa.
      </text>
      <path d="M256 258L310 208H439L486 258V381H256V258Z" fill="#51C4D8" />
      <path d="M256 258H486L439 208H310L256 258Z" fill="#8FD9E8" />
      <path
        d="M336 252V216C336 177 402 177 402 216V252"
        stroke="#E0F2F7"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <rect x="294" y="292" width="144" height="50" rx="25" fill="#FFFFFF" />
      <text
        x="322"
        y="324"
        fill="#1E2B32"
        fontSize="21"
        fontWeight="700"
        fontFamily="sans-serif"
      >
        good finds
      </text>
      <g transform="rotate(-14 130 118)">
        <rect x="91" y="57" width="73" height="117" rx="15" fill="#1E2B32" />
        <rect x="97" y="64" width="61" height="102" rx="10" fill="#E0F2F7" />
        <path
          d="M118 70H138"
          stroke="#1E2B32"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="128" cy="112" r="18" fill="#FF8A5C" />
        <path
          d="M113 137H143M120 144H136"
          stroke="#3A9EB0"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
      <g transform="rotate(12 436 134)">
        <path
          d="M394 130V104C394 46 476 46 476 104V130"
          stroke="#FFFFFF"
          strokeWidth="22"
        />
        <path
          d="M394 128V107C394 54 476 54 476 107V128"
          stroke="#1E2B32"
          strokeWidth="7"
        />
        <rect x="379" y="115" width="26" height="53" rx="12" fill="#1E2B32" />
        <rect x="465" y="115" width="26" height="53" rx="12" fill="#1E2B32" />
      </g>
      <g transform="rotate(-8 234 91)">
        <rect x="205" y="48" width="55" height="89" rx="15" fill="#FFFFFF" />
        <rect x="216" y="34" width="33" height="21" rx="5" fill="#FF8A5C" />
        <rect x="214" y="77" width="37" height="34" rx="5" fill="#8FD9E8" />
        <path d="M222 91H243M225 98H240" stroke="#3A9EB0" strokeWidth="2" />
      </g>
      <path
        d="M60 210H80M70 200V220M487 58H507M497 48V68"
        stroke="#FF8A5C"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="317" cy="49" r="5" fill="#FFB347" />
      <circle cx="517" cy="274" r="5" fill="#51C4D8" />
    </svg>
  );
}
export default function HomePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const products = useQuery({
    queryKey: ["home", "mall-products"],
    queryFn: () => listMarketplaceProductsRequest({ limit: 24 }),
    staleTime: 60000,
  });
  const categories = useQuery({
    queryKey: ["home", "mall-categories"],
    queryFn: listCategoriesRequest,
    staleTime: 60000,
  });
  const items = [...(products.data ?? [])]
    .sort((a, b) => b.offers.length - a.offers.length)
    .slice(0, 8);
  const featuredCategories = [
    "Electronics & Appliances",
    "Clothing & Footwear",
    "Personal Care",
    "Home & Kitchen",
    "Breakfast Foods",
    "Baby & Kids",
    "Household Cleaning",
    "Stationery & Office Supplies",
  ];
  const categoryRank = (name: string) => {
    const rank = featuredCategories.indexOf(name);
    return rank < 0 ? 99 : rank;
  };
  const departments = [
    ...new Map((categories.data ?? []).map((c) => [c.name, c])).values(),
  ]
    .sort((a, b) => categoryRank(a.name) - categoryRank(b.name))
    .slice(0, 8);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    navigate(search.trim() ? catalogLink(search.trim()) : "/products");
  };
  return (
    <div className="mall-home">
      <div className="mall-announcement">
        <span>Your neighbourhood. Your online mall.</span>
        <Link to="/register?type=business">
          Sell on MtaaMall <ArrowRightIcon />
        </Link>
      </div>
      <section className="mall-hero mall-wrap">
        <div className="mall-hero-copy">
          <p className="mall-eyebrow">
            <span /> A WHOLE MALL. ONE DESTINATION.
          </p>
          <h1>
            Everyday needs.
            <br />
            Unexpected <em>finds.</em>
          </h1>
          <p className="mall-hero-description">
            From your weekly essentials to your next favourite thing. Explore
            products from businesses on MtaaMall, all in one place.
          </p>
          <form onSubmit={submit} className="mall-search" role="search">
            <MagnifyingGlassIcon aria-hidden="true" />
            <input
              aria-label="Search the mall"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="What are you shopping for?"
              type="search"
            />
            <button type="submit">
              Search <ArrowRightIcon aria-hidden="true" />
            </button>
          </form>
          <div className="mall-hero-links">
            <Link to="/products">
              Explore the mall <ArrowRightIcon />
            </Link>
            <a href="#departments">Browse categories</a>
          </div>
          <div className="mall-hero-note">
            <BuildingStorefrontIcon aria-hidden="true" />
            <span>Discover businesses. Shop your way.</span>
          </div>
        </div>
        <div className="mall-hero-visual">
          <div className="mall-visual-label">
            <span>THE EVERYDAY EDIT</span>
            <span>01 / MTAAMALL</span>
          </div>
          <ShoppingIllustration />
          <div className="mall-visual-caption">
            <span>
              A little of everything.
              <br />
              <strong>All in your mtaa.</strong>
            </span>
            <span className="mall-circle-arrow">
              <ArrowRightIcon />
            </span>
          </div>
        </div>
      </section>
      <div className="mall-benefits mall-wrap">
        {benefits.map(({ icon: Icon, title, text }) => (
          <div key={title}>
            <Icon aria-hidden="true" />
            <span>
              <strong>{title}</strong>
              <small>{text}</small>
            </span>
          </div>
        ))}
      </div>
      <section id="departments" className="mall-section mall-wrap">
        <div className="mall-section-heading">
          <div>
            <p className="mall-eyebrow">FIND YOUR AISLE</p>
            <h2>What’s on your list?</h2>
          </div>
          <Link to="/products">
            All products <ArrowRightIcon />
          </Link>
        </div>
        {categories.isError ? (
          <div className="mall-empty">
            Categories couldn’t load.{" "}
            <button onClick={() => categories.refetch()}>Try again</button>
          </div>
        ) : categories.isPending ? (
          <div className="mall-category-grid" aria-label="Loading categories">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="mall-skeleton mall-category-skeleton" />
            ))}
          </div>
        ) : departments.length ? (
          <div className="mall-category-grid">
            {departments.map((category, i) => {
              const Icon = categoryIcon(category.name);
              return (
                <Link
                  key={category.id}
                  to={"/products?category=" + encodeURIComponent(category.name)}
                  className={"mall-category mall-tone-" + (i % 4)}
                >
                  <span>
                    <Icon aria-hidden="true" />
                  </span>
                  <strong>{category.name}</strong>
                  <ArrowRightIcon
                    className="mall-category-arrow"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mall-empty">
            New departments are on the way.{" "}
            <Link to="/products">Explore the catalog</Link>
          </div>
        )}
      </section>
      <section className="mall-section mall-wrap">
        <div className="mall-section-heading">
          <div>
            <p className="mall-eyebrow">THE MALL, AT A GLANCE</p>
            <h2>A little browsing goes a long way.</h2>
          </div>
          <Link to="/products">
            Explore the catalog <ArrowRightIcon />
          </Link>
        </div>
        {products.isError ? (
          <div className="mall-empty">
            <CubeIcon />
            <h3>We couldn’t load the catalog.</h3>
            <p>Please try again in a moment.</p>
            <button onClick={() => products.refetch()}>Retry</button>
          </div>
        ) : products.isPending ? (
          <div className="mall-product-grid" aria-label="Loading products">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="mall-skeleton mall-product-skeleton" />
            ))}
          </div>
        ) : items.length ? (
          <div className="mall-product-grid">
            {items.map((product) => (
              <ProductTile key={product.product.public_id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mall-empty">
            <ShoppingBagIcon />
            <h3>The shelves are getting ready.</h3>
            <p>Check back soon to discover products from our businesses.</p>
          </div>
        )}
      </section>
      <section className="mall-wrap mall-promo-grid">
        <div className="mall-customer-promo">
          <p className="mall-eyebrow">MAKE IT YOUR MALL</p>
          <h2>
            Your shopping.
            <br />
            In one place.
          </h2>
          <p>
            Keep your addresses, order history and shopping activity together in
            your customer account.
          </p>
          <Link className="mall-button" to="/account">
            Go to my account <ArrowRightIcon />
          </Link>
          <ShoppingBagIcon
            className="mall-promo-decoration"
            aria-hidden="true"
          />
        </div>
        <div className="mall-seller-promo">
          <p className="mall-eyebrow">FOR THE BUSINESSES IN OUR MTAA</p>
          <h2>
            Your next customer
            <br />
            could be right here.
          </h2>
          <p>
            Register your business, bring your products online, and manage your
            store and POS in one workspace.
          </p>
          <Link className="mall-button" to="/register?type=business">
            Bring your business to MtaaMall <ArrowRightIcon />
          </Link>
          <span className="mall-seller-note">
            Business verification is required before you start selling.
          </span>
        </div>
      </section>
      <div className="mall-closing mall-wrap">
        <span>Local businesses. Everyday possibilities.</span>
        <strong>Welcome to your online mall.</strong>
        <Link to="/products">
          Let’s go shopping <ArrowRightIcon />
        </Link>
      </div>
    </div>
  );
}
