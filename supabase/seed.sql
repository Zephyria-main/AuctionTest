-- Seed data for local development / rehearsal. Applied automatically by
-- `supabase db reset`. NEVER run this against production.
--
-- All 15 items are clearly labelled SAMPLE items with placeholder images
-- and must be replaced with real donor items and photography before launch
-- (see docs/LAUNCH_CHECKLIST.md).

insert into public.auction_settings (id, auction_opens_at, auction_closes_at, extensions_enabled, extension_trigger_minutes, extension_minutes, bidding_paused)
values (true, now(), now() + interval '7 days', true, 2, 2, false)
on conflict (id) do update set
  auction_opens_at = excluded.auction_opens_at,
  auction_closes_at = excluded.auction_closes_at;

insert into public.items
  (title, short_description, full_description, donor_name, estimated_value_cents, opening_bid_cents, min_increment_cents, closing_time, status, display_order)
values
  ('[SAMPLE] Weekend Getaway — Hunter Valley', 'Two nights for two at a Hunter Valley vineyard retreat.', 'Enjoy two nights'' accommodation for two people at a Hunter Valley vineyard retreat, including a private tasting session. [PLACEHOLDER: confirm full terms, blackout dates and expiry with donor.]', '[SAMPLE DONOR] Vineyard Retreats Co.', 120000, 60000, 5000, now() + interval '7 days', 'open', 1),
  ('[SAMPLE] Signed Wallabies Jersey', 'Match-worn jersey signed by the squad.', 'An official Wallabies jersey signed by the current squad, framed and ready to display. [PLACEHOLDER: confirm authenticity certificate details.]', '[SAMPLE DONOR] Rugby Australia', 80000, 40000, 2500, now() + interval '7 days', 'open', 2),
  ('[SAMPLE] Chef''s Table Dinner for 8', 'Private degustation dinner with wine pairing.', 'A private chef''s table experience for eight guests, including a six-course degustation menu with matched wines. [PLACEHOLDER: confirm venue and date flexibility.]', '[SAMPLE DONOR] Harbour View Restaurant', 200000, 100000, 10000, now() + interval '7 days', 'open', 3),
  ('[SAMPLE] Original Landscape Painting', 'Original oil painting by a local artist.', 'A one-of-a-kind original oil painting, 60cm x 90cm, by a local Sydney artist. [PLACEHOLDER: confirm artist bio and provenance.]', '[SAMPLE DONOR] Local Artist Studio', 90000, 45000, 5000, now() + interval '7 days', 'open', 4),
  ('[SAMPLE] Golf Day for Four', 'A round of golf for four at a championship course.', 'Includes green fees, motorised carts and lunch for four players at a championship golf course. [PLACEHOLDER: confirm course and booking process.]', '[SAMPLE DONOR] Championship Golf Club', 60000, 30000, 2500, now() + interval '7 days', 'open', 5),
  ('[SAMPLE] Luxury Spa Day for Two', 'Full day spa package for two guests.', 'A full day of spa treatments for two, including massage, facial and use of thermal pools. [PLACEHOLDER: confirm expiry date.]', '[SAMPLE DONOR] Serenity Day Spa', 70000, 35000, 2500, now() + interval '7 days', 'open', 6),
  ('[SAMPLE] Family Zoo Pass + Hamper', 'Annual family zoo pass plus a gourmet hamper.', 'An annual family membership to the zoo, plus a gourmet hamper of local produce. [PLACEHOLDER: confirm membership terms.]', '[SAMPLE DONOR] Harbour City Zoo', 45000, 22000, 2000, now() + interval '7 days', 'open', 7),
  ('[SAMPLE] Premium Wine Dozen', 'A curated dozen of premium reds and whites.', 'A curated case of twelve premium wines from Hunter Valley and Margaret River producers. [PLACEHOLDER: confirm vintages available at time of auction.]', '[SAMPLE DONOR] Fine Wine Merchants', 65000, 32000, 2500, now() + interval '7 days', 'open', 8),
  ('[SAMPLE] Home Theatre Sound Bar', 'Premium sound bar with wireless subwoofer.', 'A premium home theatre sound bar system with wireless subwoofer and surround speakers. [PLACEHOLDER: confirm model and warranty.]', '[SAMPLE DONOR] Electronics Superstore', 55000, 27000, 2000, now() + interval '7 days', 'open', 9),
  ('[SAMPLE] Kids Adventure Park Passes (x6)', 'Six day passes to an adventure and trampoline park.', 'Six all-day passes to a family adventure park, including trampolines and climbing walls. [PLACEHOLDER: confirm expiry and blackout dates.]', '[SAMPLE DONOR] Adventure World Park', 30000, 15000, 1000, now() + interval '7 days', 'open', 10),
  ('[SAMPLE] Designer Handbag', 'Authenticated designer handbag, new with tags.', 'A brand-new, authenticated designer handbag with tags and dust bag included. [PLACEHOLDER: confirm authentication documentation.]', '[SAMPLE DONOR] Fashion House Boutique', 150000, 75000, 5000, now() + interval '7 days', 'open', 11),
  ('[SAMPLE] Private Yoga Retreat Day', 'A full day retreat with private instructor.', 'A full-day private yoga and mindfulness retreat for up to six people, led by a certified instructor. [PLACEHOLDER: confirm venue and catering options.]', '[SAMPLE DONOR] Mindful Living Studio', 50000, 25000, 2000, now() + interval '7 days', 'open', 12),
  ('[SAMPLE] Coffee Machine + Beans Bundle', 'Premium espresso machine with a year of beans.', 'A premium home espresso machine bundled with twelve months of specialty roasted coffee beans. [PLACEHOLDER: confirm delivery logistics for beans.]', '[SAMPLE DONOR] Roasted Origins Coffee', 85000, 42000, 3000, now() + interval '7 days', 'open', 13),
  ('[SAMPLE] Harbour Sunset Cruise for 10', 'A private sunset cruise on Sydney Harbour.', 'A two-hour private sunset cruise on Sydney Harbour for up to ten guests, with canapes included. [PLACEHOLDER: confirm booking lead time and vessel capacity.]', '[SAMPLE DONOR] Harbour Cruises Sydney', 180000, 90000, 7500, now() + interval '7 days', 'open', 14),
  ('[SAMPLE] Signed First-Edition Book', 'A signed first-edition novel by a bestselling author.', 'A signed, first-edition hardcover novel from a bestselling Australian author, includes certificate of authenticity. [PLACEHOLDER: confirm author and title once secured.]', '[SAMPLE DONOR] Local Bookstore', 40000, 20000, 1500, now() + interval '7 days', 'open', 15)
on conflict do nothing;

-- Placeholder image reference for every seeded item (replace storage_path
-- with real uploaded photography before launch).
insert into public.item_images (item_id, storage_path, alt_text, sort_order)
select id, 'placeholder/item-placeholder.svg', title || ' (placeholder image)', 0
from public.items
where title like '[SAMPLE]%'
on conflict do nothing;
