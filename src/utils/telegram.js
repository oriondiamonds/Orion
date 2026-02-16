// Telegram Bot API integration for order notifications

/**
 * Send a message to Telegram via Bot API
 * @param {string} message - The message to send (supports HTML formatting)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendTelegramNotification(message) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("Telegram credentials missing, skipping notification");
    return { success: false, error: "Missing credentials" };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML", // allows <b>, <i>, etc.
        }),
      }
    );

    const data = await response.json();

    if (!data.ok) {
      console.error("Telegram API error:", data);
      return { success: false, error: data.description };
    }

    return { success: true };
  } catch (error) {
    console.error("Telegram notification failed:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Format order details into a Telegram message
 * @param {Object} order - The order object from database
 * @returns {string} Formatted HTML message for Telegram
 */
export function formatOrderMessage(order) {
  const {
    order_number,
    customer_email,
    shipping_address,
    items,
    subtotal,
    discount_amount,
    coupon_code,
    razorpay_order_id,
    razorpay_payment_id,
    payment_method,
  } = order;

  const finalAmount = subtotal - (discount_amount || 0);

  // Format items list
  const itemsList = items
    .map((item, index) => {
      const optionsText = item.selectedOptions
        ?.map((opt) => `${opt.name}: ${opt.value}`)
        .join(", ");

      return `${index + 1}. ${item.title}${item.variantTitle ? ` (${item.variantTitle})` : ""}
   Qty: ${item.quantity} × ₹${Number(item.price || 0).toLocaleString("en-IN")}
   ${optionsText ? `Options: ${optionsText}` : ""}`;
    })
    .join("\n\n");

  // Build message
  let message = `<b>🎉 NEW ORDER RECEIVED!</b>\n\n`;
  message += `<b>Order Number:</b> ${order_number}\n`;
  message += `<b>Customer Email:</b> ${customer_email}\n\n`;

  message += `<b>📦 ITEMS:</b>\n${itemsList}\n\n`;

  message += `<b>💰 PRICING:</b>\n`;
  message += `Subtotal: ₹${Number(subtotal).toLocaleString("en-IN")}\n`;

  if (coupon_code && discount_amount > 0) {
    message += `Discount (${coupon_code}): -₹${Number(discount_amount).toLocaleString("en-IN")}\n`;
  }

  message += `<b>Total: ₹${Number(finalAmount).toLocaleString("en-IN")}</b>\n\n`;

  message += `<b>💳 PAYMENT DETAILS:</b>\n`;
  message += `Payment Method: ${payment_method || "Razorpay"}\n`;
  message += `Order ID: ${razorpay_order_id}\n`;
  message += `Payment ID: ${razorpay_payment_id}\n\n`;

  message += `<b>📍 SHIPPING ADDRESS:</b>\n`;
  message += `${shipping_address.firstName} ${shipping_address.lastName}\n`;
  message += `${shipping_address.phone}\n`;
  message += `${shipping_address.address1}`;

  if (shipping_address.address2) {
    message += `, ${shipping_address.address2}`;
  }

  message += `\n${shipping_address.city}, ${shipping_address.state} ${shipping_address.zip}`;

  return message;
}
