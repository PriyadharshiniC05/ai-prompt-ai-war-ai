// 100 distinct Round-1 problem statements (each with its own scenario) across 15 website types.
// Participant N gets PROBLEMS[(N-1) % 100], so 100 participants never share a problem or scenario.
// Each entry: [title, what the site is for, who it helps / goal, feature A, feature B]
const TYPES = [
  { type: 'FOOD & DRINK', common: ['Menu/product cards with prices', 'Contact or order form'], items: [
    ['MODERN BAKERY', 'a modern neighbourhood bakery', 'customers discover fresh products and contact the bakery', 'Daily specials strip', 'Opening hours and map section'],
    ['COFFEE ROASTERY', 'a premium coffee roastery', 'visitors explore its story, beans and ways to get in touch', 'Roast-level guide', 'Featured roast call-to-action'],
    ['LOCAL RESTAURANT', 'a family restaurant', 'diners explore the menu and book a table', 'Reservation form', 'Chef specials section'],
    ['JUICE BAR', 'a cold-pressed juice bar', 'health-conscious customers pick drinks and subscribe to weekly boxes', 'Ingredient badges', 'Subscription plans'],
    ['ICE CREAM PARLOUR', 'a colourful ice cream parlour', 'families browse flavours and plan party orders', 'Flavour of the month', 'Party booking form'],
    ['TEA BOUTIQUE', 'a boutique loose-leaf tea shop', 'tea lovers discover blends and brewing tips', 'Brewing guide', 'Gift box section'],
    ['STREET FOOD TRUCK', 'a street food truck', 'hungry people find the menu, today\'s location and catering options', 'Today\'s location banner', 'Catering enquiry form'],
  ]},
  { type: 'HEALTH & FITNESS', common: ['Schedule or services cards', 'Signup or appointment form'], items: [
    ['FITNESS STUDIO', 'a boutique fitness studio', 'visitors explore classes, trainers and memberships', 'Trainer profiles', 'Membership plans'],
    ['YOGA RETREAT', 'a weekend yoga retreat', 'guests learn about programmes and reserve a place', 'Daily retreat itinerary', 'Guest testimonials'],
    ['DENTAL CLINIC', 'a friendly dental clinic', 'patients understand treatments and request appointments', 'Treatment FAQ accordion', 'Doctor team section'],
    ['NUTRITION COACH', 'an online nutrition coach', 'clients see programmes and book a free consultation', 'Before/after success stories', 'Meal plan samples'],
    ['PHYSIOTHERAPY CLINIC', 'a physiotherapy and recovery clinic', 'patients find the right therapy and book sessions', 'Conditions treated list', 'Recovery tips section'],
    ['SWIMMING ACADEMY', 'a swimming academy for kids and adults', 'families compare courses and enrol', 'Level-wise course cards', 'Coach introduction'],
    ['MEDITATION APP', 'a meditation mobile app', 'visitors understand the app and join the waitlist', 'Feature tour', 'Waitlist signup with validation'],
  ]},
  { type: 'TRAVEL & OUTDOORS', common: ['Destination or package cards', 'Enquiry or booking form'], items: [
    ['TRAVEL ESCAPE', 'a modern travel agency', 'users discover destinations and plan their next trip', 'Travel highlights', 'Trip planning call-to-action'],
    ['MOUNTAIN TREK COMPANY', 'a mountain trekking company', 'adventurers choose treks by difficulty and book a guide', 'Difficulty filter', 'Packing checklist'],
    ['BEACH RESORT', 'a seaside beach resort', 'guests explore rooms and amenities and request a stay', 'Room types', 'Amenities grid'],
    ['HERITAGE CITY TOURS', 'a heritage walking tour operator', 'tourists pick tours and learn about the city\'s history', 'Tour timeline', 'Guide profiles'],
    ['BACKPACKER HOSTEL', 'a lively backpacker hostel', 'young travellers compare beds and book quickly', 'Dorm vs private comparison', 'Local tips section'],
    ['WILDLIFE SAFARI', 'a wildlife safari lodge', 'visitors see animals, seasons and safari packages', 'Best-season calendar', 'Animal spotting gallery'],
    ['CAMPING GEAR RENTAL', 'a camping gear rental shop', 'campers choose gear bundles and reserve dates', 'Gear bundles', 'Rental date form'],
  ]},
  { type: 'CREATIVE & MEDIA', common: ['Work or gallery grid', 'Contact form'], items: [
    ['CREATIVE PORTFOLIO', 'a creative designer\'s portfolio', 'clients see work, skills and contact information', 'Skills section', 'Project call-to-action'],
    ['PHOTOGRAPHER PORTFOLIO', 'a professional photographer', 'clients browse galleries and book shoots', 'Category filter for photos', 'Pricing packages'],
    ['INDIE MUSIC BAND', 'an indie music band', 'fans hear about albums and find tour dates', 'Tour dates list', 'Album release section'],
    ['INDIE GAME STUDIO', 'an indie game studio', 'players discover its games and follow development', 'Game showcase cards', 'Dev blog teasers'],
    ['WEDDING PLANNER', 'a boutique wedding planner', 'couples explore services and request a consultation', 'Service packages', 'Real wedding stories'],
    ['FASHION LABEL', 'an emerging fashion label', 'shoppers view collections and join the mailing list', 'Lookbook section', 'Newsletter signup'],
    ['PODCAST SHOW', 'a weekly podcast', 'listeners browse episodes and subscribe', 'Episode list with search', 'Host bios'],
  ]},
  { type: 'RETAIL & SHOPPING', common: ['Product cards with prices', 'Featured collection'], items: [
    ['BOOK STORE', 'a friendly online bookstore', 'readers discover books and learn about the store', 'Category tabs', 'Newsletter form'],
    ['PLANT SHOP', 'a clean plant shop', 'customers browse plants and learn basic care', 'Care tips section', 'Contact form'],
    ['SNEAKER STORE', 'a streetwear sneaker store', 'fans browse drops and filter by brand and size', 'Brand filter', 'Upcoming drops countdown'],
    ['HANDMADE JEWELLERY', 'a handmade jewellery brand', 'shoppers explore collections and the maker\'s story', 'Maker story section', 'Custom order form'],
    ['FURNITURE SHOWROOM', 'a modern furniture showroom', 'home owners browse rooms and request a visit', 'Room-wise collections', 'Visit booking form'],
    ['TOY STORE', 'a playful toy store', 'parents find toys by age group', 'Age-group filter', 'Gift guide'],
    ['MOBILE ACCESSORIES', 'a mobile accessories shop', 'buyers compare cases, chargers and earphones', 'Compare-products table', 'Offer banner'],
  ]},
  { type: 'EDUCATION', common: ['Course or programme cards', 'Enrol or enquiry form'], items: [
    ['CODING BOOTCAMP', 'a beginner coding bootcamp', 'learners see the curriculum and apply', 'Week-by-week curriculum', 'Alumni outcomes'],
    ['LANGUAGE SCHOOL', 'a language school', 'students compare languages and levels and book a trial class', 'Language selector', 'Trial class booking'],
    ['KIDS ART CLASSES', 'a kids\' art studio', 'parents explore classes and see student artwork', 'Student gallery', 'Class schedule table'],
    ['ONLINE TUTORING', 'an online tutoring platform', 'students find tutors by subject', 'Subject filter', 'Tutor profile cards'],
    ['COLLEGE DEPARTMENT', 'a college engineering department', 'prospective students learn about labs, faculty and placements', 'Faculty section', 'Placement highlights'],
    ['COMMUNITY LIBRARY', 'a community library', 'members search the catalogue highlights and join events', 'Book search box', 'Events calendar'],
    ['MUSIC ACADEMY', 'a music academy', 'learners choose instruments and book a demo lesson', 'Instrument cards', 'Demo lesson form'],
  ]},
  { type: 'TECH & STARTUPS', common: ['Feature grid', 'Pricing or plans section'], items: [
    ['PROJECT MANAGEMENT APP', 'a project management SaaS', 'teams understand the product and start a free trial', 'Product screenshot mock', 'Free trial signup'],
    ['FITNESS TRACKER APP', 'a fitness tracking app', 'users see features and download the app', 'Stats dashboard mock', 'Download buttons'],
    ['CYBERSECURITY FIRM', 'a cybersecurity consultancy', 'businesses learn about services and request an audit', 'Threat awareness tips', 'Audit request form'],
    ['AI CHATBOT STARTUP', 'an AI chatbot startup', 'companies see use cases and try a demo', 'Interactive demo chat box', 'Use-case tabs'],
    ['BUDGETING APP', 'a personal budgeting app', 'people learn how it works and sign up', 'Savings calculator', 'How-it-works steps'],
    ['CLOUD HOSTING', 'a cloud hosting provider', 'developers compare plans and sign up', 'Plan comparison toggle', 'Uptime stats'],
    ['DRONE COMPANY', 'a drone services company', 'clients explore services like mapping and photography and request a quote', 'Service use-cases', 'Quote request form'],
  ]},
  { type: 'COMMUNITY & NON-PROFIT', common: ['Mission section', 'Get-involved form'], items: [
    ['ANIMAL SHELTER', 'an animal shelter', 'visitors meet adoptable pets and volunteer', 'Adoptable pet cards', 'Adoption steps'],
    ['FOOD BANK', 'a community food bank', 'donors and volunteers find ways to help', 'Donation amount selector', 'Impact counters'],
    ['TREE PLANTING NGO', 'a tree-planting NGO', 'supporters learn the impact and sponsor a tree', 'Trees planted counter', 'Sponsor a tree form'],
    ['BLOOD DONATION DRIVE', 'a blood donation campaign', 'donors check eligibility and register for a drive', 'Eligibility checklist', 'Drive schedule'],
    ['COLLEGE TECH CLUB', 'a college technical club', 'students see events, projects and join the club', 'Events timeline', 'Member projects'],
    ['CHARITY RUN', 'a city charity run', 'runners register and learn about the cause', 'Race categories', 'Registration form'],
    ['NEIGHBOURHOOD ASSOCIATION', 'a residents\' association', 'residents read notices and report issues', 'Notice board', 'Issue reporting form'],
  ]},
  { type: 'EVENTS', common: ['Schedule or agenda', 'Register or enquiry form'], items: [
    ['TECH SYMPOSIUM', 'a technical symposium', 'students explore events and register', 'Event categories', 'Countdown timer'],
    ['MUSIC FESTIVAL', 'a two-day music festival', 'fans see the line-up and buy passes', 'Line-up by day', 'Ticket tiers'],
    ['EVENT SPACE', 'a modern event venue', 'planners see the space and packages and send an enquiry', 'Package cards', 'Venue gallery'],
    ['HACKATHON', 'a 24-hour hackathon', 'developers learn the tracks and form teams', 'Tracks and prizes', 'Team registration'],
    ['STARTUP PITCH NIGHT', 'a startup pitch night', 'founders and investors see speakers and apply', 'Speaker cards', 'Pitch application form'],
    ['FOOD FESTIVAL', 'a street food festival', 'visitors preview stalls and plan their visit', 'Stall directory with filter', 'Visitor info'],
    ['FILM FESTIVAL', 'a short film festival', 'filmmakers submit entries and audiences see screenings', 'Screening schedule', 'Submission form'],
  ]},
  { type: 'LOCAL SERVICES', common: ['Service cards', 'Booking or quote form'], items: [
    ['PET CARE', 'a trustworthy pet care centre', 'pet owners understand services and request an appointment', 'Care information', 'Appointment call-to-action'],
    ['CAR WASH & DETAILING', 'a car detailing studio', 'drivers compare packages and book a slot', 'Package comparison', 'Before/after slider'],
    ['HOME CLEANING', 'a home cleaning service', 'households pick a plan and request a visit', 'Price estimator', 'Customer reviews'],
    ['REAL ESTATE AGENCY', 'a real estate agency', 'buyers browse listings and contact an agent', 'Listing filter', 'Agent profiles'],
    ['LAW FIRM', 'a small law firm', 'clients understand practice areas and book a consultation', 'Practice areas', 'Consultation form'],
    ['BIKE REPAIR SHOP', 'a bicycle repair shop', 'cyclists see repair prices and book service', 'Repair price list', 'Service tracker mock'],
    ['HAIR & BEAUTY SALON', 'a hair and beauty salon', 'clients explore services and book an appointment', 'Stylist cards', 'Service price menu'],
  ]},
  { type: 'SPORTS & RECREATION', common: ['Programme or class cards', 'Join or booking form'], items: [
    ['CRICKET ACADEMY', 'a junior cricket academy', 'parents compare batches and book a trial session', 'Coach profiles', 'Batch timetable'],
    ['BADMINTON CLUB', 'an indoor badminton club', 'players reserve courts and join tournaments', 'Court availability grid', 'Tournament sign-up'],
    ['ESPORTS ARENA', 'a local esports gaming arena', 'gamers book stations and enter weekend tournaments', 'Tournament bracket preview', 'Hourly price table'],
    ['CYCLING CLUB', 'a weekend cycling club', 'riders discover routes and join group rides', 'Route difficulty filter', 'Ride calendar'],
    ['SKATE PARK', 'a community skate park', 'skaters learn about sessions, lessons and safety rules', 'Lesson levels', 'Safety rules accordion'],
    ['MARTIAL ARTS DOJO', 'a martial arts dojo', 'beginners explore disciplines and book a free class', 'Belt progression guide', 'Instructor bios'],
  ]},
  { type: 'FINANCE & BUSINESS', common: ['Service or plan cards', 'Consultation form'], items: [
    ['ACCOUNTING FIRM', 'a small accounting firm', 'owners understand services and request a consultation', 'Tax deadline reminders', 'Fee packages'],
    ['INSURANCE ADVISOR', 'an independent insurance advisor', 'families compare cover types and request a quote', 'Cover comparison table', 'Premium estimator'],
    ['STARTUP INCUBATOR', 'a startup incubator', 'founders learn about the programme and apply', 'Programme timeline', 'Portfolio startups'],
    ['MICRO LOAN BANK', 'a community micro-loan bank', 'small traders check eligibility and apply', 'Loan calculator', 'Eligibility checklist'],
    ['CO-WORKING SPACE', 'a co-working space', 'freelancers compare desks and book a tour', 'Desk plan toggle', 'Amenities grid'],
    ['MARKETING AGENCY', 'a digital marketing agency', 'brands see services and case studies and get in touch', 'Case study cards', 'Results counters'],
  ]},
  { type: 'TRANSPORT & AUTOMOTIVE', common: ['Vehicle or service cards', 'Booking or enquiry form'], items: [
    ['EV CHARGING NETWORK', 'an electric vehicle charging network', 'drivers find charger types and plans', 'Charger type guide', 'Pricing per kWh table'],
    ['BIKE RENTAL', 'a city bike rental service', 'tourists compare bikes and reserve one', 'Bike type filter', 'Rental duration selector'],
    ['DRIVING SCHOOL', 'a driving school', 'learners compare courses and book lessons', 'Course levels', 'Instructor profiles'],
    ['USED CAR DEALER', 'a used car dealership', 'buyers browse cars and book a test drive', 'Price range filter', 'Test drive booking'],
    ['AIRPORT SHUTTLE', 'an airport shuttle service', 'travellers check routes and pre-book a ride', 'Route and fare finder', 'Pickup instructions'],
    ['TRUCK LOGISTICS', 'a regional logistics company', 'businesses understand services and request a freight quote', 'Service coverage areas', 'Shipment tracking mock'],
  ]},
  { type: 'HOME & LIFESTYLE', common: ['Service or product cards', 'Enquiry or booking form'], items: [
    ['INTERIOR DESIGNER', 'an interior design studio', 'home owners view styles and book a design consultation', 'Style gallery with filter', 'Design process steps'],
    ['SOLAR INSTALLER', 'a rooftop solar installer', 'households learn savings and request a site visit', 'Savings calculator', 'Installation steps'],
    ['GARDEN LANDSCAPING', 'a garden landscaping company', 'owners explore projects and request a quote', 'Project gallery', 'Seasonal care tips'],
    ['HOME RENOVATION', 'a home renovation contractor', 'families see services and request an estimate', 'Before/after showcase', 'Budget range selector'],
    ['SMART HOME STORE', 'a smart home devices store', 'buyers compare gadgets and book an installation', 'Device compare table', 'Installation booking'],
    ['LAUNDRY SERVICE', 'a pickup-and-delivery laundry service', 'busy people choose a plan and schedule a pickup', 'Price list', 'Pickup scheduler'],
  ]},
  { type: 'ARTS & CULTURE', common: ['Exhibit or programme cards', 'Visit or ticket form'], items: [
    ['ART GALLERY', 'a contemporary art gallery', 'visitors browse exhibitions and plan a visit', 'Current exhibitions', 'Artist spotlight'],
    ['MUSEUM OF SCIENCE', 'a science museum', 'families explore exhibits and book tickets', 'Interactive exhibit guide', 'Ticket tiers'],
    ['THEATRE COMPANY', 'a local theatre company', 'audiences see upcoming plays and reserve seats', 'Show schedule', 'Cast profiles'],
    ['DANCE ACADEMY', 'a classical and contemporary dance academy', 'students compare styles and enrol', 'Dance style cards', 'Annual recital section'],
    ['POTTERY STUDIO', 'a pottery workshop studio', 'beginners book workshops and buy handmade pieces', 'Workshop calendar', 'Shop highlights'],
    ['HERITAGE FOUNDATION', 'a heritage conservation foundation', 'supporters learn about restoration projects and donate', 'Restoration timeline', 'Donation tiers'],
  ]},
];

