/**
 * Seed script — fictional sample brands/products so the site looks complete in dev.
 * No real/copyrighted brand names or assets are used. Images are stock editorial
 * photography from Unsplash (free to use), standing in for real brand submissions.
 *
 * Run: npm run db:seed
 */
import { PrismaClient, BrandStatus, ProductStatus, ApplicationStatus, InventoryModel } from "@prisma/client";

const prisma = new PrismaClient();

const img = (id: string) => `https://images.unsplash.com/${id}?w=1400&q=80&auto=format&fit=crop`;

const CATEGORIES = [
  { slug: "outerwear", name: "Outerwear" },
  { slug: "knitwear", name: "Knitwear" },
  { slug: "footwear", name: "Footwear" },
  { slug: "accessories", name: "Accessories" },
  { slug: "denim", name: "Denim" },
  { slug: "jewelry", name: "Jewelry" },
];

const BRANDS = [
  {
    slug: "novara-atelier",
    name: "Novara Atelier",
    legalName: "Novara Atelier S.R.L.",
    country: "Italy",
    city: "Florence",
    story:
      "Founded by two sisters in a Florence leather workshop, Novara Atelier reimagines heritage Italian tailoring for a new generation — small batches, vegetable-tanned leather, and construction meant to outlive trends.",
    heroImageUrl: img("photo-1490481651871-ab68de25d43d"),
    logoUrl: img("photo-1445205170230-053b83016050"),
    foundingBrand: true,
    website: "https://example.com/novara-atelier",
    instagram: "@novara.atelier",
    products: [
      { name: "Officina Wool Coat", priceCents: 68000, category: "outerwear", desc: "A boxy, unlined wool coat cut from deadstock Biella mill fabric.", img: img("photo-1541099649105-f69ad21f3246") },
      { name: "Bardi Leather Tote", priceCents: 42000, category: "accessories", desc: "Vegetable-tanned calfskin tote, hand-stitched in Florence.", img: img("photo-1524498391382-6dd6dd88ce5c") },
      { name: "Piano Knit Vest", priceCents: 21000, category: "knitwear", desc: "Merino rib-knit vest, cropped fit.", img: img("photo-1516762689617-e1cffcef479d") },
    ],
  },
  {
    slug: "kite-and-anchor",
    name: "Kite & Anchor",
    country: "Portugal",
    city: "Porto",
    story:
      "Kite & Anchor works exclusively with a single family-run knitting mill outside Porto, producing minimal, technical knitwear in small, numbered runs.",
    heroImageUrl: img("photo-1490114538077-0a7f8cb49889"),
    logoUrl: img("photo-1523381210434-271e8be1f52b"),
    foundingBrand: true,
    instagram: "@kiteandanchor",
    products: [
      { name: "Ribeira Merino Sweater", priceCents: 26000, category: "knitwear", desc: "Fisherman-inspired merino sweater in a heavyweight gauge.", img: img("photo-1434389677669-e08b4cac3105") },
      { name: "Dourama Scarf", priceCents: 9800, category: "accessories", desc: "Oversized brushed wool scarf, hand-fringed.", img: img("photo-1520903920243-00d872a2d1c9") },
    ],
  },
  {
    slug: "faro-studio",
    name: "Faro Studio",
    country: "Mexico",
    city: "Mexico City",
    story:
      "Faro Studio is a footwear atelier built around a single idea: shoes should be made to be resoled, not replaced. Every pair is built on a Goodyear-welt construction by a third-generation cobbler collective.",
    heroImageUrl: img("photo-1549298916-b41d501d3772"),
    logoUrl: img("photo-1441984904996-e0b6ba687e04"),
    foundingBrand: false,
    instagram: "@faro.studio",
    products: [
      { name: "Sonora Boot", priceCents: 32000, category: "footwear", desc: "Goodyear-welted boot in natural vegetable-tanned leather.", img: img("photo-1520639888713-7851133b1ed0") },
      { name: "Loma Loafer", priceCents: 24500, category: "footwear", desc: "Hand-lasted penny loafer, resole program included.", img: img("photo-1533867617858-e7b97e060509") },
    ],
  },
  {
    slug: "seomra",
    name: "Seomra",
    country: "Ireland",
    city: "Dublin",
    story:
      "Seomra ('room' in Irish) makes considered basics from Irish linen and wool, designed to be worn for a decade, not a season.",
    heroImageUrl: img("photo-1441986300917-64674bd600d8"),
    logoUrl: img("photo-1490578474895-699cd4e2cf59"),
    foundingBrand: true,
    instagram: "@seomra.studio",
    products: [
      { name: "Aran Fisherman Jumper", priceCents: 24000, category: "knitwear", desc: "Traditional cable-knit jumper in undyed Irish wool.", img: img("photo-1516575150278-77136aed6920") },
      { name: "Linen Field Jacket", priceCents: 31000, category: "outerwear", desc: "Washed Irish linen jacket with brass hardware.", img: img("photo-1544441893-675973e31985") },
    ],
  },
  {
    slug: "nilo-house",
    name: "Nilo House",
    country: "Egypt",
    city: "Cairo",
    story:
      "Nilo House works with cotton growers in the Nile Delta to produce ultra-fine long-staple cotton shirting, cut and sewn in Cairo.",
    heroImageUrl: img("photo-1489987707025-afc232f7ea0f"),
    logoUrl: img("photo-1503342217505-b0a15ec3261c"),
    foundingBrand: false,
    instagram: "@nilo.house",
    products: [
      { name: "Delta Cotton Shirt", priceCents: 15500, category: "accessories", desc: "Long-staple Egyptian cotton shirt, mother-of-pearl buttons.", img: img("photo-1596755094514-f87e34085b2c") },
    ],
  },
  {
    slug: "anahata-denim",
    name: "Anahata Denim",
    country: "India",
    city: "Ahmedabad",
    story:
      "Anahata Denim revives a nearly-extinct handloom denim tradition from Gujarat, weaving selvedge denim on wooden shuttle looms.",
    heroImageUrl: img("photo-1475178626620-a4d074967452"),
    logoUrl: img("photo-1487222477894-8943e31ef7b2"),
    foundingBrand: true,
    instagram: "@anahata.denim",
    products: [
      { name: "Handloom Selvedge Jean", priceCents: 27500, category: "denim", desc: "Raw handloom selvedge denim, tapered fit.", img: img("photo-1541099649105-f69ad21f3246") },
      { name: "Chainstitch Trucker Jacket", priceCents: 29500, category: "denim", desc: "Chainstitched trucker jacket in indigo handloom denim.", img: img("photo-1551028719-00167b16eac5") },
      { name: "Kumaon Silver Cuff", priceCents: 12000, category: "jewelry", desc: "Hand-hammered sterling silver cuff from Kumaoni silversmiths.", img: img("photo-1515562141207-7a88fb7ce338") },
    ],
  },
];

