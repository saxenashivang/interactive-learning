from __future__ import annotations
"""Billing API with Stripe integration."""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
import stripe

from app.auth.firebase import get_current_user
from app.db.session import get_db
from app.db.models import User, Subscription, SubscriptionStatus, PlanTier
from app.config import get_settings

settings = get_settings()
stripe.api_key = settings.stripe_secret_key

router = APIRouter()


class CreateCheckoutRequest(BaseModel):
    plan: str  # "pro" or "team"


class BillingPortalRequest(BaseModel):
    return_url: str = "http://localhost:3000/billing"


@router.post("/create-checkout")
async def create_checkout_session(
    req: CreateCheckoutRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe checkout session for subscription."""
    price_id = settings.stripe_price_pro if req.plan == "pro" else settings.stripe_price_team
    if not price_id:
        raise HTTPException(status_code=400, detail="Plan not configured")

    # Get or create Stripe customer
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == user.id)
    )
    sub = result.scalar_one_or_none()

    if sub and sub.stripe_customer_id:
        customer_id = sub.stripe_customer_id
    else:
        customer = stripe.Customer.create(
            email=user.email,
            name=user.display_name,
            metadata={"user_id": str(user.id)},
        )
        customer_id = customer.id

    # Create checkout session
    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url="http://localhost:3000/billing?success=true",
        cancel_url="http://localhost:3000/billing?canceled=true",
        metadata={"user_id": str(user.id), "plan": req.plan},
    )

    return {"checkout_url": session.url}


@router.post("/portal")
async def create_billing_portal(
    req: BillingPortalRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe customer portal session."""
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == user.id)
    )
    sub = result.scalar_one_or_none()

    if not sub or not sub.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No subscription found")

    session = stripe.billing_portal.Session.create(
        customer=sub.stripe_customer_id,
        return_url=req.return_url,
    )

    return {"portal_url": session.url}


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Handle Stripe webhook events."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session["metadata"].get("user_id")
        plan = session["metadata"].get("plan", "pro")
        plan_tier = PlanTier.PRO if plan == "pro" else PlanTier.TEAM

        # Create/update subscription
        sub = Subscription(
            user_id=user_id,
            stripe_customer_id=session["customer"],
            stripe_subscription_id=session.get("subscription"),
            plan_tier=plan_tier,
            status=SubscriptionStatus.ACTIVE,
        )
        db.add(sub)

        # Update user plan
        await db.execute(
            update(User).where(User.id == user_id).values(plan_tier=plan_tier)
        )

    elif event["type"] == "customer.subscription.deleted":
        sub_data = event["data"]["object"]
        await db.execute(
            update(Subscription)
            .where(Subscription.stripe_subscription_id == sub_data["id"])
            .values(status=SubscriptionStatus.CANCELED)
        )
        # Reset user to free tier
        result = await db.execute(
            select(Subscription).where(Subscription.stripe_subscription_id == sub_data["id"])
        )
        sub = result.scalar_one_or_none()
        if sub:
            await db.execute(
                update(User).where(User.id == sub.user_id).values(plan_tier=PlanTier.FREE)
            )

    return {"status": "ok"}


@router.get("/status")
async def billing_status(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current billing status for the user."""
    result = await db.execute(
        select(Subscription)
        .where(Subscription.user_id == user.id)
        .order_by(Subscription.created_at.desc())
    )
    sub = result.scalar_one_or_none()

    return {
        "plan_tier": user.plan_tier.value,
        "subscription": {
            "id": str(sub.id) if sub else None,
            "status": sub.status.value if sub else None,
            "stripe_subscription_id": sub.stripe_subscription_id if sub else None,
        } if sub else None,
    }
