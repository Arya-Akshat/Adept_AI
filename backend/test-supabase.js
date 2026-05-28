const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testUpload() {
  const fileBuffer = Buffer.from('hello world');
  console.log('Uploading to bucket: adept-files');
  const { data, error } = await supabase.storage
    .from('adept-files')
    .upload('test.txt', fileBuffer, {
      contentType: 'text/plain',
      upsert: true,
    });

  if (error) {
    console.error('Upload failed!', error);
  } else {
    console.log('Upload success!', data);
  }
}

testUpload();
