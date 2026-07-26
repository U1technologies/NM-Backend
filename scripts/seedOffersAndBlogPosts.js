// One-time seed script — migrates the placeholder Offers and Blog Posts that used to live
// as static arrays in the frontend's text.js into the database, now that both are admin-managed.
// Usage: node scripts/seedOffersAndBlogPosts.js

const mongoose = require('mongoose');
require('dotenv').config();

const Offer = require('../models/offerModel');
const BlogPost = require('../models/blogPostModel');

const offers = [
  {
    name: 'FinPay Wallet',
    category: 'Fintech',
    country: 'India',
    platform: 'App',
    model: 'CPA',
    payout: '$8',
    description: 'Promote FinPay Wallet, a fast-growing digital payments app, and earn for every verified sign-up.',
    ctaLabel: 'View Offer',
    rating: 4.2,
    reviewCount: 86,
    about: 'FinPay Wallet is a fast-growing digital payments app in India, letting users pay bills, transfer money, and manage finances from one place. It has seen rapid adoption among first-time smartphone users and small merchants.',
    whyPromote: 'FinPay Wallet converts well with a simple one-step sign-up flow and strong brand recall in tier-2 and tier-3 Indian cities, making it an easy sell across fintech and personal finance audiences.',
    whyPromoteList: [
      'Simple one-tap sign-up increases conversion rates',
      'Strong brand recognition across India',
      'Reliable weekly payout cycle',
      'Creatives and landing pages provided',
    ],
    whoShouldPromote: {
      idealPublisherProfile: 'Best suited for personal finance blogs, fintech comparison sites, and regional influencers who create content in Hindi and other Indian languages for tier-2 and tier-3 audiences.',
      audienceMatch: 'Converts best with first-time smartphone users, small merchants, and young professionals in India looking for a simple digital payments app.',
    },
    trafficRules: {
      allowed: [
        'Organic content on personal finance and fintech blogs',
        'Social media posts and influencer content in India',
        'Email marketing to opted-in Indian fintech audiences',
        'Comparison and review articles featuring FinPay Wallet',
        'App store optimization content and reviews',
      ],
      notAllowed: [
        'Incentivized or reward-based sign-ups',
        'Brand keyword bidding on FinPay paid search terms',
        'Misleading claims about cashback or rewards',
        'Traffic from outside India',
        'Self-referrals or fraudulent account registrations',
      ],
    },
    complianceNote: 'Promotions must comply with RBI guidelines on digital payments marketing. All creatives must clearly disclose that FinPay Wallet is a third-party payments app and avoid implying guaranteed rewards.',
    trackingFlow: {
      steps: [
        'Publisher places their tracking link on approved content',
        'User clicks and is directed to the FinPay Wallet app or site',
        'User downloads the app and completes registration',
        'User completes identity verification (KYC)',
        'Conversion is recorded once KYC is verified',
        'After validation, $8 is credited to the publisher’s balance',
      ],
      window: '15 days',
      attribution: 'Last-click',
      method: 'Postback (S2S)',
      deduplication: 'One CPA per unique verified user',
    },
    promotionalTips: [
      'Content around bill payments and UPI transfers converts well',
      'Highlight the simple one-tap sign-up process in creatives',
      'Regional-language content performs strongly in tier-2/3 cities',
    ],
    paymentMethods: 'Publishers are paid via bank transfer, UPI, or PayPal. Payouts are processed on a Net-30 cycle once your earnings clear the minimum payout threshold.',
    faqs: [
      { question: 'What triggers a commission on the FinPay Wallet program?', answer: 'A commission is triggered when a referred user completes a verified sign-up and KYC on the FinPay Wallet app.' },
      { question: 'Which countries can I promote this offer in?', answer: 'This offer is currently open to traffic from India only.' },
      { question: 'How often are payouts processed?', answer: 'Payouts are processed weekly once conversions are verified.' },
    ],
  },
  {
    name: 'SkyLine Broadband',
    category: 'Broadband & Telecom',
    country: 'USA',
    platform: 'Web',
    model: 'CPA',
    payout: '$45',
    description: 'Drive qualified broadband subscription leads for SkyLine and earn a flat payout per conversion.',
    ctaLabel: 'View Offer',
    rating: 4.0,
    reviewCount: 54,
    about: 'SkyLine Broadband provides high-speed home internet across the United States, with flexible no-contract plans and same-week installation in most serviceable areas.',
    whyPromote: 'With a high CPA and strong demand for home internet upgrades, SkyLine Broadband offers a dependable payout for web publishers targeting US homeowners and renters.',
    whyPromoteList: [
      'High flat payout per qualified lead',
      'Strong demand across the US market',
      'Dedicated landing pages for web traffic',
      'Fast lead verification turnaround',
    ],
    whoShouldPromote: {
      idealPublisherProfile: 'Best suited for home services comparison sites, moving and relocation blogs, and local US deal sites covering internet and utility providers.',
      audienceMatch: 'Converts best with US homeowners and renters who are moving, upgrading their internet plan, or comparing broadband providers in their area.',
    },
    trafficRules: {
      allowed: [
        'Organic content on home services and broadband comparison sites',
        'Native advertising targeting US homeowners and renters',
        'Email marketing to opted-in US audiences',
        'Display and search campaigns geo-targeted to serviceable US areas',
      ],
      notAllowed: [
        'Incentivized or reward-based lead submissions',
        'Brand keyword bidding on SkyLine paid search terms',
        'Traffic from outside the United States',
        'Coupon or cashback placements not pre-approved by the advertiser',
        'Duplicate or fraudulent lead submissions',
      ],
    },
    complianceNote: 'All creatives must accurately represent SkyLine’s plans and pricing, and must not guarantee installation timelines outside the advertiser’s published service windows.',
    trackingFlow: {
      steps: [
        'Publisher places their tracking link on approved content',
        'User clicks and is directed to the SkyLine Broadband site',
        'User submits a service request with a valid US address',
        'SkyLine verifies the address is within a serviceable area',
        'Conversion is recorded once the lead is verified',
        'After validation, $45 is credited to the publisher’s balance',
      ],
      window: '20 days',
      attribution: 'Last-click',
      method: 'Postback (S2S)',
      deduplication: 'One CPA per unique verified address',
    },
    promotionalTips: [
      'Moving and relocation season drives strong conversion spikes',
      'Highlight no-contract flexibility in creatives',
      'Comparison content against other regional ISPs converts well',
    ],
    paymentMethods: 'Publishers are paid via bank transfer, PayPal, or Wise. Payouts are processed on a Net-30 cycle once your earnings clear the minimum payout threshold.',
    faqs: [
      { question: 'What counts as a qualified lead for SkyLine Broadband?', answer: 'A lead qualifies once the referred user submits a completed service request with a valid US address.' },
      { question: 'Is this offer open to app traffic?', answer: 'This offer is currently optimized for web traffic only.' },
      { question: 'How long does approval take?', answer: 'Leads are typically verified and approved within 3 to 5 business days.' },
    ],
  },
  {
    name: 'ShopNest',
    category: 'E-commerce',
    country: 'Global',
    platform: 'App + Web',
    model: 'Rev Share',
    payout: '8% Rev Share',
    description: 'Promote ShopNest storewide deals and earn a share of every completed purchase you refer.',
    ctaLabel: 'View Offer',
    rating: 4.4,
    reviewCount: 212,
    about: 'ShopNest is a global online marketplace offering deals across electronics, fashion, and home goods, with fast international shipping and localized storefronts.',
    whyPromote: 'As a revenue-share offer, ShopNest rewards publishers for every completed purchase, making it ideal for content creators and deal sites with recurring, engaged audiences.',
    whyPromoteList: [
      'Earn on every completed purchase, not just sign-ups',
      'Global reach across app and web traffic',
      'Frequent storewide sales to promote',
      '30-day cookie window',
    ],
    whoShouldPromote: {
      idealPublisherProfile: 'Best suited for deal and coupon sites, cashback platforms, shopping content creators, and global lifestyle influencers.',
      audienceMatch: 'Converts best with online shoppers looking for deals across electronics, fashion, and home goods across multiple regions.',
    },
    trafficRules: {
      allowed: [
        'Deal and coupon content featuring ShopNest offers',
        'Organic and paid social content globally',
        'Email marketing to opted-in shopping audiences',
        'Influencer and content creator promotions',
        'Comparison shopping and review platforms',
      ],
      notAllowed: [
        'Incentivized installs or purchases',
        'Brand keyword bidding on ShopNest paid search terms',
        'Unauthorized use of ShopNest trademarks or logos',
        'Fraudulent or self-referred purchases',
        'Cookie stuffing or forced clicks',
      ],
    },
    complianceNote: 'All promotional content must accurately represent current pricing and availability, and must not imply endorsement beyond the affiliate relationship.',
    trackingFlow: {
      steps: [
        'Publisher places their tracking link on approved content',
        'User clicks and is directed to the ShopNest storefront',
        'User adds items to cart and completes checkout',
        'Order is confirmed and enters the 30-day cookie window for return eligibility',
        'Commission is calculated on the final order value',
        'After the return window closes, revenue share is credited to the publisher’s balance',
      ],
      window: '30 days',
      attribution: 'Last-click',
      method: 'Postback (S2S)',
      deduplication: 'Commission calculated per completed order',
    },
    promotionalTips: [
      'Seasonal sales and storewide promotions drive the highest conversion spikes',
      'Category-specific content (electronics, fashion, home) outperforms generic deal posts',
      'Highlight free or fast international shipping where applicable',
    ],
    paymentMethods: 'Publishers are paid via bank transfer, PayPal, or Wise. Payouts are processed on a Net-30 cycle once your earnings clear the minimum payout threshold.',
    faqs: [
      { question: 'How long is the tracking cookie window?', answer: 'ShopNest offers a 30-day cookie window from the first click.' },
      { question: 'Can I promote ShopNest in any country?', answer: 'Yes, this offer accepts traffic from all countries.' },
      { question: 'What is excluded from revenue share?', answer: 'Refunded or cancelled orders are excluded from commission calculations.' },
    ],
  },
  {
    name: 'TradePro Markets',
    category: 'Trading & Investment',
    country: 'UAE',
    platform: 'Web',
    model: 'CPA',
    payout: '$70',
    description: 'Refer new verified traders to TradePro Markets and earn a high payout per funded account.',
    ctaLabel: 'View Offer',
    rating: 3.9,
    reviewCount: 63,
    about: 'TradePro Markets is an online trading platform offering access to forex, commodities, and indices for verified traders across the Middle East.',
    whyPromote: 'With one of the highest CPA payouts in this catalog, TradePro Markets rewards publishers well for every funded trading account, appealing to finance and trading-focused audiences.',
    whyPromoteList: [
      'One of the highest payouts in this catalog',
      'Strong appeal to finance and trading audiences',
      'Dedicated affiliate support team',
      'Real-time conversion tracking',
    ],
    whoShouldPromote: {
      idealPublisherProfile: 'Best suited for finance and trading education sites, market analysis content creators, and investment community forums across the Middle East.',
      audienceMatch: 'Converts best with adults 21 and above who are actively researching forex, commodities, or indices trading platforms.',
    },
    trafficRules: {
      allowed: [
        'Educational content about forex and trading concepts',
        'Market analysis and trading strategy content',
        'Organic social media content targeting the UAE and wider Middle East',
        'Email marketing to opted-in trading audiences',
        'Comparison content against other regulated trading platforms',
      ],
      notAllowed: [
        'Guaranteed-return or misleading profit claims',
        'Brand keyword bidding on TradePro paid search terms',
        'Traffic targeting users under 21',
        'Incentivized account openings',
        'Self-referrals or fraudulent account funding',
      ],
    },
    complianceNote: 'All creatives must comply with regional financial promotion guidelines, avoid guaranteed-return language, and include required risk disclaimers for trading products.',
    trackingFlow: {
      steps: [
        'Publisher places their tracking link on approved content',
        'User clicks and is directed to the TradePro Markets platform',
        'User registers and completes identity verification',
        'User funds their trading account with the minimum required deposit',
        'Conversion is recorded once the funded account is verified',
        'After a 30-day validation window, $70 is credited to the publisher’s balance',
      ],
      window: '30 days',
      attribution: 'Last-click',
      method: 'Postback (S2S)',
      deduplication: 'One CPA per unique funded account',
    },
    promotionalTips: [
      'Educational, risk-aware content builds trust and converts better than hype-driven posts',
      'Highlight the platform’s regulated status and account security',
      'Market volatility periods often drive higher research and sign-up intent',
    ],
    paymentMethods: 'Publishers are paid via bank transfer, Wise, or crypto. Payouts are processed on a Net-30 cycle once your earnings clear the minimum payout threshold.',
    faqs: [
      { question: 'When does a conversion count for TradePro Markets?', answer: 'A conversion counts once a referred user completes verification and funds their trading account.' },
      { question: 'Are there any restricted promotional methods?', answer: 'Misleading financial claims and guaranteed-return promises are not permitted in any creatives.' },
      { question: 'What is the minimum funding amount required?', answer: 'The account must be funded with the platform’s published minimum deposit to trigger a conversion.' },
    ],
  },
  {
    name: 'CloudDesk SaaS',
    category: 'SaaS',
    country: 'Canada',
    platform: 'Web',
    model: 'CPL',
    payout: '$25',
    description: 'Generate qualified demo requests for CloudDesk and get paid for every lead that books a call.',
    ctaLabel: 'View Offer',
    rating: 4.3,
    reviewCount: 41,
    about: 'CloudDesk SaaS is a cloud-based helpdesk and team collaboration tool built for small and mid-sized businesses across Canada.',
    whyPromote: 'CloudDesk pays out per qualified demo request rather than a full sale, giving publishers a lower-friction conversion event with steady lead flow from B2B audiences.',
    whyPromoteList: [
      'Low-friction lead-based conversion event',
      'Steady demand from B2B audiences',
      'Fast lead qualification process',
      'Co-branded landing pages available',
    ],
    whoShouldPromote: {
      idealPublisherProfile: 'Best suited for B2B software review sites, productivity and business blogs, and LinkedIn content creators targeting small business owners.',
      audienceMatch: 'Converts best with small and mid-sized business owners and IT managers across Canada evaluating helpdesk or collaboration tools.',
    },
    trafficRules: {
      allowed: [
        'Software review and comparison content',
        'LinkedIn and B2B-focused social content',
        'Email marketing to opted-in business audiences',
        'Webinars and product demo content',
        'Organic search content targeting relevant business software keywords',
      ],
      notAllowed: [
        'Brand keyword bidding on CloudDesk paid search terms',
        'Incentivized demo bookings',
        'Traffic from outside Canada',
        'Fake or low-quality demo bookings',
        'Unauthorized use of CloudDesk trademarks or logos',
      ],
    },
    complianceNote: 'All creatives must accurately represent CloudDesk’s features and pricing, and must not make unverified claims about integrations or support availability.',
    trackingFlow: {
      steps: [
        'Publisher places their tracking link on approved content',
        'User clicks and is directed to the CloudDesk demo request page',
        'User submits business contact details and books a demo',
        'CloudDesk’s team confirms the business profile matches target criteria',
        'Conversion is recorded once the demo is attended',
        'After validation, $25 is credited to the publisher’s balance',
      ],
      window: '20 days',
      attribution: 'Last-click',
      method: 'Postback (S2S)',
      deduplication: 'One CPL per unique attended demo',
    },
    promotionalTips: [
      'Case studies and ROI-focused content convert business audiences well',
      'Highlight ease of setup and integration with existing tools',
      'Content published early in the work week sees stronger demo bookings',
    ],
    paymentMethods: 'Publishers are paid via bank transfer, PayPal, or Wise. Payouts are processed on a Net-30 cycle once your earnings clear the minimum payout threshold.',
    faqs: [
      { question: 'What counts as a qualified lead for CloudDesk?', answer: 'A lead qualifies once a business contact books and attends a product demo call.' },
      { question: 'Can I use paid search to promote this offer?', answer: 'Yes, except for bidding on the CloudDesk brand name directly.' },
      { question: 'How is lead quality verified?', answer: 'Our team reviews each booked demo to confirm it matches the target business profile before approving the lead.' },
    ],
  },
  {
    name: 'WanderStay',
    category: 'Travel',
    country: 'UK',
    platform: 'App + Web',
    model: 'Rev Share',
    payout: '5% Rev Share',
    description: 'Promote WanderStay hotel bookings worldwide and earn commission on every completed stay.',
    ctaLabel: 'View Offer',
    rating: 4.1,
    reviewCount: 97,
    about: 'WanderStay is a global hotel booking platform offering competitive rates on hotels, apartments, and resorts across popular travel destinations.',
    whyPromote: 'Travel content creators and deal publishers can earn recurring commission on every completed stay, with strong seasonal demand throughout the year.',
    whyPromoteList: [
      'Recurring commission on every completed stay',
      'Strong seasonal and holiday demand',
      'Wide destination and property coverage',
      'Real-time booking confirmation tracking',
    ],
    whoShouldPromote: {
      idealPublisherProfile: 'Best suited for travel blogs, deal aggregator sites, and social content creators covering hotel and accommodation bookings.',
      audienceMatch: 'Converts best with UK-based travelers planning leisure trips, weekend getaways, and holiday bookings worldwide.',
    },
    trafficRules: {
      allowed: [
        'Travel guides and destination content featuring WanderStay listings',
        'Organic and paid social content targeting UK travelers',
        'Email marketing to opted-in travel audiences',
        'Deal and price-comparison content',
        'Influencer travel content and reviews',
      ],
      notAllowed: [
        'Incentivized or reward-based bookings',
        'Brand keyword bidding on WanderStay paid search terms',
        'Misleading availability or pricing claims',
        'Self-referred or fraudulent bookings',
        'Unauthorized use of property images without rights',
      ],
    },
    complianceNote: 'All promotional content must reflect accurate pricing and availability at the time of publishing, and must clearly state that prices are subject to change.',
    trackingFlow: {
      steps: [
        'Publisher places their tracking link on approved content',
        'User clicks and is directed to the WanderStay booking site',
        'User completes a hotel or property booking',
        'Booking enters the cancellation window',
        'Conversion is recorded once the guest completes their stay',
        'After validation, 5% revenue share is credited to the publisher’s balance',
      ],
      window: '45 days',
      attribution: 'Last-click',
      method: 'Postback (S2S)',
      deduplication: 'Commission calculated per completed stay',
    },
    promotionalTips: [
      'Seasonal and holiday travel periods drive the strongest booking demand',
      'Destination-specific guides convert better than generic travel content',
      'Highlight flexible cancellation policies where available',
    ],
    paymentMethods: 'Publishers are paid via bank transfer, PayPal, or Wise. Payouts are processed on a Net-30 cycle once your earnings clear the minimum payout threshold.',
    faqs: [
      { question: 'When is commission paid for WanderStay bookings?', answer: 'Commission is paid after the guest completes their stay and the cancellation window has passed.' },
      { question: 'Does this offer work for app-based traffic?', answer: 'Yes, WanderStay supports both app and web referral traffic.' },
      { question: 'Are cancelled bookings commissionable?', answer: 'No, cancelled or no-show bookings do not earn commission.' },
    ],
  },
  {
    name: 'BrightMind Academy',
    category: 'EdTech',
    country: 'India',
    platform: 'App',
    model: 'CPL',
    payout: '$12',
    description: 'Drive course enrollments for BrightMind Academy and earn per qualified lead generated.',
    ctaLabel: 'View Offer',
    rating: 4.5,
    reviewCount: 74,
    about: 'BrightMind Academy offers live and self-paced online courses for school and competitive exam preparation across India.',
    whyPromote: 'With a lead-based payout and high parental demand for supplementary education, BrightMind Academy converts well across parenting, education, and student-focused audiences.',
    whyPromoteList: [
      'Lead-based payout with low conversion friction',
      'High demand from parents and students',
      'Seasonal spikes around exam periods',
      'Creative kits provided for education audiences',
    ],
    whoShouldPromote: {
      idealPublisherProfile: 'Best suited for parenting blogs, education content creators, and exam-preparation communities across India.',
      audienceMatch: 'Converts best with parents and students preparing for school exams and competitive entrance tests across India.',
    },
    trafficRules: {
      allowed: [
        'Educational content and exam preparation guides',
        'Parenting and student-focused social content',
        'Email marketing to opted-in education audiences',
        'Comparison content against other online course providers',
        'YouTube and content creator reviews of the platform',
      ],
      notAllowed: [
        'Incentivized trial class bookings',
        'Brand keyword bidding on BrightMind paid search terms',
        'Traffic from outside India',
        'Misleading claims about exam results or guarantees',
        'Self-referrals or fraudulent lead submissions',
      ],
    },
    complianceNote: 'All creatives must avoid guaranteeing exam results or ranks, and must clearly represent BrightMind Academy as a supplementary learning platform.',
    trackingFlow: {
      steps: [
        'Publisher places their tracking link on approved content',
        'User clicks and is directed to the BrightMind Academy site',
        'Parent or student books a free trial class',
        'BrightMind’s team confirms the booking is genuine',
        'Conversion is recorded once the trial class is attended',
        'After validation, $12 is credited to the publisher’s balance',
      ],
      window: '15 days',
      attribution: 'Last-click',
      method: 'Postback (S2S)',
      deduplication: 'One CPL per unique attended trial class',
    },
    promotionalTips: [
      'Content timed around exam seasons sees the strongest demand',
      'Highlight qualified faculty and personalized learning plans',
      'Parent-focused testimonials convert better than generic ads',
    ],
    paymentMethods: 'Publishers are paid via bank transfer or UPI. Payouts are processed on a Net-30 cycle once your earnings clear the minimum payout threshold.',
    faqs: [
      { question: 'What counts as a qualified lead for BrightMind Academy?', answer: 'A lead qualifies once a parent or student completes a free trial class booking.' },
      { question: 'Is this offer restricted to India?', answer: 'Yes, this offer currently accepts leads from India only.' },
      { question: 'How quickly are leads approved?', answer: 'Leads are typically reviewed and approved within 48 hours.' },
    ],
  },
  {
    name: 'PureVital Health',
    category: 'Health & Wellness',
    country: 'USA',
    platform: 'Web',
    model: 'CPS',
    payout: '$18',
    description: 'Promote PureVital supplements and earn a fixed payout for every completed sale.',
    ctaLabel: 'View Offer',
    rating: 3.8,
    reviewCount: 39,
    about: 'PureVital Health sells science-backed wellness supplements direct-to-consumer across the United States, with subscription and one-time purchase options.',
    whyPromote: 'As a cost-per-sale offer, PureVital rewards publishers for completed purchases, with strong repeat-purchase rates driving longer-term affiliate value.',
    whyPromoteList: [
      'Fixed payout on every completed sale',
      'High repeat-purchase and subscription rate',
      'Compliant health and wellness creatives provided',
      'US-based customer support for buyers',
    ],
    whoShouldPromote: {
      idealPublisherProfile: 'Best suited for wellness blogs, supplement review sites, and health-focused social media content creators in the United States.',
      audienceMatch: 'Converts best with US-based health-conscious consumers interested in wellness supplements and subscription products.',
    },
    trafficRules: {
      allowed: [
        'Wellness and supplement review content',
        'Organic and paid social content targeting US health audiences',
        'Email marketing to opted-in wellness audiences',
        'Content using only pre-approved health claims from the creative kit',
        'Comparison content against other supplement brands',
      ],
      notAllowed: [
        'Unapproved medical or health claims',
        'Brand keyword bidding on PureVital paid search terms',
        'Traffic from outside the United States',
        'Incentivized or reward-based purchases',
        'Targeting users under 18',
      ],
    },
    complianceNote: 'All health-related claims must come from the pre-approved, compliance-reviewed creative kit. Promotions must comply with FTC guidelines on endorsements and testimonials.',
    trackingFlow: {
      steps: [
        'Publisher places their tracking link on approved content',
        'User clicks and is directed to the PureVital Health store',
        'User places an order and completes payment',
        'Order is confirmed and processed',
        'Conversion is recorded once payment is successfully captured',
        'After validation, $18 is credited to the publisher’s balance',
      ],
      window: '15 days',
      attribution: 'Last-click',
      method: 'Postback (S2S)',
      deduplication: 'One CPS per unique completed order',
    },
    promotionalTips: [
      'Before-and-after style testimonials must use only approved claims',
      'Subscription bundles convert well with recurring wellness content',
      'Highlight US-based customer support and satisfaction guarantees',
    ],
    paymentMethods: 'Publishers are paid via bank transfer, PayPal, or Wise. Payouts are processed on a Net-30 cycle once your earnings clear the minimum payout threshold.',
    faqs: [
      { question: 'What counts as a completed sale for PureVital Health?', answer: 'A sale counts once the customer’s order is placed and payment is successfully processed.' },
      { question: 'Are health claims allowed in marketing creatives?', answer: 'Only pre-approved claims from our compliance-reviewed creative kit may be used.' },
      { question: 'Does this offer support subscription orders?', answer: 'Yes, both one-time and subscription orders are commissionable.' },
    ],
  },
];

