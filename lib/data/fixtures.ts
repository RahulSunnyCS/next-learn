/**
 * Deterministic seed fixtures for the Nextmart in-memory data layer.
 *
 * Design decisions:
 * - All IDs and slugs are hard-coded strings rather than auto-generated UUIDs
 *   so that the data is stable across server restarts.  This is required for
 *   SSG / ISR cache demos where params like [slug] must resolve to the same
 *   product every time and for E2E tests that hard-code URLs.
 * - Prices are realistic ranges for the product category (electronics $20–$600,
 *   clothing $15–$120, etc.) so that sorting and price-filter demos look
 *   believable.
 * - The seller user (id: "u-seller-1") owns several products so that the
 *   seller dashboard challenge has non-trivial data to render.
 * - Images use picsum.photos with a fixed seed integer per product so the
 *   same image URL is always returned — no external randomness.
 * - Reviews span multiple products so the review-list challenge has
 *   representative pagination data.
 * - Orders reference real productIds and userIds from the same fixtures file
 *   so foreign-key look-ups in the repository always succeed.
 * - createdAt dates are staggered over ~6 months so "newest" sort demos show
 *   a visible difference in ordering.
 */

import type { Category, Product, Review, User, Order } from "./types";

// ---------------------------------------------------------------------------
// Categories  (5 categories)
// ---------------------------------------------------------------------------

export const CATEGORIES: Category[] = [
  { id: "cat-electronics",  slug: "electronics",  name: "Electronics"  },
  { id: "cat-clothing",     slug: "clothing",     name: "Clothing"     },
  { id: "cat-books",        slug: "books",        name: "Books"        },
  { id: "cat-home",         slug: "home",         name: "Home & Garden" },
  { id: "cat-sports",       slug: "sports",       name: "Sports"       },
];

// ---------------------------------------------------------------------------
// Users  (3 users: 1 seller, 2 buyers)
// ---------------------------------------------------------------------------

export const USERS: User[] = [
  {
    id:    "u-seller-1",
    email: "seller@nextmart.dev",
    name:  "Alex Chen",
    role:  "seller",
  },
  {
    id:    "u-buyer-1",
    email: "buyer1@nextmart.dev",
    name:  "Jamie Rivera",
    role:  "buyer",
  },
  {
    id:    "u-buyer-2",
    email: "buyer2@nextmart.dev",
    name:  "Sam Patel",
    role:  "buyer",
  },
];

// ---------------------------------------------------------------------------
// Products  (30 products across 5 categories)
// ---------------------------------------------------------------------------

