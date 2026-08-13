import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { emails } from "@/lib/email";

const schema = z.object({
  founderName: z.string().min(1),
  brandName: z.string().min(1),
  legalBusinessName: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  country: z.string().min(1),
  city: z.string().min(1),
  website: z.string().optional(),
  instagram: z.string().optional(),
  tiktok: z.string().optional(),
  otherSocialLinks: z.string().optional(),
  brandStory: z.string().min(1),
  yearFounded: z.number().optional(),
  productCategories: z.array(z.string()).default([]),
  targetCustomer: z.string().optional(),
  differentiation: z.string().optional(),
  whyJoinGiuseppe: z.string().optional(),
  productImageUrls: z.array(z.string()).default([]),
  productVideoUrls: z.array(z.string()).default([]),
  lookbookUrl: z.string().optional(),
  productDescriptions: z.string().optional(),
  materials: z.string().optional(),
  sizingInfo: z.string().optional(),
  inventoryModel: z.enum(["STOCKED", "MADE_TO_ORDER", "BOTH"]).optional().or(z.literal("")),
  avgProcessingTime: z.string().optional(),
  avgShippingTime: z.string().optional(),
  countriesShippedTo: z.array(z.string()).default([]),
  shippingCarriers: z.array(z.string()).default([]),
  trackingProvided: z.boolean().optional(),
  maxWeeklyOrderCapacity: z.number().optional(),
  customerSupportEmail: z.string().optional(),
  returnPolicy: z.string().optional(),
  refundPolicy: z.string().optional(),
  manufacturingLocation: z.string().optional(),
  manufacturingType: z.string().optional(),
  manufacturingNotes: z.string().optional(),
  confirmProductsReal: z.boolean(),
  confirmPhotosAccurate: z.boolean(),
  confirmAuthorizedToSell: z.boolean(),
  confirmNotCounterfeit: z.boolean(),
  confirmInfoTruthful: z.boolean(),
  agreeApprovalDiscretion: z.boolean(),
  agreeAdditionalVerification: z.boolean(),
  agreeRemovalForViolations: z.boolean(),
  agreeAccurateRepresentation: z.boolean(),
  agreeFulfillmentResponsibility: z.boolean(),
  agreeMarketplaceRules: z.boolean(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check your application for missing or invalid fields.", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const requiredConfirmations = [
    data.confirmProductsReal,
    data.confirmPhotosAccurate,
    data.confirmAuthorizedToSell,
    data.confirmNotCounterfeit,
    data.confirmInfoTruthful,
    data.agreeApprovalDiscretion,
    data.agreeAdditionalVerification,
    data.agreeRemovalForViolations,
    data.agreeAccurateRepresentation,
    data.agreeFulfillmentResponsibility,
    data.agreeMarketplaceRules,
  ];
  if (requiredConfirmations.some((v) => v !== true)) {
    return NextResponse.json({ error: "All confirmations and agreements must be accepted." }, { status: 400 });
  }

  const application = await prisma.brandApplication.create({
    data: {
      ...data,
      inventoryModel: data.inventoryModel || undefined,
    } as any,
  });

  await emails.applicationReceived(data.email, data.brandName);

  return NextResponse.json({ id: application.id }, { status: 201 });
}