const blogPosts = [
  {
    title: '5 SEO Trends Shaping Search in 2026',
    category: 'SEO',
    date: new Date('2026-07-15'),
    readTime: '6 min read',
    excerpt: 'From AI-generated search summaries to zero-click results, here is what is actually moving rankings this year and how brands should adapt their SEO strategy.',
  },
  {
    title: 'How to Build a Paid Media Funnel That Actually Converts',
    category: 'Performance Marketing',
    date: new Date('2026-07-02'),
    readTime: '7 min read',
    excerpt: 'A practical breakdown of the awareness-to-conversion funnel, and why most paid campaigns fail at the middle stage rather than the top or bottom.',
  },
  {
    title: 'UGC vs Traditional Ads: What Converts Better in 2026?',
    category: 'UGC Content',
    date: new Date('2026-06-20'),
    readTime: '5 min read',
    excerpt: 'We compare performance data from creator-style content against polished brand ads across three industries to see which format actually drives sales.',
  },
  {
    title: 'A Founder’s Guide to Personal Branding on LinkedIn',
    category: 'Personal Branding',
    date: new Date('2026-06-05'),
    readTime: '8 min read',
    excerpt: 'Practical steps for founders and executives who want to build authority on LinkedIn without spending hours a day on content.',
  },
  {
    title: 'Lead Generation Tactics That Still Work in a Cookieless World',
    category: 'Lead Generation',
    date: new Date('2026-05-22'),
    readTime: '6 min read',
    excerpt: 'With third-party cookies fading out, here are the first-party data strategies that are keeping lead pipelines full.',
  },
  {
    title: 'Website Speed and Conversions: What the Data Really Shows',
    category: 'Web Development',
    date: new Date('2026-05-10'),
    readTime: '5 min read',
    excerpt: 'A look at how page load time correlates with bounce rate and conversions, and the highest-impact fixes for slow sites.',
  },
];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const existingOfferCount = await Offer.countDocuments();
  if (existingOfferCount === 0) {
    await Offer.insertMany(offers);
    console.log(`Seeded ${offers.length} offers.`);
  } else {
    console.log(`Skipped offer seed — ${existingOfferCount} offers already exist.`);
  }

  const existingBlogCount = await BlogPost.countDocuments();
  if (existingBlogCount === 0) {
    await BlogPost.insertMany(blogPosts);
    console.log(`Seeded ${blogPosts.length} blog posts.`);
  } else {
    console.log(`Skipped blog post seed — ${existingBlogCount} blog posts already exist.`);
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((error) => {
  console.error('Seeding failed:', error.message);
  process.exit(1);
});
