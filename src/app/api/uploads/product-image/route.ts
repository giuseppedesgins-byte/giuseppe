import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthed } from "@/lib/auth";
import { uploadProductImage, isUploadConfigured } from "@/lib/upload";

/**
 * Shared upload endpoint for both the admin product editor and the seller "propose a
 * product" form. Authorization is either a valid admin session cookie, or a seller
 * portalToken that actually owns the brandId being uploaded to — no other caller can
 * write to storage. This is the one place both surfaces route through so ownership
 * checks and file validation (type/size, in lib/upload.ts) can't be bypassed by either.
 */
export async function POST(req: NextRequest) {
  if (!isUploadConfigured()) {
    return NextResponse.json(
      {
        error:
          "Image uploads aren't configured yet — add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (and create a public 'product-media' Storage bucket in Supabase) to enable this.",
      },
      { status: 503 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const brandId = String(formData.get("brandId") || "");
  const sellerToken = formData.get("sellerToken") ? String(formData.get("sellerToken")) : null;

  if (!(file instanceof File) || !brandId) {
    return NextResponse.json({ error: "Missing file or brandId." }, { status: 400 });
  }

  let authorized = false;
  if (isAdminAuthed()) {
    authorized = true;
  } else if (sellerToken) {
    const sellerAccount = await prisma.sellerAccount.findUnique({ where: { portalToken: sellerToken } });
    if (sellerAccount && sellerAccount.brandId === brandId) authorized = true;
  }
  if (!authorized) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  try {
    const url = await uploadProductImage({ brandId, file });
    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Upload failed." }, { status: 400 });
  }
}
