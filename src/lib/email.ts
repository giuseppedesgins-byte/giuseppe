import { Resend } from "resend";
import { SITE_NAME } from "@/lib/brand";

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
       <p style="font-size:15px;line-height:1.6;">Order <strong>${orderNumber}</strong> from <strong>${brandName}</strong> — total ${totalLabel}. ${brandName} will handle fulfillment and share tracking once your order ships.</p>`
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

  orderRefunded: (to: string, orderNumber: string, amountLabel: string) =>
    send(
      to,
      `Your order has been refunded — ${orderNumber}`,
      `<h1 style="font-size:22px;margin:0 0 16px;">Your refund is on its way.</h1>
       <p style="font-size:15px;line-height:1.6;">Order <strong>${orderNumber}</strong> has been refunded in full — <strong>${amountLabel}</strong>. It can take 5-10 business days to appear on your original payment method, depending on your bank.</p>`
    ),
};
