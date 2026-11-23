/* City -> state/UT lookup for the handful of places Vantage's onboarding asks
   for a state twice with nothing linking the two: profile-setup.html's free-
   text city field, and onboarding.html's (MERIDIAN) state grid, which is the
   one field every legal prompt actually reads (worker: meridian.state).
   Advisory only. An unrecognised city returns null and nothing is shown --
   this never blocks a submission, it only catches a likely mismatch.

   cityStateLookup(cityText, vocab)
     vocab omitted or 'profile'  -> returns the label as profile-setup.html's
                                    <select> spells it (govt-style full names).
     vocab === 'meridian'        -> returns the label as onboarding.html's
                                    state grid spells it (a few UTs use "&"
                                    and shorter forms there instead).
   Returns null when the city isn't in the list below. Not exhaustive --
   covers the state capitals and the Tier-1/2 business hubs an HR
   professional is plausibly based in; add to CITY_TO_STATE as gaps turn up.
   Keep this file framework-free so either page can load it with a plain
   <script src> tag. */
(function (global) {
  'use strict';

  var CITY_TO_STATE = {
    // Delhi (NCT)
    'delhi': 'Delhi (NCT)', 'new delhi': 'Delhi (NCT)',
    // Haryana (NCR + rest)
    'gurgaon': 'Haryana', 'gurugram': 'Haryana', 'faridabad': 'Haryana', 'panipat': 'Haryana',
    'karnal': 'Haryana', 'ambala': 'Haryana', 'hisar': 'Haryana', 'rohtak': 'Haryana', 'sonipat': 'Haryana',
    // Uttar Pradesh (NCR + rest)
    'noida': 'Uttar Pradesh', 'greater noida': 'Uttar Pradesh', 'ghaziabad': 'Uttar Pradesh',
    'lucknow': 'Uttar Pradesh', 'kanpur': 'Uttar Pradesh', 'agra': 'Uttar Pradesh',
    'varanasi': 'Uttar Pradesh', 'meerut': 'Uttar Pradesh', 'prayagraj': 'Uttar Pradesh',
    'allahabad': 'Uttar Pradesh', 'bareilly': 'Uttar Pradesh', 'noida extension': 'Uttar Pradesh',
    // Maharashtra
    'mumbai': 'Maharashtra', 'navi mumbai': 'Maharashtra', 'thane': 'Maharashtra', 'pune': 'Maharashtra',
    'nagpur': 'Maharashtra', 'nashik': 'Maharashtra', 'aurangabad': 'Maharashtra',
    'chhatrapati sambhajinagar': 'Maharashtra', 'kolhapur': 'Maharashtra',
    // Karnataka
    'bangalore': 'Karnataka', 'bengaluru': 'Karnataka', 'mysore': 'Karnataka', 'mysuru': 'Karnataka',
    'mangalore': 'Karnataka', 'hubli': 'Karnataka', 'belgaum': 'Karnataka',
    // Tamil Nadu
    'chennai': 'Tamil Nadu', 'coimbatore': 'Tamil Nadu', 'madurai': 'Tamil Nadu',
    'tiruchirappalli': 'Tamil Nadu', 'trichy': 'Tamil Nadu', 'salem': 'Tamil Nadu',
    // Telangana
    'hyderabad': 'Telangana', 'secunderabad': 'Telangana', 'warangal': 'Telangana',
    // Andhra Pradesh
    'visakhapatnam': 'Andhra Pradesh', 'vizag': 'Andhra Pradesh', 'vijayawada': 'Andhra Pradesh',
    'guntur': 'Andhra Pradesh', 'tirupati': 'Andhra Pradesh', 'amaravati': 'Andhra Pradesh',
    // West Bengal
    'kolkata': 'West Bengal', 'howrah': 'West Bengal', 'durgapur': 'West Bengal',
    'siliguri': 'West Bengal', 'asansol': 'West Bengal',
    // Gujarat
    'ahmedabad': 'Gujarat', 'surat': 'Gujarat', 'vadodara': 'Gujarat', 'baroda': 'Gujarat',
    'rajkot': 'Gujarat', 'gandhinagar': 'Gujarat',
    // Rajasthan
    'jaipur': 'Rajasthan', 'jodhpur': 'Rajasthan', 'udaipur': 'Rajasthan', 'kota': 'Rajasthan', 'ajmer': 'Rajasthan',
    // Madhya Pradesh
    'bhopal': 'Madhya Pradesh', 'indore': 'Madhya Pradesh', 'gwalior': 'Madhya Pradesh', 'jabalpur': 'Madhya Pradesh',
    // Bihar
    'patna': 'Bihar', 'gaya': 'Bihar', 'muzaffarpur': 'Bihar', 'bhagalpur': 'Bihar',
    // Jharkhand
    'ranchi': 'Jharkhand', 'jamshedpur': 'Jharkhand', 'dhanbad': 'Jharkhand', 'bokaro': 'Jharkhand',
    // Odisha
    'bhubaneswar': 'Odisha', 'cuttack': 'Odisha', 'rourkela': 'Odisha',
    // Kerala
    'thiruvananthapuram': 'Kerala', 'trivandrum': 'Kerala', 'kochi': 'Kerala', 'cochin': 'Kerala',
    'kozhikode': 'Kerala', 'calicut': 'Kerala', 'thrissur': 'Kerala',
    // Punjab
    'amritsar': 'Punjab', 'ludhiana': 'Punjab', 'jalandhar': 'Punjab', 'patiala': 'Punjab', 'mohali': 'Punjab',
    // Assam
    'guwahati': 'Assam', 'dibrugarh': 'Assam', 'silchar': 'Assam', 'jorhat': 'Assam',
    // Chhattisgarh
    'raipur': 'Chhattisgarh', 'bhilai': 'Chhattisgarh', 'bilaspur': 'Chhattisgarh',
    // Uttarakhand
    'dehradun': 'Uttarakhand', 'haridwar': 'Uttarakhand', 'rishikesh': 'Uttarakhand', 'haldwani': 'Uttarakhand',
    // Himachal Pradesh
    'shimla': 'Himachal Pradesh', 'manali': 'Himachal Pradesh', 'dharamshala': 'Himachal Pradesh',
    // Goa
    'panaji': 'Goa', 'panjim': 'Goa', 'margao': 'Goa', 'vasco da gama': 'Goa',
    // Jammu and Kashmir
    'srinagar': 'Jammu and Kashmir', 'jammu': 'Jammu and Kashmir',
    // Chandigarh (UT)
    'chandigarh': 'Chandigarh',
    // Puducherry (UT)
    'puducherry': 'Puducherry', 'pondicherry': 'Puducherry',
    // Assam/Meghalaya/Tripura capitals sometimes confused with each other
    'shillong': 'Meghalaya', 'agartala': 'Tripura', 'imphal': 'Manipur', 'aizawl': 'Mizoram',
    'kohima': 'Nagaland', 'itanagar': 'Arunachal Pradesh', 'gangtok': 'Sikkim',
    // Smaller UTs
    'port blair': 'Andaman and Nicobar Islands', 'kavaratti': 'Lakshadweep',
    'daman': 'Dadra and Nagar Haveli and Daman and Diu', 'silvassa': 'Dadra and Nagar Haveli and Daman and Diu',
    'leh': 'Ladakh', 'kargil': 'Ladakh'
  };

  // Only the labels that profile-setup.html and onboarding.html spell
  // differently. Everything else is identical between the two pages.
  var MERIDIAN_ALIAS = {
    'Jammu and Kashmir': 'Jammu & Kashmir',
    'Andaman and Nicobar Islands': 'Andaman & Nicobar',
    'Dadra and Nagar Haveli and Daman and Diu': 'Dadra & NH / Daman & Diu'
  };

  function norm(s) {
    return String(s || '').toLowerCase().trim().replace(/\s+/g, ' ');
  }

  function cityStateLookup(cityText, vocab) {
    var state = CITY_TO_STATE[norm(cityText)];
    if (!state) return null;
    if (vocab === 'meridian' && MERIDIAN_ALIAS[state]) return MERIDIAN_ALIAS[state];
    return state;
  }

  global.cityStateLookup = cityStateLookup;
})(window);
