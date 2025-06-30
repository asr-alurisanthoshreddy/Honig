const fs = require('fs');
const csv = require('csv-parse');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function importResponses() {
  const records = [];
  
  // Read and parse CSV
  const parser = fs
    .createReadStream('common_responses_sample_1000.csv')
    .pipe(csv.parse({
      columns: true,
      skip_empty_lines: true
    }));

  for await (const record of parser) {
    // Parse trigger_words from string to array
    const triggerWords = JSON.parse(record.trigger_words.replace(/'/g, '"'));
    
    records.push({
      trigger_type: record.trigger_type,
      trigger_words: triggerWords,
      response_text: record.response_text
    });
  }

  // Insert records in batches of 50
  const batchSize = 50;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase
      .from('responses')
      .insert(batch);

    if (error) {
      console.error('Error inserting batch:', error);
      continue;
    }
    
    console.log(`Inserted batch ${i/batchSize + 1} of ${Math.ceil(records.length/batchSize)}`);
  }

  console.log('Import completed!');
}

importResponses().catch(console.error);