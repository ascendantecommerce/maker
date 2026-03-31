import Stripe from "stripe";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("STRIPE_SECRET_KEY is not set in .env");
  process.exit(1);
}

// @ts-ignore
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // @ts-ignore
  apiVersion: "2024-11-20.acacia",
});

const SLIDER_STEPS = [2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000];

async function seed() {
  console.log("Starting Stripe seed (Distinct Products Mode)...");

  const priceMapping: Record<number, string> = {};

  for (const credits of SLIDER_STEPS) {
    const productName = `Pro Plan - ${credits} Credits`;

    // 1. Create or Find Product for this specific tier
    let product = (
      await stripe.products.search({
        query: `name:"${productName}"`,
      })
    ).data[0];

    if (!product) {
      console.log(`Creating product: ${productName}`);
      product = await stripe.products.create({
        name: productName,
        description: `Pro subscription with ${credits} credits`,
        metadata: {
          credits: credits.toString(),
        },
      });
    } else {
      console.log(`Found existing product: ${product.name} (${product.id})`);
    }

    // 2. Create Price
    // Calculate price in cents: (credits / 2000) * 1999 cents
    const unitAmount = Math.round((credits / 2000) * 1999);

    console.log(`Creating price for ${credits} credits ($${unitAmount / 100})...`);

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: unitAmount,
      currency: "usd",
      recurring: {
        interval: "month",
      },
      metadata: {
        credits: credits.toString(),
      },
      nickname: `${credits} Credits / Month`,
    });

    priceMapping[credits] = price.id;
  }

  console.log("\n--- SEED COMPLETE ---");
  console.log("Add the following to src/config/stripe-config.ts:\n");
  console.log(
    "export const STRIPE_PRICE_MAPPING: Record<number, string> =",
    JSON.stringify(priceMapping, null, 2) + ";",
  );
}

seed().catch((err) => {
  console.error("Error seeding Stripe:", err);
  process.exit(1);
});
