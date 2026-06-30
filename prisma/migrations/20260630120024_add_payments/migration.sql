-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "playbookId" TEXT,
    "purpose" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'lemonsqueezy',
    "status" TEXT NOT NULL DEFAULT 'checkout_created',
    "amountCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "checkoutId" TEXT,
    "orderId" TEXT,
    "subscriptionId" TEXT,
    "lemonCustomerId" TEXT,
    "variantId" TEXT,
    "rawJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'lemonsqueezy',
    "eventName" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_subscriptionId_idx" ON "Payment"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_dedupeKey_key" ON "WebhookEvent"("dedupeKey");

-- CreateIndex
CREATE INDEX "WebhookEvent_eventName_idx" ON "WebhookEvent"("eventName");
