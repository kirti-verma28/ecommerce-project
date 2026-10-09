import threading

import requests
from django.conf import settings
from django.utils.html import escape

BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def _post(payload):
    try:
        requests.post(
            BREVO_URL,
            json=payload,
            timeout=10,
            headers={"api-key": settings.BREVO_API_KEY, "accept": "application/json"},
        )
    except requests.RequestException:
        pass  # an email problem must never break an order


def send_order_confirmation(order):
    user = order.user
    if not (user and user.email and settings.BREVO_API_KEY and settings.EMAIL_FROM):
        return

    rows = "".join(
        f"<tr><td>{escape(i.product.name)}</td><td>{i.quantity}</td><td>₹{i.price * i.quantity}</td></tr>"
        for i in order.items.select_related("product")
    )
    discount_line = (
        f"<p>Discount ({escape(order.coupon_code)}): -₹{order.discount_amount}</p>"
        if order.discount_amount else ""
    )
    html = (
        f"<h2>Thank you for your order, {escape(user.username)}!</h2>"
        f"<p>Your order <b>#{order.id}</b> has been placed.</p>"
        f"<table border='1' cellpadding='6' cellspacing='0'>"
        f"<tr><th>Item</th><th>Qty</th><th>Amount</th></tr>{rows}</table>"
        f"{discount_line}"
        f"<p><b>Total: ₹{order.total_amount}</b></p>"
        f"<p>Payment: Cash on Delivery</p>"
        f"<p>Delivery to: {escape(order.ship_name)}, {escape(order.ship_address)}, "
        f"{escape(order.ship_city)}, {escape(order.ship_state)} - {escape(order.ship_pincode)}</p>"
    )
    payload = {
        "sender": {"name": settings.EMAIL_FROM_NAME, "email": settings.EMAIL_FROM},
        "to": [{"email": user.email}],
        "subject": f"Your KirtiCart order #{order.id} is confirmed",
        "htmlContent": html,
    }
    # Sent in a background thread, so the customer does not wait for the email service
    threading.Thread(target=_post, args=(payload,), daemon=True).start()