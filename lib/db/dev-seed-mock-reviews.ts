import crypto from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { businesses, locations, reviews } from '@/lib/db/schema';
import { queueJob } from '@/lib/services/job-queue';
import { processPendingJobs } from '@/lib/services/jobs';

type ScriptArgs = {
  count: number;
  businessId: number | null;
  locationId: number | null;
  processJobs: boolean;
};

type ReviewTemplate = {
  rating: number;
  text: string;
  reviewer: string;
};

const REVIEW_TEMPLATES: ReviewTemplate[] = [
  {
    rating: 5,
    reviewer: 'Mia L.',
    text: 'Tech arrived in 25 minutes and fixed our kitchen leak on the first visit.'
  },
  {
    rating: 2,
    reviewer: 'Chris P.',
    text: 'Price was higher than quoted and the faucet started dripping again today.'
  },
  {
    rating: 4,
    reviewer: 'Dana K.',
    text: 'Good service overall and clear communication from dispatch and technician.'
  },
  {
    rating: 1,
    reviewer: 'Alex R.',
    text: 'Emergency call took too long and we had water damage before anyone arrived.'
  },
  {
    rating: 3,
    reviewer: 'Taylor N.',
    text: 'Work was fine but scheduling updates were inconsistent and confusing.'
  },
  {
    rating: 5,
    reviewer: 'Jordan S.',
    text: 'Very professional crew, clean work area, and everything explained clearly.'
  },
  {
    rating: 5,
    reviewer: 'Priya M.',
    text:
      'We used this company for a same-week HVAC tune-up and the whole experience felt organized from start to finish. Dispatch texted a realistic arrival window, the technician explained what he was checking in plain language, and he even took photos of the worn capacitor so I could understand why he recommended replacing it. What stood out most was that there was no pressure. He gave us options, answered all of my questions, and left the utility closet cleaner than he found it.'
  },
  {
    rating: 2,
    reviewer: 'Monica D.',
    text:
      'The electrician who came out was polite, but the job itself turned into a frustrating experience. We were told the flickering lights in two bedrooms would likely be a simple fix, then after the visit we got a much larger estimate without a clear walkthrough of what changed. I had to call twice to get clarification, and by the time someone responded we still did not have the written breakdown we asked for. I do not mind paying for good work, but the communication and expectation-setting felt messy the entire time.'
  },
  {
    rating: 4,
    reviewer: 'Erin W.',
    text:
      'Booked them for a garage door repair after the spring snapped. They were not the cheapest quote, but they showed up on time, explained the safety issue clearly, and finished in one visit. The only reason this is not a full five stars is that the appointment window moved by about an hour and I had to reshuffle my afternoon. Aside from that, the tech was excellent and the door is quieter than it has been in years.'
  },
  {
    rating: 1,
    reviewer: 'Victor H.',
    text:
      'I called for an emergency restoration visit after a pipe burst in our laundry room and soaked part of the hallway. The first person I spoke with said someone would contact us quickly, but the follow-up took much longer than expected and by then we had already started cleaning up with towels and fans ourselves. The crew that eventually arrived was courteous, but I am upset that we lost time during a situation that felt urgent. This was exactly the kind of problem where speed mattered most, and that is where the experience fell short.'
  },
  {
    rating: 3,
    reviewer: 'Samira T.',
    text:
      'We hired them for recurring house cleaning after a remodel. The team was friendly and worked hard, and several parts of the house looked great, especially the kitchen and primary bath. At the same time, a few details were missed in the guest rooms and we had to point out dust still sitting on some baseboards and window ledges. I would consider using them again, but I would want a clearer checklist up front so both sides know what is included.'
  },
  {
    rating: 5,
    reviewer: 'Noah G.',
    text:
      'Excellent pest control visit. We had ants in the pantry and wasps starting to build near the back patio, and the technician took the time to inspect both inside and outside rather than rushing through a generic spray. He explained what would happen over the next few days, what signs to watch for, and what to do if activity continued. The follow-up notes sent afterward were surprisingly helpful and made this feel much more professional than other companies we have tried.'
  }
];

function parseArgs(): ScriptArgs {
  const args = process.argv.slice(2);
  const read = (key: string) => {
    const idx = args.indexOf(key);
    return idx >= 0 ? args[idx + 1] : undefined;
  };

  const count = Number(read('--count') ?? '6');
  const businessIdRaw = read('--business-id');
  const locationIdRaw = read('--location-id');
  const processJobsRaw = read('--process-jobs');

  return {
    count: Number.isInteger(count) && count > 0 ? Math.min(count, 50) : 6,
    businessId:
      businessIdRaw && Number.isInteger(Number(businessIdRaw))
        ? Number(businessIdRaw)
        : null,
    locationId:
      locationIdRaw && Number.isInteger(Number(locationIdRaw))
        ? Number(locationIdRaw)
        : null,
    processJobs: processJobsRaw ? processJobsRaw !== 'false' : true
  };
}