async function main() {
  console.log("Seeding categories...");
  for (const c of CATEGORIES) {
    await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }

  console.log("Seeding admin...");
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@giuseppe.com" },
    update: {},
    create: { email: "admin@giuseppe.com", role: "ADMIN" },
  });
  await prisma.admin.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: { userId: adminUser.id, name: "Giuseppe Admin" },
  });

  console.log("Seeding brands + products...");
  for (const b of BRANDS) {
    const brand = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: {},
      create: {
        slug: b.slug,
        name: b.name,
        legalName: (b as any).legalName ?? null,
        status: BrandStatus.ACTIVE,
        logoUrl: b.logoUrl,
        heroImageUrl: b.heroImageUrl,
        story: b.story,
        country: b.country,
        city: b.city,
        website: (b as any).website ?? null,
        instagram: b.instagram,
        foundingBrand: b.foundingBrand,
        launchDate: new Date(),
        commissionBps: 900,
      },
    });

    if (b.foundingBrand) {
      await prisma.membership.upsert({
        where: { brandId: brand.id },
        update: {},
        create: {
          brandId: brand.id,
          planName: "founding_brand",
          status: "TRIAL",
          trialEndsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          monthlyPriceCents: 2900,
          commissionBps: 900,
        },
      });
    }

    await prisma.shippingOption.createMany({
      data: [
        { brandId: brand.id, region: "ALL", method: "Standard", costCents: 1200, estDeliveryDaysMin: 7, estDeliveryDaysMax: 14, trackingAvailable: true },
        { brandId: brand.id, region: "ALL", method: "Express", costCents: 3500, estDeliveryDaysMin: 2, estDeliveryDaysMax: 4, trackingAvailable: true },
      ],
      skipDuplicates: true,
    });

    await prisma.sellerPerformance.upsert({
      where: { brandId: brand.id },
      update: {},
      create: { brandId: brand.id },
    });

    for (let i = 0; i < b.products.length; i++) {
      const p = b.products[i];
      const slug = `${b.slug}-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
      const product = await prisma.product.upsert({
        where: { slug },
        update: {},
        create: {
          slug,
          brandId: brand.id,
          name: p.name,
          description: p.desc,
          priceCents: p.priceCents,
          currency: "usd",
          materials: "See product description. Full materials breakdown provided by brand at application review.",
          sizingInfo: "True to size. Full size chart available at checkout.",
          colorOptions: ["Natural"],
          status: ProductStatus.PUBLISHED,
          featured: i === 0,
          newArrival: i === b.products.length - 1,
          processingTime: "2-4 business days",
          returnPolicy: "Returns accepted within 14 days in original condition.",
          refundPolicy: "Refunded to original payment method within 5-7 business days of receipt.",
          categories: { connect: [{ slug: p.category }] },
        },
      });

      await prisma.productImage.createMany({
        data: [{ productId: product.id, url: p.img, altText: p.name, position: 0 }],
        skipDuplicates: true,
      });
    }
  }

  console.log("Seeding a sample pending brand application...");
  await prisma.brandApplication.upsert({
    where: { id: "seed-application-1" },
    update: {},
    create: {
      id: "seed-application-1",
      status: ApplicationStatus.PENDING,
      founderName: "Alessandra Conti",
      brandName: "Conti & Figli",
      email: "alessandra@example.com",
      country: "Italy",
      city: "Milan",
      website: "https://example.com/conti-figli",
      instagram: "@contiefigli",
      brandStory:
        "A third-generation glovemaking family transitioning from private commissions to a small ready-to-wear line.",
      yearFounded: 1968,
      productCategories: ["Accessories"],
      targetCustomer: "Discerning customers seeking heirloom-quality leather goods.",
      differentiation: "Three generations of glovemaking expertise; all pieces made to order in Milan.",
      whyJoinGiuseppe: "Seeking a curated audience that values craftsmanship over volume.",
      productImageUrls: [img("photo-1524498391382-6dd6dd88ce5c")],
      productVideoUrls: [],
      confirmProductsReal: true,
      confirmPhotosAccurate: true,
      confirmAuthorizedToSell: true,
      confirmNotCounterfeit: true,
      confirmInfoTruthful: true,
      inventoryModel: InventoryModel.MADE_TO_ORDER,
      avgProcessingTime: "10-14 days",
      avgShippingTime: "5-7 days",
      countriesShippedTo: ["Italy", "France", "United States"],
      shippingCarriers: ["DHL"],
      trackingProvided: true,
      maxWeeklyOrderCapacity: 25,
      customerSupportEmail: "support@example.com",
      manufacturingLocation: "Milan, Italy",
      manufacturingType: "in-house",
      agreeApprovalDiscretion: true,
      agreeAdditionalVerification: true,
      agreeRemovalForViolations: true,
      agreeAccurateRepresentation: true,
      agreeFulfillmentResponsibility: true,
      agreeMarketplaceRules: true,
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
