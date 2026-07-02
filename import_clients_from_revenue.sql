-- Import all known agencies and brands from revenue data
-- Run in Supabase SQL Editor
-- Uses ON CONFLICT DO NOTHING so existing records are preserved

insert into public.clients (name, type, industry, status) values

-- ── AGENCIES ──────────────────────────────────────────────────────────────
('BrainChild / Starcom',  'agency', '{"Advertising"}',           'active'),
('GroupM',                'agency', '{"Advertising"}',           'active'),
('WPP',                   'agency', '{"Advertising"}',           'active'),
('Resonance Digital',     'agency', '{"Digital Marketing"}',     'active'),
('MIL',                   'agency', '{"Advertising"}',           'active'),
('IO Digital',            'agency', '{"Digital Marketing"}',     'active'),
('Revolution',            'agency', '{"Digital Marketing"}',     'active'),
('Walee',                 'agency', '{"Digital Marketing"}',     'active'),
('Marcom',                'agency', '{"Advertising"}',           'active'),
('Devcom',                'agency', '{"Advertising"}',           'active'),
('Adcom',                 'agency', '{"Advertising"}',           'active'),
('BodyBeat',              'agency', '{"Digital Marketing"}',     'active'),
('Media Matters',         'agency', '{"Advertising"}',           'active'),
('Digital Marvels',       'agency', '{"Digital Marketing"}',     'active'),
('DGS',                   'agency', '{"Digital Marketing"}',     'active'),
('Hakuna Matata',         'agency', '{"Digital Marketing"}',     'active'),
('Digitalk',              'agency', '{"Digital Marketing"}',     'active'),
('Mesh Media',            'agency', '{"Digital Marketing"}',     'active'),
('Pak Media Com',         'agency', '{"Advertising"}',           'active'),
('Wings Media',           'agency', '{"Advertising"}',           'active'),
('Time & Space',          'agency', '{"Advertising"}',           'active'),
('Strategix',             'agency', '{"Digital Marketing"}',     'active'),
('Linkers',               'agency', '{"Advertising"}',           'active'),
('Media Network',         'agency', '{"Advertising"}',           'active'),
('Digital Creation',      'agency', '{"Digital Marketing"}',     'active'),
('Barter',                'agency', '{"Advertising"}',           'active'),
('Digital Marvels',       'agency', '{"Digital Marketing"}',     'active'),
('Time and Space',        'agency', '{"Advertising"}',           'active'),

-- ── BRANDS ────────────────────────────────────────────────────────────────
-- Banking & Finance
('HBL',                           'brand', '{"Banking & Finance"}',      'active'),
('UBL',                           'brand', '{"Banking & Finance"}',      'active'),
('Bank Alfalah',                  'brand', '{"Banking & Finance"}',      'active'),
('BOK',                           'brand', '{"Banking & Finance"}',      'active'),
('Islamic Relief',                'brand', '{"NGO / Non-Profit"}',       'active'),

-- Government & Public Sector
('SNGPL',                         'brand', '{"Energy"}',                 'active'),
('OGDCL',                         'brand', '{"Energy"}',                 'active'),
('FBR',                           'brand', '{"Government"}',             'active'),
('BISP',                          'brand', '{"Government"}',             'active'),
('MOIB',                          'brand', '{"Government"}',             'active'),
('DGPR',                          'brand', '{"Government"}',             'active'),
('NAB',                           'brand', '{"Government"}',             'active'),
('Ministry of Planning',          'brand', '{"Government"}',             'active'),
('Govt of Punjab',                'brand', '{"Government"}',             'active'),
('KP Government',                 'brand', '{"Government"}',             'active'),
('Federal Govt',                  'brand', '{"Government"}',             'active'),
('PSER (Punjab Social Protection)','brand','{"Government"}',             'active'),

-- Food & Beverage / FMCG
('Nestle',                        'brand', '{"FMCG"}',                   'active'),
('Knorr',                         'brand', '{"FMCG"}',                   'active'),
('K&N',                           'brand', '{"Food & Beverage"}',        'active'),
('EBM',                           'brand', '{"Food & Beverage"}',        'active'),
('Burger O Clock',                'brand', '{"Food & Beverage"}',        'active'),
('Syngenta',                      'brand', '{"Agriculture"}',            'active'),
('Dawlance',                      'brand', '{"FMCG"}',                   'active'),

-- Fashion, Beauty & Personal Care
('Sunsilk',                       'brand', '{"FMCG"}',                   'active'),
('Skinwhite',                     'brand', '{"Health & Pharma"}',        'active'),
('Hemani Herbal',                 'brand', '{"Health & Pharma"}',        'active'),
('Vince',                         'brand', '{"Fashion & Apparel"}',      'active'),
('Stiles',                        'brand', '{"Fashion & Apparel"}',      'active'),
('AEO',                           'brand', '{"Fashion & Apparel"}',      'active'),
('Falaknaz',                      'brand', '{"Fashion & Apparel"}',      'active'),
('SIA Beauty Cream',              'brand', '{"Health & Pharma"}',        'active'),
('Black Beauty',                  'brand', '{"Health & Pharma"}',        'active'),
('Skin White',                    'brand', '{"Health & Pharma"}',        'active'),
('Innovative',                    'brand', '{"Health & Pharma"}',        'active'),

-- Paints & Home
('Master Paint',                  'brand', '{"Other"}',                  'active'),
('Brighto Paints',                'brand', '{"Other"}',                  'active'),
('Haier',                         'brand', '{"Technology"}',             'active'),

-- Automotive
('BYD',                           'brand', '{"Automotive"}',             'active'),
('Khursheed Fans',                'brand', '{"Other"}',                  'active'),

-- Hotels & Hospitality
('Avari Xpress',                  'brand', '{"Travel & Tourism"}',       'active'),

-- Entertainment & Media
('Lucky Entertainment',           'brand', '{"Media & Entertainment"}',  'active'),
('Dubai Economy & Tourism',       'brand', '{"Travel & Tourism"}',       'active'),

-- Other
('LUMU',                          'brand', '{"Retail"}',                 'active'),
('Tap Tap Send',                  'brand', '{"Technology"}',             'active'),
('Gillani Group',                 'brand', '{"Other"}',                  'active'),
('FFC',                           'brand', '{"Agriculture"}',            'active'),
('Dinner Sohayee',                'brand', '{"Food & Beverage"}',        'active'),
('Ezza',                          'brand', '{"Fashion & Apparel"}',      'active'),
('Metro Station Lahore',          'brand', '{"Government"}',             'active'),
('DGPR',                          'brand', '{"Government"}',             'active'),
('AEO',                           'brand', '{"Fashion & Apparel"}',      'active'),
('Nida Yasir',                    'brand', '{"Media & Entertainment"}',  'active'),
('mohsinnawaz.sports',            'brand', '{"Media & Entertainment"}',  'active'),
('Komal Rizvi Song',              'brand', '{"Media & Entertainment"}',  'active'),
('Avari Xpress',                  'brand', '{"Travel & Tourism"}',       'active'),
('UBL',                           'brand', '{"Banking & Finance"}',      'active')

on conflict (name) do nothing;

-- Verify counts
select type, count(*) from public.clients group by type order by type;
