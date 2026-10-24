import { Resend } from "resend";
import { SITE_NAME, SITE_URL } from "@/lib/brand";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM ?? `${SITE_NAME} <hello@giuseppe.com>`;

function shell(bodyHtml: string) {
  return `
  <div style="font-family: Georgia, serif; background:#F7F5F2; padding: 40px 24px;">
    <div style="max-width:520px;margin:0 auto;background:#FFFFFF;padding:40px;border:1px solid #E4E0D9;">
      <p style="letter-spacing:0.2em;text-transform:uppercase;font-size:12px;color:#8A8478;margin:0 0 24px;">${SITE_NAME}</p>
      ${bodyHtml}
      <p style="margin-top:40px;font-size:12px;color:#8A8478;">— ${SITE_NAME}</p>
    </div>
  </div>`;
}

async function send(to: string, subject: string, html: string) {
  if (!resend) {
    // eslint-disable-next-line no-console
    console.log(`[email:dev-mode] to=${to} subject="${subject}" (RESEND_API_KEY not set — not sent)`);
    return;
  }
  await resend.emails.send({ from: FROM, to, subject, html: shell(html) });
}

export const emails = {
  applicationReceived: (to: string, brandName: string) =>
    send(
      to,
      "We've received your Giuseppe application",
      `<h1 style="font-size:22px;margin:0 0 16px;">Thank you for applying to Giuseppe.</h1>
       <p style="font-size:15px;line-height:1.6;">We've received your application for <strong>${brandName}</strong>. Our team reviews every submission carefully — you'll hear from us soon.</p>`
    ),

  applicationAccepted: (to: string, brandName: string) =>
    send(
      to,
      "Welcome to Giuseppe",
      `<h1 style="font-size:22px;margin:0 0 16px;">Welcome to Giuseppe.</h1>
       <p style="font-size:15px;line-height:1.6;"><strong>${brandName}</strong> has been accepted. Our team will follow up shortly with next steps to build your storefront and prepare for launch.</p>`
    ),

  applicationRejected: (to: string, brandName: string) =>
    send(
      to,
      "Your Giuseppe application",
      `<h1 style="font-size:22px;margin:0 0 16px;">Thank you for your interest in Giuseppe.</h1>
       <p style="font-size:15px;line-height:1.6;">After careful review, we're not able to move forward with <strong>${brandName}</strong> at this time. This isn't a reflection of the quality of your work — Giuseppe's curation is intentionally narrow. We'd welcome a future application as your brand evolves.</p>`
    ),

  applicationNeedsInfo: (to: string, brandName: string, note: string) =>
    send(
      to,
      "A bit more information needed — Giuseppe application",
      `<h1 style="font-size:22px;margin:0 0 16px;">We'd like a bit more information.</h1>
       <p style="font-size:15px;line-height:1.6;">Thanks for applying with <strong>${brandName}</strong>. Before we can complete our review, could you share the following?</p>
       <p style="font-size:15px;line-height:1.6;background:#F7F5F2;padding:16px;">${note}</p>`
    ),

  orderConfirmation: (to: string, orderNumber: string, brandName: string, totalLabel: string) =>
    send(
      to,
      `Order confirmed — ${orderNumber}`,
      `<h1 style="font-size:22px;margin:0 0 16px;">Your order is confirmed.</h1>
       <p style="font-size:15px;line-height:1.6;">Order <strong>${orderNumber}</strong> from <strong>${brandName}</strong> — total ${totalLabel}. ${brandName} will handle fulfillment and share tracking once your order ships.</p>
       <p style="font-size:15px;line-height:1.6;"><a href="${SITE_URL}/orders/${orderNumber}?email=${encodeURIComponent(to)}" style="color:#141312;">View your order or report a problem</a></p>`
    ),

  sellerNewOrder: (to: string, orderNumber: string) =>
    send(
      to,
      `New order — ${orderNumber}`,
      `<h1 style="font-size:22px;margin:0 0 16px;">You have a new order.</h1>
       <p style="font-size:15px;line-height:1.6;">Order <strong>${orderNumber}</strong> is ready for fulfillment. Log in to your seller dashboard to view details and add tracking.</p>`
    ),

  shippingConfirmation: (to: string, orderNumber: string, trackingNumber: string, trackingUrl?: string | null) =>
    send(
      to,
      `Your order has shipped — ${orderNumber}`,
      `<h1 style="font-size:22px;margin:0 0 16px;">Your order is on its way.</h1>
       <p style="font-size:15px;line-height:1.6;">Order <strong>${orderNumber}</strong> has shipped. Tracking number: <strong>${trackingNumber}</strong>.</p>
       ${trackingUrl ? `<p><a href="${trackingUrl}" style="color:#141312;">Track your package</a></p>` : ""}`
    ),

  orderRefunded: (to: string, orderNumber: string, amountLabel: string, partial = false) =>
    send(
      to,
      `Your order has been refunded — ${orderNumber}`,
      `<h1 style="font-size:22px;margin:0 0 16px;">Your refund is on its way.</h1>
       <p style="font-size:15px;line-height:1.6;">Order <strong>${orderNumber}</strong> has been ${partial ? "partially " : ""}refunded — <strong>${amountLabel}</strong>. It can take 5-10 business days to appear on your original payment method, depending on your bank.</p>`
    ),

  orderCancelledBySeller: (to: string, orderNumber: string, brandName: string, amountLabel: string) =>
    send(
      to,
      `Your order was cancelled — ${orderNumber}`,
      `<h1 style="font-size:22px;margin:0 0 16px;">Your order has been cancelled.</h1>
       <p style="font-size:15px;line-height:1.6;"><strong>${brandName}</strong> was unable to fulfill order <strong>${orderNumber}</strong> and has cancelled it. You've been refunded in full — <strong>${amountLabel}</strong> — to your original payment method.</p>`
    ),

  // --- Seller-facing: product review outcomes ---

  productApproved: (to: string, productName: string) =>
    send(
      to,
      `"${productName}" is now live on Giuseppe`,
      `<h1 style="font-size:22px;margin:0 0 16px;">Your product is live.</h1>
       <p style="font-size:15px;line-height:1.6;"><strong>${productName}</strong> has been approved and is now visible on Giuseppe.</p>`
    ),

  productNeedsChanges: (to: string, productName: string, note: string) =>
    send(
      to,
      `A few changes needed — "${productName}"`,
      `<h1 style="font-size:22px;margin:0 0 16px;">We'd like a few changes before this goes live.</h1>
       <p style="font-size:15px;line-height:1.6;"><strong>${productName}</strong> needs some adjustments before Giuseppe can approve it:</p>
       <p style="font-size:15px;line-height:1.6;background:#F7F5F2;padding:16px;">${note}</p>
       <p style="font-size:15px;line-height:1.6;">Update it in your seller portal and resubmit whenever you're ready.</p>`
    ),

  productRejected: (to: string, productName: string, note: string) =>
    send(
      to,
      `"${productName}" was not approved`,
      `<h1 style="font-size:22px;margin:0 0 16px;">This product wasn't approved.</h1>
       <p style="font-size:15px;line-height:1.6;"><strong>${productName}</strong> was not approved for Giuseppe.</p>
       ${note ? `<p style="font-size:15px;line-height:1.6;background:#F7F5F2;padding:16px;">${note}</p>` : ""}`
    ),

  reactivationApproved: (to: string, productName: string) =>
    send(
      to,
      `"${productName}" is back live`,
      `<h1 style="font-size:22px;margin:0 0 16px;">Your product is live again.</h1>
       <p style="font-size:15px;line-height:1.6;"><strong>${productName}</strong> has been reactivated and is now visible on Giuseppe again.</p>`
    ),

  reactivationDenied: (to: string, productName: string, note: string) =>
    send(
      to,
      `Reactivation request — "${productName}"`,
      `<h1 style="font-size:22px;margin:0 0 16px;">Not quite ready to relist.</h1>
       <p style="font-size:15px;line-height:1.6;">The reactivation request for <strong>${productName}</strong> wasn't approved yet.</p>
       ${note ? `<p style="font-size:15px;line-height:1.6;background:#F7F5F2;padding:16px;">${note}</p>` : ""}`
    ),

  productUpdateRequestReviewed: (to: string, productName: string, approved: boolean, note?: string) =>
    send(
      to,
      approved ? `Your update to "${productName}" was approved` : `Your update to "${productName}" needs another look`,
      `<h1 style="font-size:22px;margin:0 0 16px;">${approved ? "Your changes are live." : "Your proposed changes weren't approved."}</h1>
       <p style="font-size:15px;line-height:1.6;">Your proposed update to <strong>${productName}</strong> was ${approved ? "approved and applied" : "not approved"}.</p>
       ${note ? `<p style="font-size:15px;line-height:1.6;background:#F7F5F2;padding:16px;">${note}</p>` : ""}`
    ),

  // --- Case/issue system ---

  issueUpdate: (to: string, orderNumber: string, statusLabel: string, note?: string) =>
    send(
      to,
      `Update on your report — order ${orderNumber}`,
      `<h1 style="font-size:22px;margin:0 0 16px;">There's an update on your report.</h1>
       <p style="font-size:15px;line-height:1.6;">Order <strong>${orderNumber}</strong>: <strong>${statusLabel}</strong>.</p>
       ${note ? `<p style="font-size:15px;line-height:1.6;background:#F7F5F2;padding:16px;">${note}</p>` : ""}`
    ),
};
