/* ==========================================================================
   CHARLIE'S CHAIRS | data.js : website settings
   --------------------------------------------------------------------------
   1. CONNECTION: paste the two values from Supabase > Project Settings > API Keys.
      The publishable key is public by design. NEVER paste the secret /
      service_role key anywhere in this website.
   2. Everything else (inventory, fabrics, projects, videos, FAQs, hours,
      YouTube channel, policies) is managed in the Admin page: admin.html.
   3. The contact details below are only a fallback shown until the site is
      connected. Once connected, the Admin page Settings are used instead.
   Keep text inside "double quotes"; every list item ends with a comma except
   the last one.
   ========================================================================== */
window.CC = {
  supabaseUrl: "",
  supabaseKey: "",

  // Fallback contact details, as printed on Charles's business card.
  fallback: {
    business_name: "Charlie’s Chairs",
    owner_name: "Charles Parks",
    phone: "616-655-5225",
    email: "parkscharles838@gmail.com",
    address_line: "436 Northpark NE",
    city_state_zip: "Grand Rapids, MI 49525",
    address_confirmed: false,
    hours: "",
    service_area: "",
    youtube_channel_url: ""
  },

  // Choices on the quote form (edit freely).
  projectTypes: ["Reupholstery", "Restoration", "Custom build", "Fabric inquiry", "Other"],
  furnitureTypes: ["Chair", "Sofa", "Loveseat", "Sectional", "Ottoman", "Dining set", "Headboard", "Bench", "Commercial seating", "Other"],
  budgetRanges: ["Not sure yet", "Under $500", "$500 – $1,000", "$1,000 – $2,500", "$2,500 – $5,000", "$5,000+"],

  developerCredit: "Website by SAP Development Solutions, LLC"
};