export const PRODUCTS: Product[] = [
  // ── Electronics (8 products) ─────────────────────────────────────────────
  {
    id:          "p-elec-001",
    slug:        "wireless-noise-cancelling-headphones",
    name:        "Wireless Noise-Cancelling Headphones",
    description: "Over-ear headphones with 30-hour battery life, active noise cancellation, and premium sound drivers. Folds flat for travel.",
    priceCents:  24999,
    currency:    "USD",
    categoryId:  "cat-electronics",
    images:      ["https://picsum.photos/seed/elec001/600/600"],
    stock:       42,
    rating:      4.7,
    createdAt:   "2025-12-01T10:00:00Z",
    sellerId:    "u-seller-1",
  },
  {
    id:          "p-elec-002",
    slug:        "ultrabook-laptop-15",
    name:        "UltraBook Laptop 15\"",
    description: "Thin-and-light laptop with 15-inch OLED display, 16 GB RAM, 512 GB NVMe SSD, and all-day battery. Ideal for developers and creatives.",
    priceCents:  129999,
    currency:    "USD",
    categoryId:  "cat-electronics",
    images:      ["https://picsum.photos/seed/elec002/600/600"],
    stock:       15,
    rating:      4.5,
    createdAt:   "2025-11-15T09:30:00Z",
    sellerId:    "u-seller-1",
  },
  {
    id:          "p-elec-003",
    slug:        "4k-action-camera",
    name:        "4K Action Camera",
    description: "Waterproof action camera recording 4K at 60fps. Includes two rechargeable batteries and a mounting kit.",
    priceCents:  29999,
    currency:    "USD",
    categoryId:  "cat-electronics",
    images:      ["https://picsum.photos/seed/elec003/600/600"],
    stock:       28,
    rating:      4.3,
    createdAt:   "2025-10-20T08:00:00Z",
    sellerId:    "u-seller-1",
  },
  {
    id:          "p-elec-004",
    slug:        "smart-home-hub",
    name:        "Smart Home Hub",
    description: "Central hub compatible with Zigbee, Z-Wave, and Matter devices. Controls up to 200 smart devices from a single app.",
    priceCents:  7999,
    currency:    "USD",
    categoryId:  "cat-electronics",
    images:      ["https://picsum.photos/seed/elec004/600/600"],
    stock:       60,
    rating:      4.2,
    createdAt:   "2025-09-10T12:00:00Z",
    sellerId:    "u-seller-1",
  },
  {
    id:          "p-elec-005",
    slug:        "mechanical-keyboard-tkl",
    name:        "Mechanical Keyboard TKL",
    description: "Tenkeyless mechanical keyboard with hot-swappable switches, per-key RGB, and an aluminium top frame.",
    priceCents:  11999,
    currency:    "USD",
    categoryId:  "cat-electronics",
    images:      ["https://picsum.photos/seed/elec005/600/600"],
    stock:       35,
    rating:      4.6,
    createdAt:   "2025-08-05T14:00:00Z",
    sellerId:    "u-seller-1",
  },
  {
    id:          "p-elec-006",
    slug:        "portable-bluetooth-speaker",
    name:        "Portable Bluetooth Speaker",
    description: "360° surround sound, IPX7 waterproof, 20-hour playtime. Pairs with two devices simultaneously.",
    priceCents:  5999,
    currency:    "USD",
    categoryId:  "cat-electronics",
    images:      ["https://picsum.photos/seed/elec006/600/600"],
    stock:       80,
    rating:      4.4,
    createdAt:   "2025-07-12T16:00:00Z",
    sellerId:    "u-seller-1",
  },
  {
    id:          "p-elec-007",
    slug:        "usb-c-docking-station",
    name:        "USB-C Docking Station",
    description: "12-in-1 hub with dual 4K HDMI, 100W PD, 3×USB-A, SD/microSD, and Gigabit Ethernet.",
    priceCents:  8999,
    currency:    "USD",
    categoryId:  "cat-electronics",
    images:      ["https://picsum.photos/seed/elec007/600/600"],
    stock:       50,
    rating:      4.1,
    createdAt:   "2025-06-18T11:00:00Z",
    sellerId:    "u-seller-1",
  },
  {
    id:          "p-elec-008",
    slug:        "wireless-charging-pad",
    name:        "Wireless Charging Pad",
    description: "Qi2-certified 15W pad. Compatible with iPhone 12+, Android, and AirPods. Slim profile, LED indicator.",
    priceCents:  3499,
    currency:    "USD",
    categoryId:  "cat-electronics",
    images:      ["https://picsum.photos/seed/elec008/600/600"],
    stock:       120,
    rating:      4.0,
    createdAt:   "2025-05-25T10:00:00Z",
    sellerId:    "u-seller-1",
  },

  // ── Clothing (7 products) ─────────────────────────────────────────────────
  {
    id:          "p-cloth-001",
    slug:        "merino-wool-sweater",
    name:        "Merino Wool Sweater",
    description: "100% extra-fine merino wool crew-neck sweater. Machine washable, anti-pilling, available in 8 colours.",
    priceCents:  9900,
    currency:    "USD",
    categoryId:  "cat-clothing",
    images:      ["https://picsum.photos/seed/cloth001/600/600"],
    stock:       55,
    rating:      4.8,
    createdAt:   "2025-11-01T09:00:00Z",
    sellerId:    "u-seller-1",
  },
  {
    id:          "p-cloth-002",
    slug:        "slim-fit-chinos",
    name:        "Slim-Fit Chinos",
    description: "Stretch cotton-twill slim-fit chinos. Wrinkle-resistant, available in 6 colours, sizes 28–38.",
    priceCents:  5900,
    currency:    "USD",
    categoryId:  "cat-clothing",
    images:      ["https://picsum.photos/seed/cloth002/600/600"],
    stock:       70,
    rating:      4.3,
    createdAt:   "2025-10-10T08:00:00Z",
    sellerId:    "u-seller-1",
  },
  {
    id:          "p-cloth-003",
    slug:        "running-shoes-pro",
    name:        "Running Shoes Pro",
    description: "Lightweight carbon-plate running shoes with responsive foam midsole. Drop: 8mm, weight: 225g.",
    priceCents:  13999,
    currency:    "USD",
    categoryId:  "cat-clothing",
    images:      ["https://picsum.photos/seed/cloth003/600/600"],
    stock:       30,
    rating:      4.6,
    createdAt:   "2025-09-05T07:00:00Z",
    sellerId:    "u-seller-1",
  },
  {
    id:          "p-cloth-004",
    slug:        "waterproof-hiking-jacket",
    name:        "Waterproof Hiking Jacket",
    description: "3-layer Gore-Tex® jacket, fully seam-taped, underarm zips, adjustable hem. Packable into its own chest pocket.",
    priceCents:  19900,
    currency:    "USD",
    categoryId:  "cat-clothing",
    images:      ["https://picsum.photos/seed/cloth004/600/600"],
    stock:       22,
    rating:      4.7,
    createdAt:   "2025-08-20T12:00:00Z",
    sellerId:    "u-seller-1",
  },
  {
    id:          "p-cloth-005",
    slug:        "everyday-t-shirt-pack-3",
    name:        "Everyday T-Shirt 3-Pack",
    description: "Supima cotton crew-neck tees. Pre-shrunk, reinforced collar, available in white/grey/black. Sizes XS–3XL.",
    priceCents:  2999,
    currency:    "USD",
    categoryId:  "cat-clothing",
    images:      ["https://picsum.photos/seed/cloth005/600/600"],
    stock:       200,
    rating:      4.4,
    createdAt:   "2025-07-15T10:00:00Z",
    sellerId:    "u-seller-1",
  },
  {
    id:          "p-cloth-006",
    slug:        "fleece-beanie",
    name:        "Fleece Beanie",
    description: "Double-layered polar fleece beanie. One size fits most. Available in 12 colours.",
    priceCents:  1499,
    currency:    "USD",
    categoryId:  "cat-clothing",
    images:      ["https://picsum.photos/seed/cloth006/600/600"],
    stock:       150,
    rating:      4.2,
    createdAt:   "2025-06-01T09:00:00Z",
    sellerId:    "u-seller-1",
  },
  {
    id:          "p-cloth-007",
    slug:        "denim-jeans-straight",
    name:        "Straight-Leg Denim Jeans",
    description: "Classic 12oz denim in a straight-leg cut. Garment-washed for an authentic worn-in look. Sizes 28–38×30-34.",
    priceCents:  7900,
    currency:    "USD",
    categoryId:  "cat-clothing",
    images:      ["https://picsum.photos/seed/cloth007/600/600"],
    stock:       65,
    rating:      4.5,
    createdAt:   "2025-05-10T08:00:00Z",
    sellerId:    "u-seller-1",
  },

  // ── Books (5 products) ────────────────────────────────────────────────────
  {
    id:          "p-book-001",
    slug:        "the-pragmatic-programmer-20th-anniversary",
    name:        "The Pragmatic Programmer (20th Anniversary Ed.)",
    description: "Updated edition of the classic software craftsmanship book by Hunt & Thomas. Covers modern practices, DevOps, and agile workflows.",
    priceCents:  3999,
    currency:    "USD",
    categoryId:  "cat-books",
    images:      ["https://picsum.photos/seed/book001/600/600"],
    stock:       90,
    rating:      4.9,
    createdAt:   "2025-10-01T10:00:00Z",
    sellerId:    "u-seller-1",
  },
  {
    id:          "p-book-002",
    slug:        "designing-data-intensive-applications",
    name:        "Designing Data-Intensive Applications",
    description: "Martin Kleppmann's deep-dive into the principles behind reliable, scalable, and maintainable systems. A must-read for backend engineers.",
    priceCents:  4499,
    currency:    "USD",
    categoryId:  "cat-books",
    images:      ["https://picsum.photos/seed/book002/600/600"],
    stock:       75,
    rating:      4.9,
    createdAt:   "2025-09-15T09:00:00Z",
    sellerId:    "u-seller-1",
  },
  {
    id:          "p-book-003",
    slug:        "clean-code",
    name:        "Clean Code",
    description: "Robert C. Martin's handbook for writing readable, maintainable code. Covers naming, functions, comments, formatting, and more.",
    priceCents:  3599,
    currency:    "USD",
    categoryId:  "cat-books",
    images:      ["https://picsum.photos/seed/book003/600/600"],
    stock:       110,
    rating:      4.6,
    createdAt:   "2025-08-10T10:00:00Z",
    sellerId:    "u-seller-1",
  },
  {
    id:          "p-book-004",
    slug:        "the-staff-engineers-path",
    name:        "The Staff Engineer's Path",
    description: "Tanya Reilly's guide to navigating the individual-contributor leadership track: vision, execution, and levelling-up without management.",
    priceCents:  3799,
    currency:    "USD",
    categoryId:  "cat-books",
    images:      ["https://picsum.photos/seed/book004/600/600"],
    stock:       60,
    rating:      4.7,
    createdAt:   "2025-07-05T11:00:00Z",
    sellerId:    "u-seller-1",
  },
  {
    id:          "p-book-005",
    slug:        "learning-typescript",
    name:        "Learning TypeScript",
    description: "Josh Goldberg's comprehensive guide to TypeScript: from basic types to advanced generics, type narrowing, and project configuration.",
    priceCents:  3299,
    currency:    "USD",
    categoryId:  "cat-books",
    images:      ["https://picsum.photos/seed/book005/600/600"],
    stock:       85,
    rating:      4.5,
    createdAt:   "2025-06-20T12:00:00Z",
    sellerId:    "u-seller-1",
  },

  // ── Home & Garden (5 products) ────────────────────────────────────────────
  {
    id:          "p-home-001",
    slug:        "bamboo-cutting-board-set",
    name:        "Bamboo Cutting Board Set (3-Piece)",
    description: "Antimicrobial bamboo cutting boards in small, medium, and large. Juice groove, hanging hole. Dishwasher-safe.",
    priceCents:  3499,
    currency:    "USD",
    categoryId:  "cat-home",
    images:      ["https://picsum.photos/seed/home001/600/600"],
    stock:       95,
    rating:      4.5,
    createdAt:   "2025-11-05T08:00:00Z",
    sellerId:    "u-seller-1",
  },
  {
    id:          "p-home-002",
    slug:        "cast-iron-dutch-oven-6qt",
    name:        "Cast-Iron Dutch Oven 6 Qt",
    description: "Enamelled cast-iron Dutch oven. Oven-safe to 500°F, compatible with all hob types. Self-basting lid.",
    priceCents:  12999,
    currency:    "USD",
    categoryId:  "cat-home",
    images:      ["https://picsum.photos/seed/home002/600/600"],
    stock:       40,
    rating:      4.8,
    createdAt:   "2025-10-12T09:00:00Z",
    sellerId:    "u-seller-1",
  },
  {
    id:          "p-home-003",
    slug:        "indoor-herb-garden-kit",
    name:        "Indoor Herb Garden Kit",
    description: "Self-watering planter with seed pods for basil, parsley, and chive. Includes grow light and nutrient tablets for 3 months.",
    priceCents:  4999,
    currency:    "USD",
    categoryId:  "cat-home",
    images:      ["https://picsum.photos/seed/home003/600/600"],
    stock:       55,
    rating:      4.3,
    createdAt:   "2025-09-08T10:00:00Z",
    sellerId:    "u-seller-1",
  },
  {
    id:          "p-home-004",
    slug:        "linen-duvet-cover-queen",
    name:        "Linen Duvet Cover Queen",
    description: "100% stonewashed linen duvet cover with button closure and corner ties. Pre-washed for softness. One colour included.",
    priceCents:  8999,
    currency:    "USD",
    categoryId:  "cat-home",
    images:      ["https://picsum.photos/seed/home004/600/600"],
    stock:       30,
    rating:      4.6,
    createdAt:   "2025-08-18T11:00:00Z",
    sellerId:    "u-seller-1",
  },
  {
    id:          "p-home-005",
    slug:        "solar-garden-lights-set-6",
    name:        "Solar Garden Lights (Set of 6)",
    description: "Stainless-steel solar-powered path lights. Auto on/off at dusk/dawn, 8-hour runtime, IP65 weatherproof.",
    priceCents:  2799,
    currency:    "USD",
    categoryId:  "cat-home",
    images:      ["https://picsum.photos/seed/home005/600/600"],
    stock:       100,
    rating:      4.2,
    createdAt:   "2025-07-22T09:00:00Z",
    sellerId:    "u-seller-1",
  },

  // ── Sports (5 products) ───────────────────────────────────────────────────
  {
    id:          "p-sport-001",
    slug:        "yoga-mat-non-slip-6mm",
    name:        "Non-Slip Yoga Mat 6mm",
    description: "TPE foam yoga mat with alignment lines. 6mm cushioning, closed-cell anti-sweat surface, carrying strap included.",
    priceCents:  3999,
    currency:    "USD",
    categoryId:  "cat-sports",
    images:      ["https://picsum.photos/seed/sport001/600/600"],
    stock:       120,
    rating:      4.5,
    createdAt:   "2025-10-28T10:00:00Z",
    sellerId:    "u-seller-1",
  },
  {
    id:          "p-sport-002",
    slug:        "adjustable-dumbbell-set-5-25lb",
    name:        "Adjustable Dumbbell Set 5–25 lb",
    description: "Dial-select dumbbells replacing 9 pairs of weights. Compact storage tray, weight adjusts in 2.5 lb increments.",
    priceCents:  29900,
    currency:    "USD",
    categoryId:  "cat-sports",
    images:      ["https://picsum.photos/seed/sport002/600/600"],
    stock:       18,
    rating:      4.7,
    createdAt:   "2025-09-20T09:00:00Z",
    sellerId:    "u-seller-1",
  },
  {
    id:          "p-sport-003",
    slug:        "foam-roller-high-density",
    name:        "High-Density Foam Roller",
    description: "Extra-firm EVA foam roller for deep-tissue massage and myofascial release. 36-inch length, holds up to 500 lb.",
    priceCents:  2799,
    currency:    "USD",
    categoryId:  "cat-sports",
    images:      ["https://picsum.photos/seed/sport003/600/600"],
    stock:       85,
    rating:      4.4,
    createdAt:   "2025-08-12T11:00:00Z",
    sellerId:    "u-seller-1",
  },
  {
    id:          "p-sport-004",
    slug:        "resistance-bands-set-5",
    name:        "Resistance Bands Set (5 Levels)",
    description: "Latex-free resistance bands in 5 resistance levels (10–50 lb). Includes door anchor, ankle straps, and mesh bag.",
    priceCents:  2199,
    currency:    "USD",
    categoryId:  "cat-sports",
    images:      ["https://picsum.photos/seed/sport004/600/600"],
    stock:       140,
    rating:      4.3,
    createdAt:   "2025-07-08T10:00:00Z",
    sellerId:    "u-seller-1",
  },
  {
    id:          "p-sport-005",
    slug:        "cycling-helmet-road",
    name:        "Road Cycling Helmet",
    description: "MIPS-equipped road cycling helmet. 20-vent aerodynamic shell, BOA fit system, CE EN 1078 certified. Weight: 270g.",
    priceCents:  8999,
    currency:    "USD",
    categoryId:  "cat-sports",
    images:      ["https://picsum.photos/seed/sport005/600/600"],
    stock:       45,
    rating:      4.6,
    createdAt:   "2025-06-14T12:00:00Z",
    sellerId:    "u-seller-1",
  },
];

