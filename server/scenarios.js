// 100 unique business scenarios (brand + city + audience + tone). Participant N always gets scenario N, so no two
// participants share a scenario. Uniqueness is guaranteed by (first word, second word) pairs and verified at start-up.
const A = ['Golden','Maple','Silver','Crimson','Willow','Harbor','Sunrise','Velvet','Cedar','Coral','Amber','Juniper','Lotus','Summit','Meadow','Indigo','Saffron','Aurora','Pebble','Falcon'];
const B = ['Hearth','Studio','& Co.','House','Collective','Works','Corner','Lane','Atelier','Point'];
const CITIES = ['Singapore','Chennai','Bengaluru','Mumbai','Delhi','Kochi','Hyderabad','Pune','Kolkata','Colombo','Kuala Lumpur','Dubai','London','Toronto','Sydney','Auckland','Nairobi','Cape Town','Lisbon','Berlin','Tokyo','Seoul','Bangkok','Manila','Doha'];
const AUDIENCES = ['busy young professionals','college students','young families','retired seniors','tourists','local neighbourhood residents','remote workers','health-conscious adults','teenagers','first-time customers','corporate teams','couples','small business owners','weekend explorers','beginners','enthusiasts and collectors','parents with school-age children','night-shift workers','visitors planning ahead','loyal regular customers'];
const TONES = ['warm and friendly','premium and elegant','playful and energetic','calm and trustworthy','bold and modern','cosy and handcrafted','clean and minimal','vibrant and youthful','professional and reassuring','adventurous and inspiring'];

const SCENARIOS = Array.from({ length: 100 }, (_, i) => {
  const brand = `${A[i % 20]} ${B[(i * 7 + Math.floor(i / 20)) % 10]}`;
  const city = CITIES[i % 25], audience = AUDIENCES[(i * 7 + 3) % 20], tone = TONES[(i * 3 + 1) % 10];
  return { brand, city, audience, tone, text: `Scenario: The business is "${brand}" in ${city}, serving ${audience}, with a ${tone} brand personality.` };
});
if (new Set(SCENARIOS.map(s => s.brand)).size !== SCENARIOS.length) throw new Error('Scenario brands must be unique');
module.exports = { SCENARIOS };