async function resolveTargetLocation(args: ScriptArgs) {
  if (args.locationId) {
    const location = await db.query.locations.findFirst({
      where: eq(locations.id, args.locationId)
    });
    if (location) {
      return location;
    }
    throw new Error(`Location ${args.locationId} not found`);
  }

  if (args.businessId) {
    const location = await db.query.locations.findFirst({
      where: and(eq(locations.businessId, args.businessId), eq(locations.status, 'active')),
      orderBy: [desc(locations.updatedAt)]
    });
    if (location) {
      return location;
    }
  }

  const fallbackLocation = await db.query.locations.findFirst({
    where: eq(locations.status, 'active'),
    orderBy: [desc(locations.updatedAt)]
  });
  if (fallbackLocation) {
    return fallbackLocation;
  }

  const business = args.businessId
    ? await db.query.businesses.findFirst({ where: eq(businesses.id, args.businessId) })
    : await db.query.businesses.findFirst({ orderBy: [desc(businesses.updatedAt)] });

  if (!business) {
    throw new Error('No business found. Run db:seed first.');
  }

  const now = Date.now();
  const [createdLocation] = await db
    .insert(locations)
    .values({
      businessId: business.id,
      externalLocationId: `mock-dev-loc-${now}`,
      name: `${business.name} Dev Location`,
      status: 'active',
      isPrimary: false
    })
    .returning();

  return createdLocation;
}

function buildPayloadHash(seed: string) {
  return crypto.createHash('sha256').update(seed).digest('hex');
}

async function insertMockReviews(locationId: number, count: number) {
  const createdIds: number[] = [];
  const baseNow = Date.now();

  for (let i = 0; i < count; i += 1) {
    const template = REVIEW_TEMPLATES[i % REVIEW_TEMPLATES.length];
    const createdAt = new Date(baseNow - i * 7 * 60_000);
    const externalId = `dev-review-${baseNow}-${i}-${crypto.randomUUID().slice(0, 8)}`;
    const payloadHash = buildPayloadHash(`${externalId}:${createdAt.toISOString()}`);

    const [created] = await db
      .insert(reviews)
      .values({
        locationId,
        provider: 'google_business_profile',
        externalReviewId: externalId,
        reviewerName: template.reviewer,
        reviewerPhotoUrl: null,
        starRating: template.rating,
        reviewText: template.text,
        reviewCreatedAt: createdAt,
        reviewUpdatedAt: createdAt,
        ownerReplyText: null,
        ownerReplyUpdatedAt: null,
        hasOwnerReply: false,
        sourceUrl: null,
        payloadHash,
        rawPayload: {
          source: 'dev-seed-mock-reviews',
          templateIndex: i % REVIEW_TEMPLATES.length
        },
        workflowStatus: 'new',
        priority: template.rating <= 2 ? 'high' : 'low',
        needsAttention: template.rating <= 2
      })
      .returning();

    createdIds.push(created.id);

    await queueJob({
      jobType: 'analyze_review',
      idempotencyKey: `dev-seed:analyze:${created.id}:${payloadHash}`,
      payload: { reviewId: created.id, payloadHash }
    });
  }

  return createdIds;
}

async function drainJobs(maxPasses = 6) {
  const aggregate = {
    processed: 0,
    succeeded: 0,
    failed: 0
  };

  for (let i = 0; i < maxPasses; i += 1) {
    const result = await processPendingJobs(200);
    aggregate.processed += result.processed;
    aggregate.succeeded += result.succeeded;
    aggregate.failed += result.failed;

    if (result.processed === 0) {
      break;
    }
  }

  return aggregate;
}

async function main() {
  const args = parseArgs();
  const location = await resolveTargetLocation(args);
  const createdReviewIds = await insertMockReviews(location.id, args.count);
  const jobResult = args.processJobs ? await drainJobs() : null;

  console.log('Seeded mock reviews for development.');
  console.log(`Location ID: ${location.id}`);
  console.log(`Created reviews: ${createdReviewIds.length}`);
  console.log(`Review IDs: ${createdReviewIds.join(', ')}`);
  if (jobResult) {
    console.log(
      `Jobs processed: ${jobResult.processed} (succeeded=${jobResult.succeeded}, failed=${jobResult.failed})`
    );
  } else {
    console.log('Skipped job processing (--process-jobs false).');
  }
}

main()
  .catch((error) => {
    console.error('Mock review seed failed:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
