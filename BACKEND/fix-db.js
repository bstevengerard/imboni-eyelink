const { MongoClient } = require('mongodb');
require('dotenv').config();

MongoClient.connect(process.env.MONGO_URI).then(async (client) => {
  const db = client.db();
  
  // Drop existing indexes
  try {
    await db.collection('users').dropIndex('pt_id_1');
    console.log('Dropped pt_id_1 index');
  } catch (e) { console.log('pt_id_1 index not found or already dropped'); }
  try {
    await db.collection('users').dropIndex('dr_id_1');
    console.log('Dropped dr_id_1 index');
  } catch (e) { console.log('dr_id_1 index not found or already dropped'); }
  
  // Set null values to undefined (which won't be indexed)
  await db.collection('users').updateMany({ dr_id: null }, { $unset: { dr_id: '' } });
  await db.collection('users').updateMany({ pt_id: null }, { $unset: { pt_id: '' } });
  console.log('Cleaned up null values');
  
  const users = await db.collection('users').find({}).toArray();
  console.log('Users after cleanup:', users.map(u => ({ email: u.email, pt_id: u.pt_id, dr_id: u.dr_id })));
  await client.close();
});