// ---------------------------------------------------------------------------
// Reviews  (spread across 8 products — 2–4 reviews each for pagination demos)
// ---------------------------------------------------------------------------

export const REVIEWS: Review[] = [
  // Headphones (p-elec-001) — 3 reviews
  {
    id: "r-001", productId: "p-elec-001", userId: "u-buyer-1",
    authorName: "Jamie Rivera", rating: 5,
    body: "Best headphones I've ever owned. The noise cancellation is outstanding on planes.",
    createdAt: "2026-01-10T14:00:00Z",
  },
  {
    id: "r-002", productId: "p-elec-001", userId: "u-buyer-2",
    authorName: "Sam Patel", rating: 4,
    body: "Great sound and comfort, but the carrying case feels a bit flimsy.",
    createdAt: "2026-01-18T11:00:00Z",
  },
  {
    id: "r-003", productId: "p-elec-001", userId: "u-buyer-1",
    authorName: "Jamie Rivera", rating: 5,
    body: "Upgraded from a different brand — no regrets. The low-end is punchy without being muddy.",
    createdAt: "2026-02-03T09:00:00Z",
  },

  // UltraBook Laptop (p-elec-002) — 2 reviews
  {
    id: "r-004", productId: "p-elec-002", userId: "u-buyer-2",
    authorName: "Sam Patel", rating: 5,
    body: "Incredibly fast. The OLED screen is gorgeous and the battery lasts all day.",
    createdAt: "2025-12-20T15:00:00Z",
  },
  {
    id: "r-005", productId: "p-elec-002", userId: "u-buyer-1",
    authorName: "Jamie Rivera", rating: 4,
    body: "Solid machine. Fan is almost inaudible under light load. Gets warm during compilation though.",
    createdAt: "2026-01-05T10:00:00Z",
  },

  // Mechanical Keyboard (p-elec-005) — 3 reviews
  {
    id: "r-006", productId: "p-elec-005", userId: "u-buyer-1",
    authorName: "Jamie Rivera", rating: 5,
    body: "Swapped in tactile switches and now this board is perfect. Build quality is excellent.",
    createdAt: "2025-11-25T13:00:00Z",
  },
  {
    id: "r-007", productId: "p-elec-005", userId: "u-buyer-2",
    authorName: "Sam Patel", rating: 4,
    body: "Good stock switches, solid RGB, RGB software could be more polished.",
    createdAt: "2025-12-08T12:00:00Z",
  },
  {
    id: "r-008", productId: "p-elec-005", userId: "u-buyer-1",
    authorName: "Jamie Rivera", rating: 5,
    body: "Third keyboard purchase. The hot-swap sockets make it a forever board.",
    createdAt: "2026-01-20T14:00:00Z",
  },

  // Merino Wool Sweater (p-cloth-001) — 3 reviews
  {
    id: "r-009", productId: "p-cloth-001", userId: "u-buyer-2",
    authorName: "Sam Patel", rating: 5,
    body: "Incredibly soft and doesn't itch at all. Has become my go-to for cold days.",
    createdAt: "2025-12-05T10:00:00Z",
  },
  {
    id: "r-010", productId: "p-cloth-001", userId: "u-buyer-1",
    authorName: "Jamie Rivera", rating: 5,
    body: "True to size, washed perfectly in the machine. No shrinkage after five washes.",
    createdAt: "2026-01-12T09:00:00Z",
  },
  {
    id: "r-011", productId: "p-cloth-001", userId: "u-buyer-2",
    authorName: "Sam Patel", rating: 5,
    body: "Bought three colours. The navy is especially nice. Highly recommend.",
    createdAt: "2026-02-01T11:00:00Z",
  },

  // Pragmatic Programmer (p-book-001) — 4 reviews
  {
    id: "r-012", productId: "p-book-001", userId: "u-buyer-1",
    authorName: "Jamie Rivera", rating: 5,
    body: "Essential reading. Covers timeless principles that still apply to modern stacks.",
    createdAt: "2025-11-10T08:00:00Z",
  },
  {
    id: "r-013", productId: "p-book-001", userId: "u-buyer-2",
    authorName: "Sam Patel", rating: 5,
    body: "Read it twice. Second time picked up things I missed. Worth every penny.",
    createdAt: "2025-11-22T10:00:00Z",
  },
  {
    id: "r-014", productId: "p-book-001", userId: "u-buyer-1",
    authorName: "Jamie Rivera", rating: 5,
    body: "The new edition has a whole chapter on concurrency that was missing before. Great update.",
    createdAt: "2025-12-15T14:00:00Z",
  },
  {
    id: "r-015", productId: "p-book-001", userId: "u-buyer-2",
    authorName: "Sam Patel", rating: 4,
    body: "Excellent advice, though some code examples could use a refresh to more recent language features.",
    createdAt: "2026-01-08T11:00:00Z",
  },

  // DDIA (p-book-002) — 3 reviews
  {
    id: "r-016", productId: "p-book-002", userId: "u-buyer-1",
    authorName: "Jamie Rivera", rating: 5,
    body: "The chapter on stream processing alone is worth the price. Comprehensive without being bloated.",
    createdAt: "2025-10-14T09:00:00Z",
  },
  {
    id: "r-017", productId: "p-book-002", userId: "u-buyer-2",
    authorName: "Sam Patel", rating: 5,
    body: "Required reading for anyone designing distributed systems. Dense but rewarding.",
    createdAt: "2025-11-02T10:00:00Z",
  },
  {
    id: "r-018", productId: "p-book-002", userId: "u-buyer-1",
    authorName: "Jamie Rivera", rating: 5,
    body: "I keep coming back to this as a reference. The diagrams are exceptionally clear.",
    createdAt: "2025-12-01T13:00:00Z",
  },

  // Cast-Iron Dutch Oven (p-home-002) — 3 reviews
  {
    id: "r-019", productId: "p-home-002", userId: "u-buyer-2",
    authorName: "Sam Patel", rating: 5,
    body: "Made sourdough bread on the first day. Perfect crust every time.",
    createdAt: "2025-11-18T12:00:00Z",
  },
  {
    id: "r-020", productId: "p-home-002", userId: "u-buyer-1",
    authorName: "Jamie Rivera", rating: 5,
    body: "Heavy but worth it. The enamel is thick and shows no signs of chipping after months of use.",
    createdAt: "2025-12-10T09:00:00Z",
  },
  {
    id: "r-021", productId: "p-home-002", userId: "u-buyer-2",
    authorName: "Sam Patel", rating: 4,
    body: "Great pot. Lid knob gets very hot — remember oven mitts. Otherwise perfect.",
    createdAt: "2026-01-15T10:00:00Z",
  },

  // Adjustable Dumbbells (p-sport-002) — 2 reviews
  {
    id: "r-022", productId: "p-sport-002", userId: "u-buyer-1",
    authorName: "Jamie Rivera", rating: 5,
    body: "Replaced a full rack of weights. The dial mechanism is smooth and the weight feels solid.",
    createdAt: "2025-10-25T11:00:00Z",
  },
  {
    id: "r-023", productId: "p-sport-002", userId: "u-buyer-2",
    authorName: "Sam Patel", rating: 4,
    body: "Good range of weights. Tray is a bit slippery on smooth floors — use rubber mat.",
    createdAt: "2025-11-30T14:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Orders  (3 orders: 2 for buyer-1, 1 for buyer-2)
// ---------------------------------------------------------------------------

export const ORDERS: Order[] = [
  {
    id:        "o-001",
    userId:    "u-buyer-1",
    status:    "delivered",
    totalCents: 24999 + 11999, // headphones + keyboard
    items: [
      { productId: "p-elec-001", qty: 1, priceCents: 24999 },
      { productId: "p-elec-005", qty: 1, priceCents: 11999 },
    ],
    createdAt: "2025-12-10T08:00:00Z",
  },
  {
    id:        "o-002",
    userId:    "u-buyer-1",
    status:    "shipped",
    totalCents: 3999 + 4499, // Pragmatic Programmer + DDIA
    items: [
      { productId: "p-book-001", qty: 1, priceCents: 3999 },
      { productId: "p-book-002", qty: 1, priceCents: 4499 },
    ],
    createdAt: "2026-01-22T10:00:00Z",
  },
  {
    id:        "o-003",
    userId:    "u-buyer-2",
    status:    "processing",
    totalCents: 9900 + 29900, // merino sweater + dumbbells
    items: [
      { productId: "p-cloth-001", qty: 1, priceCents: 9900 },
      { productId: "p-sport-002", qty: 1, priceCents: 29900 },
    ],
    createdAt: "2026-02-05T09:00:00Z",
  },
];
