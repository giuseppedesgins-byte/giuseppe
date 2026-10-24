import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * Shared ownership checks for the seller portal (token-based access — see
 * SellerAccount.portalToken). Every seller server action must go through one of these
 * rather than trusting an id in the form body, so a seller can never act on another
 * brand's product or order just by guessing/editing an id (spec §30 — no cross-seller
 * access).
 */
export async function getSellerAccountByToken(token: string) {
  const sellerAccount = await prisma.sellerAccount.findUnique({ where: { portalToken: token }, include: { brand: true } });
  if (!sellerAccount) notFound();
  return sellerAccount;
}

export async function requireSellerOwnsProduct(token: string, productId: string) {
  const sellerAccount = await getSellerAccountByToken(token);
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.brandId !== sellerAccount.brandId) notFound();
  return { sellerAccount, product };
}

export async function requireSellerOwnsOrder(token: string, orderId: string) {
  const sellerAccount = await getSellerAccountByToken(token);
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.brandId !== sellerAccount.brandId) notFound();
  return { sellerAccount, order };
}
