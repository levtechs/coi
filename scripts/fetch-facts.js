import fs from 'fs';

async function fetchFact() {
  const response = await fetch('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en');
  const data = await response.json();
  return data.text;
}

async function main() {
  const facts = new Set();

  while (facts.size < 50) {
    try {
      const fact = await fetchFact();
      facts.add(fact);
      console.log(`Fetched ${facts.size} facts...`);
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Error fetching fact:', error);
    }
  }

  const factsArray = Array.from(facts);
  fs.writeFileSync('lib/fun-facts.json', JSON.stringify(factsArray, null, 2));
  console.log(`Saved ${factsArray.length} facts to lib/fun-facts.json`);
}

main();
