import nodemailer from "nodemailer";

// ─── Transport ────────────────────────────────────────────────────────────────

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false, // STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FROM = `Orion Diamonds <${process.env.SMTP_USER}>`;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(amount) {
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

// ─── Customer order confirmation email ────────────────────────────────────────

function buildCustomerEmailHtml(order) {
  const {
    order_number,
    items,
    subtotal,
    discount_amount,
    coupon_code,
    shipping_address: addr,
    payment_method,
  } = order;

  const finalAmount = subtotal - (discount_amount || 0);

  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;">
          <div style="font-weight:600;color:#0a1833;">${item.title}</div>
          ${item.variantTitle ? `<div style="font-size:13px;color:#666;margin-top:2px;">${item.variantTitle}</div>` : ""}
          ${
            item.selectedOptions?.length
              ? `<div style="font-size:12px;color:#888;margin-top:2px;">${item.selectedOptions.map((o) => `${o.name}: ${o.value}`).join(" · ")}</div>`
              : ""
          }
        </td>
        <td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;text-align:center;color:#555;">×${item.quantity}</td>
        <td style="padding:12px 8px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;color:#0a1833;">${formatINR(Number(item.price) * item.quantity)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Order Confirmed — ${order_number}</title>
</head>
<body style="margin:0;padding:0;background:#f0ece6;font-family:'Helvetica Neue',Arial,sans-serif;">

  <!-- Header -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1833;">
    <tr>
      <td align="center" style="padding:28px 24px 24px;">
        <img src="https://www.oriondiamonds.in/nobglogo.png" alt="Orion Diamonds" width="200" height="auto" style="display:block;max-width:200px;" />
        <div style="color:#c9a84c;font-size:11px;margin-top:8px;letter-spacing:3px;">LAB-GROWN DIAMONDS</div>
      </td>
    </tr>
  </table>

  <!-- Body -->
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Gold accent line -->
          <tr><td style="height:3px;background:linear-gradient(90deg,#c9a84c,#e8d5a3,#c9a84c);"></td></tr>

          <!-- Title -->
          <tr>
            <td style="padding:36px 40px 28px;text-align:center;border-bottom:1px solid #ece8e0;">
              <h1 style="margin:0 0 6px;font-size:24px;font-weight:300;color:#0a1833;letter-spacing:1px;">Order Confirmed</h1>
              <p style="margin:0 0 20px;color:#888;font-size:13px;letter-spacing:0.5px;">Thank you for choosing Orion Diamonds</p>
              <div style="display:inline-block;background:#f8f4ed;border:1px solid #c9a84c55;border-radius:2px;padding:10px 24px;">
                <span style="font-size:11px;color:#999;letter-spacing:2px;text-transform:uppercase;">Order Number</span><br/>
                <span style="font-size:20px;font-weight:600;color:#0a1833;letter-spacing:1px;">${order_number}</span>
              </div>
            </td>
          </tr>

          <!-- Items -->
          <tr>
            <td style="padding:24px 40px;">
              <h2 style="margin:0 0 16px;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#0a1833;font-weight:600;">Order Summary</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
                <thead>
                  <tr style="border-bottom:2px solid #0a1833;">
                    <th style="padding:8px;text-align:left;font-weight:600;color:#0a1833;">Item</th>
                    <th style="padding:8px;text-align:center;font-weight:600;color:#0a1833;">Qty</th>
                    <th style="padding:8px;text-align:right;font-weight:600;color:#0a1833;">Price</th>
                  </tr>
                </thead>
                <tbody>${itemRows}</tbody>
              </table>

              <!-- Totals -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;font-size:14px;">
                <tr>
                  <td style="padding:6px 8px;color:#555;">Subtotal</td>
                  <td style="padding:6px 8px;text-align:right;color:#555;">${formatINR(subtotal)}</td>
                </tr>
                ${
                  coupon_code && discount_amount > 0
                    ? `<tr>
                    <td style="padding:6px 8px;color:#2e7d32;">Discount (${coupon_code})</td>
                    <td style="padding:6px 8px;text-align:right;color:#2e7d32;">−${formatINR(discount_amount)}</td>
                  </tr>`
                    : ""
                }
                <tr style="border-top:2px solid #0a1833;">
                  <td style="padding:10px 8px;font-weight:bold;font-size:16px;color:#0a1833;">Total Paid</td>
                  <td style="padding:10px 8px;text-align:right;font-weight:bold;font-size:16px;color:#0a1833;">${formatINR(finalAmount)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Shipping + Payment -->
          <tr>
            <td style="padding:0 40px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding-right:16px;vertical-align:top;">
                    <h2 style="margin:0 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#0a1833;">Shipping To</h2>
                    <div style="font-size:13px;color:#555;line-height:1.7;">
                      <strong>${addr.firstName} ${addr.lastName}</strong><br/>
                      ${addr.phone}<br/>
                      ${addr.address1}${addr.address2 ? `, ${addr.address2}` : ""}<br/>
                      ${addr.city}, ${addr.state} ${addr.zip}
                    </div>
                  </td>
                  <td width="50%" style="padding-left:16px;vertical-align:top;">
                    <h2 style="margin:0 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#0a1833;">Payment</h2>
                    <div style="font-size:13px;color:#555;line-height:1.7;">
                      ${payment_method || "Razorpay"}<br/>
                      <span style="color:#2e7d32;font-weight:600;">Payment Successful</span>
                    </div>
                    <h2 style="margin:16px 0 6px;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#0a1833;">Delivery</h2>
                    <div style="font-size:13px;color:#555;">15-21 business days</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer note -->
          <tr>
            <td style="padding:24px 40px;background:#f8f4ed;text-align:center;border-top:1px solid #ece8e0;">
              <p style="margin:0 0 6px;font-size:13px;color:#666;">Questions? Reply to this email or WhatsApp us.</p>
              <p style="margin:0;font-size:12px;color:#aaa;">We'll keep you updated as your order is prepared and shipped.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

  <!-- Bottom bar -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1833;">
    <tr>
      <td align="center" style="padding:20px 24px;">
        <div style="font-size:11px;color:#ffffff55;letter-spacing:1px;">© ${new Date().getFullYear()} ORION DIAMONDS · oriondiamonds.in</div>
        <div style="font-size:11px;color:#c9a84c55;margin-top:4px;letter-spacing:2px;">LAB-GROWN · CERTIFIED · ETHICALLY SOURCED</div>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ─── Admin notification email ─────────────────────────────────────────────────

function buildAdminEmailHtml(order) {
  const {
    order_number,
    customer_email,
    items,
    subtotal,
    discount_amount,
    coupon_code,
    shipping_address: addr,
    payment_method,
    razorpay_order_id,
    razorpay_payment_id,
  } = order;

  const finalAmount = subtotal - (discount_amount || 0);

  const itemsList = items
    .map(
      (item) =>
        `<li>${item.title}${item.variantTitle ? ` — ${item.variantTitle}` : ""} · Qty ${item.quantity} · ${formatINR(Number(item.price) * item.quantity)}</li>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<body style="font-family:monospace;font-size:14px;color:#111;padding:24px;">
  <h2 style="color:#0a1833;">🎉 New Order — ${order_number}</h2>
  <p><strong>Customer:</strong> ${customer_email}</p>
  <p><strong>Amount:</strong> ${formatINR(finalAmount)}${coupon_code ? ` (${coupon_code}: −${formatINR(discount_amount)})` : ""}</p>
  <p><strong>Payment:</strong> ${payment_method || "Razorpay"}</p>
  <p><strong>Razorpay Order ID:</strong> ${razorpay_order_id}</p>
  <p><strong>Razorpay Payment ID:</strong> ${razorpay_payment_id}</p>
  <hr/>
  <h3>Items</h3>
  <ul>${itemsList}</ul>
  <hr/>
  <h3>Ship To</h3>
  <p>
    ${addr.firstName} ${addr.lastName}<br/>
    ${addr.phone}<br/>
    ${addr.address1}${addr.address2 ? `, ${addr.address2}` : ""}<br/>
    ${addr.city}, ${addr.state} ${addr.zip}
  </p>
</body>
</html>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function sendOrderConfirmationEmail(order) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("SMTP credentials not set — skipping customer email");
    return;
  }

  const transporter = createTransport();
  const finalAmount = order.subtotal - (order.discount_amount || 0);

  await transporter.sendMail({
    from: FROM,
    to: order.customer_email,
    subject: `Your order is confirmed! — ${order.order_number} | Orion Diamonds`,
    html: buildCustomerEmailHtml(order),
    text: `Order ${order.order_number} confirmed. Total: ${formatINR(finalAmount)}. Thank you for shopping with Orion Diamonds.`,
  });
}

export async function sendAdminOrderEmail(order) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !ADMIN_EMAIL) {
    console.warn("SMTP/admin email not set — skipping admin email");
    return;
  }

  const transporter = createTransport();
  const finalAmount = order.subtotal - (order.discount_amount || 0);

  await transporter.sendMail({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `New Order — ${order.order_number} (${formatINR(finalAmount)})`,
    html: buildAdminEmailHtml(order),
  });
}
