const fs = require('fs');

const listings = JSON.parse(fs.readFileSync('listings.json', 'utf8'));
const rentals = JSON.parse(fs.readFileSync('rentals.json', 'utf8'));
const projects = JSON.parse(fs.readFileSync('projects.json', 'utf8'));

console.log("--- FINAL PART 2 ANSWERS ---");

// 1. Total listing records
console.log(`1. total_listing_records: ${listings.length}`);

// 2. Unique properties (GPS Grouping)
const uniqueProps = new Set();
listings.forEach(l => uniqueProps.add(`${l.latitude}_${l.longitude}`));
console.log(`2. unique_properties: ${uniqueProps.size}`);

// 3. Active listings
console.log(`3. active_listings: ${listings.filter(l => l.is_live === true).length}`);

// 4. Corrupt listings (Units lie: Area is in Sq Meters, making SqFt impossibly small)
const corruptIds = [];
listings.forEach(l => {
  if (l.carpet_area < 150) corruptIds.push(l.listing_id);
});
const uniqueCorruptIds = [...new Set(corruptIds)].sort();
console.log(`4. corrupt_listing_ids (${uniqueCorruptIds.length} found):`, uniqueCorruptIds);

// 5. Total monthly rent in Sector 49
const rentSum = rentals
  .filter(r => r.locality === 'sector 49')
  .reduce((sum, r) => sum + r.price, 0);
console.log(`5. total_monthly_rent: ${rentSum}`);

// 7. Costliest project (Units lie: Price is in Crores, not Rupees)
let costliestProject = { project_id: "", price_max_inr: 0 };
projects.forEach(p => {
  const maxInr = Math.round(p.price_max * 10000000); 
  if (maxInr > costliestProject.price_max_inr) {
    costliestProject = { project_id: p.project_id, price_max_inr: maxInr };
  }
});
console.log(`7. costliest_project:`, costliestProject);

// 8. Listings posted in the last 7 days (Timestamp lie: Missing Z, actual is IST)
const refEnd = new Date('2026-09-10T00:00:00+05:30');
const refStart = new Date('2026-09-03T00:00:00+05:30');
let last7DaysCount = 0;
listings.forEach(l => {
  const postDate = new Date(l.posted_at + '+05:30'); 
  if (postDate >= refStart && postDate < refEnd) last7DaysCount++;
});
console.log(`8. listings_last_7_days: ${last7DaysCount}`);

// 9. Fake listings (Fraud lie: Brokers posing as owners)
const fakeIds = [];
const ownerCounts = {};
listings.forEach(l => {
  if (l.posted_by === 'owner') {
    ownerCounts[l.posted_by_contact] = (ownerCounts[l.posted_by_contact] || 0) + 1;
  }
});
listings.forEach(l => {
  if (l.posted_by === 'owner' && ownerCounts[l.posted_by_contact] > 3) {
    fakeIds.push(l.listing_id);
  }
});
const uniqueFakeIds = [...new Set(fakeIds)].sort();
console.log(`9. fake_listing_ids (${uniqueFakeIds.length} found)`);

// 10. Projects with wrong listing count (Consistency lie)
let wrongCountProjects = 0;
projects.forEach(project => {
  const actualCount = listings.filter(l => l.project_id === project.project_id).length;
  if (actualCount !== project.total_listings) wrongCountProjects++;
});
console.log(`10. projects_with_wrong_listing_count: ${wrongCountProjects}`);

// 6. Avg price per sqft for 2BHK (Must exclude corrupt and fake IDs!)
const valid2Bhks = listings.filter(l => 
  l.is_live === true && 
  l.bedroom === 2 && 
  !uniqueCorruptIds.includes(l.listing_id) && 
  !uniqueFakeIds.includes(l.listing_id)
);
let sumPricePerSqft = 0;
valid2Bhks.forEach(l => sumPricePerSqft += (l.price / l.carpet_area));
const avgPricePerSqft2Bhk = (sumPricePerSqft / valid2Bhks.length).toFixed(2);
console.log(`6. avg_price_per_sqft_2bhk: ${parseFloat(avgPricePerSqft2Bhk)}`);