// A different scenario for every participant: 100 distinct cities x rotating audience / personality / challenge.
const CITIES = ['Chennai','Coimbatore','Madurai','Trichy','Salem','Tirunelveli','Erode','Vellore','Thanjavur','Pondicherry','Bengaluru','Mysuru','Mangaluru','Hyderabad','Vijayawada','Kochi','Thiruvananthapuram','Kozhikode','Mumbai','Pune','Nagpur','Goa','Ahmedabad','Surat','Jaipur','Udaipur','Delhi','Chandigarh','Lucknow','Varanasi','Kolkata','Bhubaneswar','Guwahati','Darjeeling','Shimla','Dehradun','Indore','Bhopal','Raipur','Ranchi','Singapore','Kuala Lumpur','Bangkok','Jakarta','Hanoi','Manila','Colombo','Kathmandu','Dhaka','Male','Dubai','Doha','Muscat','Riyadh','Istanbul','Cairo','Nairobi','Cape Town','Lagos','Accra','London','Manchester','Edinburgh','Dublin','Paris','Lyon','Berlin','Munich','Amsterdam','Brussels','Zurich','Vienna','Prague','Warsaw','Madrid','Barcelona','Lisbon','Rome','Milan','Athens','Stockholm','Oslo','Copenhagen','Helsinki','Toronto','Vancouver','New York','Austin','Seattle','Chicago','Mexico City','Bogota','Lima','Buenos Aires','Sao Paulo','Sydney','Melbourne','Auckland','Tokyo','Osaka','Seoul','Taipei'];
const TONES = ['warm and friendly','bold and energetic','calm and minimal','premium and elegant','playful and colourful','trustworthy and professional','youthful and trendy','natural and earthy','modern and techy','cosy and traditional'];
const AUDIENCES = ['first-time visitors browsing on mobile phones','busy professionals who skim quickly','families planning together','students on a tight budget','senior citizens who need large, clear text','tourists new to the area','returning loyal customers','people comparing several options before deciding'];
const CHALLENGES = ['a clear call-to-action visible without scrolling','trust built through reviews, numbers or credentials','an effortless contact or booking journey','a memorable brand identity that stands apart from competitors','fast scanning with strong visual hierarchy','a welcoming first impression for new customers','a seasonal offer or announcement near the top','easy comparison between choices'];

const PROBLEMS = [];
for (const t of TYPES) for (const [title, what, goal, fa, fb] of t.items) {
  const n = PROBLEMS.length;
  const scenario = `Scenario: the business is based in ${CITIES[n % CITIES.length]}, its brand feels ${TONES[(n * 3 + 1) % TONES.length]}, its main visitors are ${AUDIENCES[(n * 5 + 2) % AUDIENCES.length]}, and the site must deliver ${CHALLENGES[(n * 7 + 3) % CHALLENGES.length]}.`;
  PROBLEMS.push({
    type: t.type,
    title,
    scenario,
    problem: `Build a polished, responsive website for ${what} that helps ${goal}.`,   // Round 1 = problem statement + features only (the scenario is revealed from Round 2)
    features: ['Responsive navigation', 'Hero section', ...t.common, fa, fb],
  });
}
const { SCENARIOS } = require('./scenarios');
if (PROBLEMS.length < 100) throw new Error('Need at least 100 problems');
PROBLEMS.forEach((p, i) => { p.scenario = SCENARIOS[i % SCENARIOS.length].text; });
module.exports = { PROBLEMS };
