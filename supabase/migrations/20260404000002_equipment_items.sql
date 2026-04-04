-- ─────────────────────────────────────────────────────────────────────────────
-- Equipment items (replaces hardcoded amenities)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE equipment_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key           text UNIQUE NOT NULL,        -- stored in listings.amenities[]
  category      text NOT NULL,               -- grouping key
  name_en       text NOT NULL,
  name_nl       text NOT NULL,
  name_fr       text NOT NULL,
  sort_order    int  DEFAULT 0,              -- order within category
  display_order int  DEFAULT 99,             -- global "top N important" rank
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- RLS: anyone can read active items; only service_role mutates
ALTER TABLE equipment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active equipment items"
  ON equipment_items FOR SELECT
  USING (is_active = true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Add rejection fields to listings
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE listings ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_rejected boolean DEFAULT false;

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed equipment items
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO equipment_items (key, category, name_en, name_nl, name_fr, sort_order, display_order) VALUES

-- Bathroom
('hair_dryer',          'bathroom', 'Hair dryer',          'Haardroger',          'Sèche-cheveux',          1,  11),
('cleaning_products',   'bathroom', 'Cleaning products',   'Schoonmaakmiddelen',  'Produits ménagers',      2,  12),
('shampoo',             'bathroom', 'Shampoo',             'Shampoo',             'Shampooing',             3,  13),
('body_soap',           'bathroom', 'Body soap',           'Lichaamszeep',        'Savon pour le corps',    4,  14),
('hot_water',           'bathroom', 'Hot water',           'Warm water',          'Eau chaude',             5,  15),
('shower_gel',          'bathroom', 'Shower gel',          'Douchegel',           'Gel douche',             6,  16),

-- Bedroom & Laundry
('washer',              'bedroom_laundry', 'Washer',                    'Wasmachine',          'Lave-linge',                 1,  6),
('dryer',               'bedroom_laundry', 'Dryer',                     'Droger',              'Sèche-linge',                2,  7),
('essentials',          'bedroom_laundry', 'Essentials (towels, bed sheets, soap, toilet paper)', 'Essentieel (handdoeken, beddengoed, zeep, toiletpapier)', 'Essentiels (serviettes, draps, savon, papier toilette)', 3, 17),
('hangers',             'bedroom_laundry', 'Hangers',                   'Hangers',             'Cintres',                    4,  18),
('bed_linens',          'bedroom_laundry', 'Bed linens',                'Beddengoed',          'Linge de lit',               5,  19),
('iron',                'bedroom_laundry', 'Iron',                      'Strijkijzer',         'Fer à repasser',             6,  20),
('drying_rack',         'bedroom_laundry', 'Drying rack for clothing',  'Droogrek',            'Séchoir à linge',            7,  21),
('clothing_storage',    'bedroom_laundry', 'Clothing storage: closet',  'Kledingkast',         'Rangement vêtements : armoire', 8, 22),
('baby_cot',            'bedroom_laundry', 'Baby cot',                  'Babybedje',           'Lit bébé',                   9,  23),

-- Heating & Cooling
('indoor_fireplace',    'heating_cooling', 'Indoor fireplace',    'Open haard',          'Cheminée intérieure',   1,  24),
('portable_fans',       'heating_cooling', 'Portable fans',       'Ventilators',         'Ventilateurs portables',2,  25),
('ac',                  'heating_cooling', 'A/C',                 'Airconditioning',     'Climatisation',         3,  3),
('radiant_heating',     'heating_cooling', 'Radiant heating',     'Vloerverwarming',     'Chauffage radiant',     4,  26),

-- Home Safety
('smoke_alarm',         'home_safety', 'Smoke alarm',                      'Rookmelder',              'Détecteur de fumée',            1, 27),
('exterior_cameras',    'home_safety', 'Exterior security cameras (excl. private zone)', 'Buitenbeveiligingscameras (excl. privezone)', 'Caméras de sécurité extérieures (hors zone privée)', 2, 28),
('fire_extinguisher',   'home_safety', 'Fire extinguisher',                'Brandblusser',            'Extincteur',                    3, 29),
('first_aid_kit',       'home_safety', 'First aid kit',                    'Verbandkoffer',           'Trousse de premiers secours',   4, 30),
('co_detector',         'home_safety', 'Carbon monoxide detector',         'Koolmonoxidemelder',      'Détecteur de monoxyde de carbone', 5, 31),

-- Internet & Interior
('smart_tv',            'internet_interior', 'TV (Smart TV)',          'TV (Smart TV)',          'TV (Smart TV)',           1,  8),
('projector',           'internet_interior', 'Projector',              'Projector',              'Projecteur',              2,  32),
('home_cinema',         'internet_interior', 'Home Cinema',            'Home Cinema',            'Cinéma maison',           3,  33),
('sound_system',        'internet_interior', 'Speakers / sound system','Luidsprekers / audio',   'Système audio',           4,  34),
('indoor_pool',         'internet_interior', 'Indoor pool',            'Binnenzwembad',          'Piscine intérieure',      5,  35),
('indoor_jacuzzi',      'internet_interior', 'Indoor jacuzzi',         'Binnen jacuzzi',         'Jacuzzi intérieur',       6,  36),
('sauna',               'internet_interior', 'Sauna',                  'Sauna',                  'Sauna',                   7,  37),
('wifi',                'internet_interior', 'Wifi',                   'Wifi',                   'Wifi',                    8,  2),
('ethernet',            'internet_interior', 'Ethernet connection',    'Ethernetverbinding',     'Connexion Ethernet',      9,  38),
('gym_indoor',          'internet_interior', 'Gym (indoor)',           'Fitnessruimte (binnen)', 'Salle de sport (intérieure)', 10, 39),

-- Kitchen & Dining
('kitchen',             'kitchen_dining', 'Kitchen: space where guests can cook their own meals', 'Keuken: ruimte om zelf te koken', 'Cuisine : espace pour cuisiner', 1,  4),
('refrigerator',        'kitchen_dining', 'Refrigerator',           'Koelkast',              'Réfrigérateur',           2,  40),
('freezer',             'kitchen_dining', 'Freezer',                'Vriezer',               'Congélateur',             3,  41),
('dishwasher',          'kitchen_dining', 'Dishwasher',             'Vaatwasser',            'Lave-vaisselle',          4,  42),
('cooking_basics',      'kitchen_dining', 'Cooking basics: pots, pans, oil, salt and pepper', 'Kookbasics: potten, pannen, olie, zout en peper', 'Bases cuisine : casseroles, huile, sel et poivre', 5, 43),
('dishes_silverware',   'kitchen_dining', 'Dishes and silverware: bowls, plates, cups, etc.', 'Servies en bestek: kommen, borden, kopjes, etc.', 'Vaisselle et couverts : bols, assiettes, tasses, etc.', 6, 44),
('oven',                'kitchen_dining', 'Oven',                   'Oven',                  'Four',                    7,  45),
('kettle',              'kitchen_dining', 'Hot water kettle',       'Waterkoker',            'Bouilloire',              8,  46),
('coffee_maker',        'kitchen_dining', 'Coffee maker (french press, Nespresso)', 'Koffiezetapparaat (cafetière, Nespresso)', 'Machine à café (cafetière, Nespresso)', 9, 47),
('toaster',             'kitchen_dining', 'Toaster',                'Broodrooster',          'Grille-pain',             10, 48),
('baking_sheet',        'kitchen_dining', 'Baking sheet',           'Bakplaat',              'Plaque de cuisson',       11, 49),
('dining_table',        'kitchen_dining', 'Dining table',           'Eettafel',              'Table à manger',          12, 50),

-- Service
('lockbox',             'service', 'Lockbox',            'Sleutelkluis',       'Boîte à clé',              1, 51),

-- Exterior
('bbq',                 'exterior', 'BBQ',                'BBQ',                'Barbecue',                 1,  5),
('private_parking',     'exterior', 'Private parking',    'Privéparkeerplek',   'Parking privé',            2,  9),
('ev_charger',          'exterior', 'EV charger',         'EV-lader',           'Borne de recharge',        3,  52),
('private_garden',      'exterior', 'Private garden',     'Privétuin',          'Jardin privé',             4,  10),
('private_pool',        'exterior', 'Private pool',       'Privézwembad',       'Piscine privée',           5,  1),
('outdoor_jacuzzi',     'exterior', 'Outside jacuzzi',    'Buiten jacuzzi',     'Jacuzzi extérieur',        6,  53),
('gym_outdoor',         'exterior', 'Gym (outdoor)',      'Fitnessruimte (buiten)', 'Salle de sport (extérieure)', 7, 54),
('sun_loungers',        'exterior', 'Sun loungers',       'Ligstoelen',         'Chaises longues',          8,  55),
('outdoor_dining',      'exterior', 'Outdoor dining area','Eetruimte buiten',   'Espace repas extérieur',   9,  56);
