// Categories of messages to show while processing
export const waitingMessages = {
  philosophical: [
    "If a duplicate record exists in a database but no one finds it, does it really exist?",
    "What makes two records truly identical?",
    "Is perfect data quality achievable, or is it an endless journey?",
    "How much of our digital footprint is actually duplicate information?",
    "In a world of infinite data, what defines uniqueness?",
    "If we deduplicate everything perfectly, what stories might we lose?",
    "Does standardizing data make us lose valuable cultural nuances?",
    "Is automation making us more or less connected to our data?",
    "When does data cleaning become data oversimplification?",
    "Are we organizing data, or is data organizing us?"
  ],
  techTrivia: [
    "Did you know? The first computer bug was an actual bug - a moth found in the Harvard Mark II computer in 1947.",
    "The average business database contains up to 32% duplicate records.",
    "Companies lose an average of 12% in revenue due to poor data quality.",
    "The term 'database' was first used in the 1960s.",
    "Over 90% of all data was created in the last two years.",
    "A single duplicate record can cost an organization up to $100 to maintain annually.",
    "The world's largest database contains over 1 petabyte of data.",
    "The first hard drive (IBM 350) could store just 3.75 MB.",
    "Data deduplication can reduce storage needs by up to 95%.",
    "The term 'Big Data' was first used in 1997."
  ],
  dataManagementTips: [
    "Regular data cleaning can improve system performance by up to 30%.",
    "Consider using fuzzy matching for more effective deduplication.",
    "Standardize your data entry processes to prevent future duplicates.",
    "Back up your data before any major cleaning operation.",
    "Use unique identifiers whenever possible in your records.",
    "Regular data audits can prevent costly errors.",
    "Document your data cleaning processes for consistency.",
    "Train your team on data entry best practices.",
    "Set up automated validation rules for data entry.",
    "Maintain a data quality scorecard for your organization."
  ],
  waitingHumor: [
    "Counting duplicate records... and questioning life choices.",
    "Teaching our AI to spot twins in your data...",
    "Performing digital magic (aka advanced algorithms)...",
    "Making your data lean and mean...",
    "Hunting down sneaky duplicates...",
    "Playing 'Spot the Difference' with your records...",
    "Untangling your data spaghetti...",
    "Giving your data a spring cleaning...",
    "Teaching records to share and play nice...",
    "Conducting a data family reunion..."
  ],
  inspiration: [
    "Clean data is the foundation of good decisions.",
    "Every duplicate found is a step toward perfection.",
    "Quality over quantity, especially in data.",
    "Small improvements lead to big impacts.",
    "Patience with data pays dividends.",
    "Excellence is in the details of your data.",
    "Good data tells better stories.",
    "Accuracy is the art of progress.",
    "In data we trust, but verify.",
    "Transform complexity into clarity."
  ],
  randomFacts: [
    "Honey never spoils. Archaeologists found 3000-year-old honey still preserved.",
    "A day on Venus is longer than its year.",
    "The average person spends 6 months of their lifetime waiting for red lights.",
    "Bananas are berries, but strawberries aren't.",
    "The first oranges weren't orange.",
    "Cows have best friends and get stressed when separated.",
    "The shortest war in history lasted 38 minutes.",
    "A cloud can weigh more than a million pounds.",
    "Octopuses have three hearts.",
    "Space smells like seared steak."
  ],
  declutteringBenefits: [
    "Clean data can reduce storage costs by up to 40%.",
    "Removing duplicates improves search accuracy by 25%.",
    "Better data quality leads to better business insights.",
    "Clean databases respond up to 50% faster.",
    "Decluttered data means fewer customer communication errors.",
    "Organized data reduces employee frustration.",
    "Clean data improves customer satisfaction rates.",
    "Efficient data means faster decision making.",
    "Reduced redundancy means reduced maintenance costs.",
    "Clean data improves regulatory compliance."
  ]
};

// Get a random message from a specific category
export const getRandomMessage = (category: keyof typeof waitingMessages): string => {
  const messages = waitingMessages[category];
  return messages[Math.floor(Math.random() * messages.length)];
};

// Get a random category
export const getRandomCategory = (): keyof typeof waitingMessages => {
  const categories = Object.keys(waitingMessages) as Array<keyof typeof waitingMessages>;
  return categories[Math.floor(Math.random() * categories.length)];
};

// Get a random message from any category
export const getRandomMessageFromAnyCategory = (): string => {
  const category = getRandomCategory();
  return getRandomMessage(category);
};
